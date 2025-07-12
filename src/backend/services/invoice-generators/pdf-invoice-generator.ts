// PDFInvoiceGenerator: Strategy for generating PDF invoices only.
import { InvoiceGeneratorStrategy } from './interface';
import { StorageLoaderStrategy } from './storage';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import { CqrsBus } from '@/backend/services/cqrs.service';
import { CreateInvoicePdfHandler } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.handler';
import { GenerateInvoiceHtmlHandler } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.handler';
import { GenerateInvoiceHtmlCommand } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.command';
import { CreateInvoicePdfCommand } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.command';
import { DefaultContainer } from '@/common/di';

/**
 * PDFInvoiceGenerator generates a PDF invoice using CQRS handlers.
 * This is the default strategy for standard PDF invoices.
 */
export class PDFInvoiceGenerator extends InvoiceGeneratorStrategy {
	private readonly cqrs: CqrsBus;

	constructor(private readonly storageStrategy?: StorageLoaderStrategy) {
		super();
		this.cqrs = CqrsBus.forRoot({
			handlers: [CreateInvoicePdfHandler, GenerateInvoiceHtmlHandler],
			container: DefaultContainer,
		});
	}

	/**
	 * Generates a PDF invoice using the CQRS bus and returns it as a single attachment.
	 */
	async generate(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string; mimeType?: string }[]> {
		if (
			invoice.pdf?.forContentHash === invoice.contentHash &&
			invoice.pdf?.key &&
			this.storageStrategy
		) {
			return await this.storageStrategy.generate(invoice, options);
		}

		// Generate HTML for the invoice
		const { html } = await this.cqrs.execute(
			new GenerateInvoiceHtmlCommand({
				logoUrl: options.companyData.invoiceCompanyLogo,
				template: options.template.pdfTemplate,
				styles: options.template.pdfStyles,
				invoice,
				company: options.companyData.companyData,
			}),
		);
		// Generate PDF from HTML
		const { success, pdf } = await this.cqrs.execute(
			new CreateInvoicePdfCommand({
				invoice,
				html,
			}),
		);

		if (!success) {
			throw new Error('PDF generation failed');
		}

		if (this.storageStrategy) {
			await this.storageStrategy.store(invoice, pdf, 'invoice.pdf');
		}

		return [
			{
				content: pdf,
				filename: 'invoice.pdf',
				mimeType: 'application/pdf',
			},
		];
	}
}
