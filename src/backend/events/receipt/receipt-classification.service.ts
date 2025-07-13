/**
 * Classification result for receipt processing
 *
 * - Structured: PDF with embedded ZUGFeRD XML or XML file
 * - Extraction: Fallback for unstructured receipts
 */
export enum ReceiptClassification {
	Structured = 'structured',
	Extraction = 'extraction',
}

/**
 * Service for classifying receipts and determining processing strategy.
 *
 * This service inspects attachments to determine if they are structured (XML or PDF with embedded XML)
 * or require extraction (unstructured PDFs/images).
 *
 * - Structured: XML file or PDF with embedded ZUGFeRD XML.
 * - Extraction: Fallback for other types.
 */
export class ReceiptClassificationService {
	constructor() {}

	/**
	 * Classify a receipt to determine processing strategy.
	 * @param attachments Array of attachments (PDFs/images/XML)
	 * @returns Classification result
	 */
	public static async classifyReceipt(
		attachments: {
			content: Buffer;
			mimeType: string;
			name: string;
		}[],
	): Promise<ReceiptClassification> {
		for (const attachment of attachments) {
			// Check for XML file by MIME type or file extension
			if (
				attachment.mimeType === 'application/xml' ||
				attachment.mimeType === 'text/xml' ||
				attachment.name.toLowerCase().endsWith('.xml')
			) {
				return ReceiptClassification.Structured;
			}
			// Check for PDF with embedded XML (ZUGFeRD)
			if (attachment.mimeType === 'application/pdf') {
				const isStructured = await this.pdfHasEmbeddedXml(attachment.content);
				if (isStructured) {
					return ReceiptClassification.Structured;
				}
			}
		}
		// Fallback: Extraction
		return ReceiptClassification.Extraction;
	}

	/**
	 * Check if a PDF buffer contains embedded XML (ZUGFeRD or similar).
	 *
	 * This is a heuristic: it searches for XML content in the PDF buffer.
	 * For robust extraction, use a PDF library that supports embedded file extraction.
	 *
	 * @param pdfBuffer PDF file content
	 * @returns true if embedded XML is found, false otherwise
	 */
	private static async pdfHasEmbeddedXml(pdfBuffer: Buffer): Promise<boolean> {
		try {
			const xmlMatches = pdfBuffer
				.toString('utf8')
				.match(/<\?xml[\S\s]*?<\/[\w:]+>/g);
			if (xmlMatches) {
				// Heuristic: any XML found in PDF is considered structured
				return true;
			}
			return false;
		} catch {
			// On error, assume not structured
			return false;
		}
	}
}
