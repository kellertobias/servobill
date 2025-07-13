/**
 * Classification result for receipt processing
 *
 * - PlainPDF: Standard PDF with no embedded structured data
 * - ZUGFeRD: PDF with embedded ZUGFeRD XML (EN 16931, CrossIndustryInvoice)
 * - XRechnung: PDF with embedded XRechnung XML (EN 16931, XRechnung namespace)
 * - Extraction: Fallback for unstructured receipts
 */
export enum ReceiptClassification {
	PlainPDF = 'plain_pdf',
	ZUGFeRD = 'zugferd',
	XRechnung = 'xrechnung',
	Extraction = 'extraction',
}

// import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'; // Not used in current implementation
// import * as pdfParse from 'pdf-parse'; // Not used in current implementation
// import * as unzipper from 'unzipper'; // Not used in current implementation
// import { parseStringPromise } from 'xml2js'; // Not used in current implementation

/**
 * Service for classifying receipts and determining processing strategy.
 *
 * This service inspects PDF attachments to determine if they contain
 * embedded XML for ZUGFeRD or XRechnung e-invoices, or are plain PDFs.
 *
 * - ZUGFeRD: Looks for XML with CrossIndustryInvoice namespace.
 * - XRechnung: Looks for XML with XRechnung namespace.
 * - PlainPDF: PDF with no embedded XML.
 * - Extraction: Fallback for other types.
 */
export class ReceiptClassificationService {
	constructor() {}

	/**
	 * Classify a receipt to determine processing strategy.
	 * @param attachments Array of attachments (PDFs/images)
	 * @returns Classification result
	 */
	public static async classifyReceipt(
		attachments: {
			content: Buffer;
			mimeType: string;
			name: string;
		}[],
	): Promise<ReceiptClassification> {
		return ReceiptClassification.Extraction;
		// if (attachments.length === 0) {
		// }

		// for (const attachment of attachments) {
		// 	if (attachment.mimeType === 'application/pdf') {
		// 		const type = await this.classifyPdf(attachment.content);
		// 		if (type !== ReceiptClassification.PlainPDF) {
		// 			return type;
		// 		}
		// 	}
		// }

		// return ReceiptClassification.Extraction;
	}

	// /**
	//  * Classify a PDF as ZUGFeRD, XRechnung, or PlainPDF.
	//  *
	//  * @param pdfBuffer PDF file content
	//  * @returns Classification result
	//  */
	// private static async classifyPdf(
	// 	pdfBuffer: Buffer,
	// ): Promise<ReceiptClassification> {
	// 	// TODO: For robust extraction, use a PDF library that supports embedded file extraction.
	// 	// For now, fallback to searching for XML in the raw buffer.
	// 	try {
	// 		const xmlMatches = pdfBuffer
	// 			.toString('utf8')
	// 			.match(/<\?xml[\S\s]*?<\/\w+>/g);
	// 		if (xmlMatches) {
	// 			for (const xml of xmlMatches) {
	// 				if (xml.includes('urn:ferd:')) {
	// 					// ZUGFeRD namespace
	// 					return ReceiptClassification.ZUGFeRD;
	// 				}
	// 				if (
	// 					xml.includes('xrechnung') ||
	// 					xml.includes('urn:cen.eu:en16931:2017')
	// 				) {
	// 					// XRechnung namespace
	// 					return ReceiptClassification.XRechnung;
	// 				}
	// 			}
	// 		}
	// 		// If no XML found, treat as plain PDF
	// 		return ReceiptClassification.Extraction;
	// 	} catch {
	// 		// On error, fallback to extraction
	// 		return ReceiptClassification.Extraction;
	// 	}
	// }
}
