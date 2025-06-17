import { InvoiceSendEvent } from './event';

import { GenerateInvoiceHtmlHandler } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.handler';
import { CreateInvoicePdfHandler } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.handler';
import {
	CompanyDataSetting,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import {
	ATTACHMENT_REPOSITORY,
	SETTINGS_REPOSITORY,
	INVOICE_REPOSITORY,
	EMAIL_REPOSITORY,
	type AttachmentRepository,
	type InvoiceRepository,
	type SettingsRepository,
	type EmailRepository,
} from '@/backend/repositories';
import { CqrsBus } from '@/backend/services/cqrs.service';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { SESService } from '@/backend/services/ses.service';
import { DefaultContainer, Inject, Service } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import { GenerateInvoiceHtmlCommand } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.command';
import { InvoiceEntity, InvoiceType } from '@/backend/entities/invoice.entity';
import { CreateInvoicePdfCommand } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.command';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';

@Service()
export class HandlerExecution {
	private readonly logger = new Logger('InvoiceSendHandler');
	private readonly cqrsBus: CqrsBus;
	constructor(
		@Inject(INVOICE_REPOSITORY)
		private readonly invoiceRepository: InvoiceRepository,
		@Inject(ATTACHMENT_REPOSITORY)
		private readonly attachmentRepository: AttachmentRepository,
		@Inject(FILE_STORAGE_SERVICE)
		private readonly fileStorageService: FileStorageService,
		@Inject(SESService)
		private readonly sesService: SESService,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
		@Inject(EMAIL_REPOSITORY)
		private readonly emailRepository: EmailRepository,
	) {
		this.cqrsBus = CqrsBus.forRoot({
			handlers: [CreateInvoicePdfHandler, GenerateInvoiceHtmlHandler],
			container: DefaultContainer,
		});
	}

	async execute(event: InvoiceSendEvent) {
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

		const pdf = await this.getPdf(invoice, template, companyData);

		if (!pdf) {
			throw new Error('No PDF');
		}

		const attachments = await this.getAttachments(invoice);

		this.logger.info('Generating email', {
			invoiceId: invoice.id,
		});

		await this.invoiceRepository.save(invoice);
		await this.sendEmail(event.id, invoice, companyData, attachments, pdf);
	}

	private async sendEmail(
		eventId: string,
		invoice: InvoiceEntity,
		companyData: CompanyDataSetting,
		attachments: { filename: string; content: Buffer }[],
		pdf: Buffer,
	) {
		// Get invoice entity again to make sure it isn't already sent.
		const invoiceEntity = await this.invoiceRepository.getById(invoice.id);
		if (!invoiceEntity || invoiceEntity.id !== invoice.id) {
			throw new Error('Invoice not found');
		}

		// Check if this event has already been processed
		if (invoiceEntity.hasProcessedEvent(eventId)) {
			console.log('Event already processed, skipping', {
				invoiceId: invoice.id,
				eventId,
			});
			return;
		}

		// Mark the event as processed after successful email send
		console.log('Processing event - not yet sent.', {
			invoiceId: invoice.id,
			eventId,
		});

		// mark the original invoice as processed and save it.
		// we do this to the original invoice since otherwise
		// saving the invoice later will override it.
		invoice.markEventAsProcessed(eventId);
		await this.invoiceRepository.save(invoice);

		const subject = await this.getSubject(invoice, companyData);
		const emailHtml = await this.getEmail(invoice, companyData);
		const redactedTo = `<redacted>@${invoice.customer.email
			?.split('@')
			.at(-1)}`;

		this.logger.info('Sending email', {
			invoiceId: invoice.id,
			subject,
			to: redactedTo,
		});

		// Send email
		const msg = await this.sesService.sendEmail({
			from: companyData.sendFrom,
			to: invoice.customer.email!,
			replyTo: companyData.replyTo,
			subject,
			html: emailHtml,
			attachments: [
				{
					filename: 'invoice.pdf',
					content: pdf,
				},
				...attachments,
			],
		});

		const emailStatus = await this.emailRepository.createWithId(msg.response);
		emailStatus.update({
			entityType: 'invoice',
			entityId: invoice.id,
			recipient: invoice.customer.email,
			sentAt: new Date(),
		});
		await this.emailRepository.save(emailStatus);

		this.logger.info('Email sent', { invoiceId: invoice.id, to: redactedTo });

		invoice.addActivity(
			new InvoiceActivityEntity({
				type: InvoiceActivityType.EMAIL_SENT,
			}),
		);
		await this.invoiceRepository.save(invoice);

		await this.sesService.sendEmail({
			from: companyData.sendFrom,
			to: companyData.replyTo,
			replyTo: companyData.replyTo,
			subject: `Invoice ${invoice.invoiceNumber} sent to Customer ${invoice.customer.name}`,
			html: emailHtml,
			attachments: [
				{
					filename: 'invoice.pdf',
					content: pdf,
				},
				...attachments,
			],
		});
	}

	private async getAttachments(invoice: InvoiceEntity) {
		/**
		 * Collect all attachments flagged for email from invoice activities.
		 */
		const flaggedAttachmentActivities = invoice.activity.filter(
			(a) =>
				a.type === InvoiceActivityType.ATTACHMENT &&
				a.attachToEmail &&
				a.attachmentId,
		);

		/**
		 * Download all flagged attachments from file storage.
		 */
		const extraAttachments = [];
		for (const activity of flaggedAttachmentActivities) {
			if (!activity.attachmentId) {
				continue;
			}
			const attachment = await this.attachmentRepository.getById(
				activity.attachmentId,
			);
			if (!attachment) {
				continue;
			}
			if (!attachment.s3Key) {
				continue;
			}
			// Use FileStorageService to get the file buffer
			let fileBuffer: Buffer | undefined;
			try {
				fileBuffer = await this.fileStorageService.getFile(attachment.s3Key, {
					bucket: attachment.s3Bucket,
				});
			} catch {
				continue;
			}
			extraAttachments.push({
				filename: attachment.fileName,
				content: fileBuffer,
			});
		}

		return extraAttachments;
	}

	private async getPdf(
		invoice: InvoiceEntity,
		template: PdfTemplateSetting,
		companyData: CompanyDataSetting,
	) {
		return await (invoice.pdf?.forContentHash !== invoice.contentHash ||
		!invoice.pdf?.key
			? this.getPdfFromGenerated(invoice, template, companyData)
			: this.getPdfFromStorage(invoice));
	}

	private async getPdfFromGenerated(
		invoice: InvoiceEntity,
		template: PdfTemplateSetting,
		companyData: CompanyDataSetting,
	) {
		this.logger.info('No PDF. Generating', { invoiceId: invoice.id });
		const { html } = await this.cqrsBus.execute(
			new GenerateInvoiceHtmlCommand({
				logoUrl: companyData.invoiceCompanyLogo,
				template: template.pdfTemplate,
				styles: template.pdfStyles,
				invoice,
				company: companyData.companyData,
			}),
		);
		const {
			success,
			pdf: generatedPdf,
			...location
		} = await this.cqrsBus.execute(
			new CreateInvoicePdfCommand({
				invoice,
				html,
			}),
		);

		if (!success) {
			throw new Error('Pdf generation failed');
		}

		const pdf = generatedPdf;
		invoice.updatePdf(location);

		await this.invoiceRepository.save(invoice);
		this.logger.info('PDF generated. Saving.', { invoiceId: invoice.id });
		return pdf;
	}

	private async getPdfFromStorage(invoice: InvoiceEntity) {
		if (!invoice.pdf?.key) {
			throw new Error('PDF key missing');
		}

		this.logger.info('PDF exists. Downloading', {
			invoiceId: invoice.id,
			key: invoice.pdf.key,
		});
		// Get pdf from storage abstraction
		if (!invoice.pdf.bucket || !invoice.pdf.key) {
			throw new Error('PDF bucket or key missing');
		}
		return await this.fileStorageService.getFile(invoice.pdf.key, {
			bucket: invoice.pdf.bucket,
		});
	}

	private async getSubject(
		invoice: InvoiceEntity,
		companyData: CompanyDataSetting,
	) {
		const subjects = {
			invoice: companyData.emailSubjectInvoices,
			offer: companyData.emailSubjectOffers,
			reminder: companyData.emailSubjectReminder,
			warning: companyData.emailSubjectWarning,
		};

		const subjectTemplate =
			subjects[invoice.type === InvoiceType.INVOICE ? 'invoice' : 'offer'];
		const { html } = await this.cqrsBus.execute(
			new GenerateInvoiceHtmlCommand({
				logoUrl: companyData.emailCompanyLogo,
				noWrap: true,
				template: subjectTemplate,
				styles: '',
				invoice,
				company: companyData.companyData,
			}),
		);
		return html;
	}

	private async getEmail(
		invoice: InvoiceEntity,
		companyData: CompanyDataSetting,
	) {
		const { html } = await this.cqrsBus.execute(
			new GenerateInvoiceHtmlCommand({
				logoUrl: companyData.emailCompanyLogo,
				template: companyData.emailTemplate,
				styles: '',
				invoice,
				company: companyData.companyData,
			}),
		);
		return html;
	}
}
