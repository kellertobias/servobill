/**
 * Classification result for receipt processing
 */
export enum ReceiptClassification {
	Structured = 'structured',
	Extraction = 'extraction',
}

/**
 * Service for classifying receipts and determining processing strategy
 * Uses LLM to analyze receipt content and determine if it's a digital invoice
 * or requires manual extraction
 */
export class ReceiptClassificationService {
	constructor() {}

	/**
	 * Classify a receipt to determine processing strategy
	 * @param event The receipt event containing attachment IDs and email data
	 * @returns Classification result with type and confidence
	 */
	public static async classifyReceipt(
		attachments: {
			content: Buffer;
			mimeType: string;
			name: string;
		}[],
	): Promise<ReceiptClassification> {
		// If no attachments, default to extraction
		if (attachments.length === 0) {
			return ReceiptClassification.Extraction;
		}

		// Check if any attachment is a structured invoice
		// For now, we'll default to extraction since structured processing is not implemented
		const isStructuredInvoice = await this.isStructuredInvoice();

		return isStructuredInvoice
			? ReceiptClassification.Structured
			: ReceiptClassification.Extraction;
	}

	/**
	 * Check if any of the downloaded attachments are structured invoices
	 * @returns True if likely a digital invoice
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private static async isStructuredInvoice(): Promise<boolean> {
		// Since we do not yet support structured invoices, we will return false
		return false;
	}
}
