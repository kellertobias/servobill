import { InvoiceSendEvent } from './event';
import { INVOICE_EMAIL_SENDER, InvoiceEmailSender } from './email';

import { GenerateInvoiceHtmlHandler } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.handler';
import { CreateInvoicePdfHandler } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.handler';
import {
	CompanyDataSetting,
	PdfTemplateSetting,
	InvoiceSettingsEntity,
} from '@/backend/entities/settings.entity';
import {
	SETTINGS_REPOSITORY,
	INVOICE_REPOSITORY,
	type InvoiceRepository,
	type SettingsRepository,
} from '@/backend/repositories';
import { CqrsBus } from '@/backend/services/cqrs.service';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { DefaultContainer, Inject, Service } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import { InvoiceOutputFormat } from '@/backend/entities/settings.entity';
import { PDFInvoiceGenerator } from '@/backend/services/invoice-generators/pdf-invoice-generator';
import { ZugferdInvoiceGenerator } from '@/backend/services/invoice-generators/zugferd-invoice-generator';
import { XRechnungInvoiceGenerator } from '@/backend/services/invoice-generators/xrechnung-invoice-generator';
import { StorageLoaderStrategy } from '@/backend/services/invoice-generators/storage';
import type { ConfigService } from '@/backend/services/config.service';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { InvoiceType } from '@/backend/entities/invoice.entity';

@Service()
export class HandlerExecution {
	private readonly logger = new Logger('InvoiceSendHandler');
	private readonly cqrsBus: CqrsBus;
	constructor(
		@Inject(INVOICE_REPOSITORY)
		private readonly invoiceRepository: InvoiceRepository,
		@Inject(FILE_STORAGE_SERVICE)
		private readonly fileStorageService: FileStorageService,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
		@Inject(INVOICE_EMAIL_SENDER)
		private readonly invoiceEmailSender: InvoiceEmailSender,
		@Inject(CONFIG_SERVICE)
		private readonly config: ConfigService,
	) {
		this.cqrsBus = CqrsBus.forRoot({
			handlers: [CreateInvoicePdfHandler, GenerateInvoiceHtmlHandler],
			container: DefaultContainer,
		});
	}

	async execute(event: InvoiceSendEvent) {
		// randomly delay between 0 and 10 seconds to avoid overlapping sends
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 10000));

		const invoice = await this.invoiceRepository.getById(event.invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}

		if (!invoice.customer?.email) {
			throw new Error('No email address');
		}

		if (invoice.contentHash !== event.forContentHash) {
			throw new Error('Invoice has changed since send was requested');
		}

		const template =
			await this.settingsRepository.getSetting(PdfTemplateSetting);
		const companyData =
			await this.settingsRepository.getSetting(CompanyDataSetting);

		// Load invoice output format setting
		const invoiceSettings = await this.settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);

		const outputFormat =
			invoiceSettings.invoiceOutputFormat as InvoiceOutputFormat;

		const generator = await this.getGenerator(outputFormat, invoice.type);

		const baseAttachments = await generator.generate(invoice, {
			companyData,
			invoiceSettings,
			template,
		});

		const extraAttachments =
			await this.invoiceEmailSender.getAttachments(invoice);

		this.logger.info('Updating Invoice', {
			invoiceId: invoice.id,
		});

		try {
			await this.invoiceRepository.save(invoice);
		} catch (error) {
			this.logger.error('Error updating invoice', {
				invoiceId: invoice.id,
				error,
			});
			throw error;
		}

		this.logger.info('Generating email', {
			invoiceId: invoice.id,
		});

		// Compose attachments array based on output format
		const attachments = [...baseAttachments, ...extraAttachments];

		this.logger.info('Sending email', {
			invoiceId: invoice.id,
		});

		this.invoiceEmailSender.sendEmail(
			event.id,
			invoice,
			companyData,
			attachments,
		);

		this.logger.info('Email sent - All Done.', {
			invoiceId: invoice.id,
		});
	}

	private async getGenerator(
		outputFormat: InvoiceOutputFormat,
		invoiceType: InvoiceType,
	) {
		const pdfGenerator = new PDFInvoiceGenerator(
			new StorageLoaderStrategy(this.fileStorageService, this.config),
		);

		if (invoiceType === InvoiceType.OFFER) {
			return pdfGenerator;
		}

		switch (outputFormat) {
			case InvoiceOutputFormat.PDF: {
				return pdfGenerator;
			}
			case InvoiceOutputFormat.XRECHNUNG_PDF: {
				return new XRechnungInvoiceGenerator(pdfGenerator);
			}
			case InvoiceOutputFormat.XRECHNUNG: {
				return new XRechnungInvoiceGenerator();
			}
			case InvoiceOutputFormat.ZUGFERD: {
				return new ZugferdInvoiceGenerator(pdfGenerator);
			}
		}
	}
}
