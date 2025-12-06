import { promisify } from 'node:util';
import { inflate } from 'node:zlib';
import {
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFName,
	PDFRawStream,
	PDFRef,
} from 'pdf-lib';

const inflateAsync = promisify(inflate);

/**
 * Extracts the first embedded XML file from a PDF using pdf-lib's low-level API.
 * This function is designed to work with e-invoice PDFs that contain embedded XML files.
 *
 * The function handles:
 * - Compressed embedded files (using zlib/deflate decompression)
 * - PDFRef resolution to access embedded file objects
 * - Multiple embedded files (returns the first XML file found)
 * - Various edge cases like malformed PDFs, non-XML embedded files, etc.
 *
 * @param pdfBuffer PDF file content as Buffer
 * @returns XML string if found, undefined otherwise
 */
export const extractEmbeddedXmlWithPdfLib = async (
	pdfBuffer: Buffer,
): Promise<string | undefined> => {
	try {
		const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));

		// Navigate to the PDF catalog and look for embedded files
		const catalog = pdfDoc.catalog as PDFDict;
		const names = catalog.lookupMaybe(PDFName.of('Names'), PDFDict) as
			| PDFDict
			| undefined;

		if (!names) {
			return undefined;
		}

		const embeddedFiles = names.lookupMaybe(
			PDFName.of('EmbeddedFiles'),
			PDFDict,
		) as PDFDict | undefined;

		if (!embeddedFiles) {
			return undefined;
		}

		const namesArrayObj = embeddedFiles.lookup(PDFName.of('Names'));

		// Handle PDFArray objects by accessing the .array property
		let namesArray: unknown[];
		if (namesArrayObj instanceof PDFArray) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			namesArray = (namesArrayObj as any).array;
		} else if (Array.isArray(namesArrayObj)) {
			namesArray = namesArrayObj;
		} else {
			return undefined;
		}

		// Iterate through embedded files (every two entries: filename, file spec)
		for (let i = 0; i < namesArray.length; i += 2) {
			const fileSpecRef = namesArray[i + 1];

			// Resolve PDFRef to get the actual file specification object
			let fileSpec: PDFDict;
			if (fileSpecRef instanceof PDFRef) {
				const resolvedObj = pdfDoc.context.lookup(fileSpecRef);
				if (resolvedObj instanceof PDFDict) {
					fileSpec = resolvedObj;
				} else {
					continue;
				}
			} else if (fileSpecRef instanceof PDFDict) {
				fileSpec = fileSpecRef;
			} else {
				continue;
			}

			// Look for the embedded file stream
			const ef = fileSpec.lookupMaybe(PDFName.of('EF'), PDFDict) as
				| PDFDict
				| undefined;

			if (ef) {
				const fileStreamObj = ef.lookup(PDFName.of('F'));
				if (fileStreamObj instanceof PDFRawStream) {
					const compressedBuffer = fileStreamObj.getContents();

					try {
						// Try to decompress the buffer (PDF files typically compress embedded data)
						const decompressedBuffer = await inflateAsync(
							new Uint8Array(compressedBuffer),
						);
						const xmlString = decompressedBuffer.toString('utf8');

						// Return the first XML file found
						if (xmlString.trim().startsWith('<?xml')) {
							return xmlString;
						}
					} catch {
						// If decompression fails, try the raw buffer
						const xmlString = Buffer.from(compressedBuffer).toString('utf8');
						if (xmlString.trim().startsWith('<?xml')) {
							return xmlString;
						}
					}
				}
			}
		}
		return undefined;
	} catch (error) {
		console.error('Failed to extract embedded XML with pdf-lib', {
			error: error,
		});
		return undefined;
	}
};
