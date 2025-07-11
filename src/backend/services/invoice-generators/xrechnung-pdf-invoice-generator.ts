import { InvoiceGeneratorStrategy } from './interface';
import { PDFInvoiceGenerator } from './pdf-invoice-generator';
import { XRechnungInvoiceGenerator } from './xrechnung-invoice-generator';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';

/**
 * XRechnungPdfInvoiceGenerator generates both XRechnung XML and PDF.
 * Uses PDF strategy for PDF and @e-invoice-eu/core for XML.
 */
export class XRechnungPdfInvoiceGenerator extends InvoiceGeneratorStrategy {
	private readonly pdfStrategy: PDFInvoiceGenerator;
	private readonly xrechnungStrategy: XRechnungInvoiceGenerator;

	constructor() {
		super();
		this.pdfStrategy = new PDFInvoiceGenerator();
		this.xrechnungStrategy = new XRechnungInvoiceGenerator();
	}

	/**
	 * Generates both XRechnung XML and PDF, returns both as attachments.
	 */
	async generate(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string; mimeType: string }[]> {
		// Generate PDF
		const pdfResult = await this.pdfStrategy.generate(invoice, options);
		const xmlResult = await this.xrechnungStrategy.generate(invoice, options);

		return [...pdfResult, ...xmlResult];
	}
}
