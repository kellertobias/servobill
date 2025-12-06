// ZugferdInvoiceGenerator: Strategy for generating ZUGFeRD (PDF + XML) invoices.
import { zugferd } from 'node-zugferd';
import { BASIC, type ProfileBasic } from 'node-zugferd/profile/basic';
import type { InvoiceEntity } from '@/backend/entities/invoice.entity';
import type {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import { InvoiceGeneratorStrategy } from './interface';
import type { PDFInvoiceGenerator } from './pdf-invoice-generator';
import { mapInvoiceToProfileBasic } from './zugferd-root';

/**
 * ZugferdInvoiceGenerator generates a ZUGFeRD invoice (PDF + XML attachment).
 * Uses the PDF strategy internally and node-zugferd for XML generation.
 * The combine(pdf, xml) method is stubbed for now.
 */
export class ZugferdInvoiceGenerator extends InvoiceGeneratorStrategy {
	constructor(private readonly pdfStrategy?: PDFInvoiceGenerator) {
		super();
	}

	private async getOptionalPdf(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	) {
		if (this.pdfStrategy) {
			const pdf = await this.pdfStrategy.generate(invoice, options);
			return pdf[0].content;
		}
		return;
	}

	/**
	 * Generates a ZUGFeRD invoice: PDF and ZUGFeRD XML (BASIC profile).
	 * Returns both as separate attachments for now.
	 * Note: The invoice data must be mapped to the ProfileBasic type expected by node-zugferd.
	 */
	async generate(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string; mimeType: string }[]> {
		// Generate PDF using the PDF strategy
		const pdfBuffer = await this.getOptionalPdf(invoice, options);

		// Map InvoiceEntity to ProfileBasic (domain-specific mapping)
		const profileData: ProfileBasic = mapInvoiceToProfileBasic(
			invoice,
			options.companyData,
		);

		const invoicer = zugferd({ profile: BASIC, strict: false });
		const zugferdInvoice = invoicer.create(profileData);

		if (!pdfBuffer) {
			const data = await zugferdInvoice.toXML();
			return [
				{
					content: Buffer.from(data, 'utf8'),
					filename: 'zugferd.xml',
					mimeType: 'application/xml',
				},
			];
		}

		// Convert Node.js Buffer to Uint8Array for compatibility
		const pdfUint8 = new Uint8Array(
			pdfBuffer.buffer,
			pdfBuffer.byteOffset,
			pdfBuffer.byteLength,
		);

		// Embed ZUGFeRD XML into PDF/A-3
		const pdfAUint8 = await zugferdInvoice.embedInPdf(pdfUint8, {
			metadata: {
				title: `INVOICE_${invoice.invoiceNumber}.pdf`,
				createDate: new Date(),
				modifyDate: new Date(),
				author: options.companyData.companyData.name,
			},
		});

		// Convert Uint8Array result back to Buffer for return
		const pdfA = Buffer.from(pdfAUint8);

		// For now, return only the PDF/A-3 as attachment (extend to add XML if needed)
		return [
			{
				content: pdfA,
				filename: 'invoice.pdf',
				mimeType: 'application/pdf',
			},
		];
	}
}
