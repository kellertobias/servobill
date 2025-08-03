import { GenerateInvoiceHtmlHandler } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.handler';
import { CreateInvoicePdfHandler } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.handler';
import { CompanyDataSetting } from '@/backend/entities/settings.entity';
import {
	ATTACHMENT_REPOSITORY,
	INVOICE_REPOSITORY,
	EMAIL_REPOSITORY,
	type AttachmentRepository,
	type InvoiceRepository,
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
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';

export const INVOICE_EMAIL_SENDER = Symbol('InvoiceEmailSender');

@Service(INVOICE_EMAIL_SENDER)
export class InvoiceEmailSender {
	private readonly logger = new Logger('InvoiceEmailSender');
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
		@Inject(EMAIL_REPOSITORY)
		private readonly emailRepository: EmailRepository,
	) {
		this.cqrsBus = CqrsBus.forRoot({
			handlers: [CreateInvoicePdfHandler, GenerateInvoiceHtmlHandler],
			container: DefaultContainer,
		});
	}

	public async sendEmail(
		eventId: string,
		invoice: InvoiceEntity,
		companyData: CompanyDataSetting,
		attachments: { filename: string; content: Buffer }[],
	) {
		this.logger.info('Sending email', {
			eventId,
			invoiceId: invoice.id,
			subject: companyData.emailSubjectInvoices,
			to: invoice.customer.email!,
		});

		if (!eventId) {
			this.logger.error('Event ID is required', {
				invoiceId: invoice.id,
			});
			throw new Error('Event ID is required');
		}

		// Get invoice entity again to make sure it isn't already sent.
		const invoiceEntity = await this.invoiceRepository.getById(invoice.id);
		if (!invoiceEntity || invoiceEntity.id !== invoice.id) {
			this.logger.error('Invoice not found in sendEmail', {
				invoiceId: invoice.id,
			});
			throw new Error('Invoice not found');
		}

		// Check if this event has already been processed
		if (invoiceEntity.hasProcessedEvent(eventId)) {
			this.logger.info('Invoice already processed', {
				invoiceId: invoice.id,
			});
			return;
		}

		this.logger.info('Invoice available and unprocessed. Continuing...', {
			eventId,
			invoiceId: invoice.id,
		});

		// mark the original invoice as processed and save it.
		// we do this to the original invoice since otherwise
		// saving the invoice later will override it.
		invoice.markEventAsProcessed(eventId);
		await this.invoiceRepository.save(invoice);

		this.logger.info('Invoice marked as processed. Saved.', {
			invoiceId: invoice.id,
		});

		const subject = await this.getSubject(invoice, companyData);
		const emailHtml = await this.getEmail(invoice, companyData);
		const redactedTo = `<redacted>@${invoice.customer.email
			?.split('@')
			.at(-1)}`;

		this.logger.info('Sending email to customer', {
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
			attachments: [...attachments],
		});

		this.logger.info('Email sent to customer', {
			invoiceId: invoice.id,
			to: redactedTo,
			msgId: msg.response,
		});

		const emailStatus = await this.emailRepository.createWithId(msg.response);
		emailStatus.update({
			entityType: 'invoice',
			entityId: invoice.id,
			recipient: invoice.customer.email,
			sentAt: new Date(),
		});
		await this.emailRepository.save(emailStatus);

		this.logger.info('Email status created', {
			invoiceId: invoice.id,
			msgId: msg.response,
			statusId: emailStatus.id,
			to: redactedTo,
		});

		invoice.addActivity(
			new InvoiceActivityEntity({
				type: InvoiceActivityType.EMAIL_SENT,
			}),
		);
		await this.invoiceRepository.save(invoice);

		this.logger.info('Invoice activity added', {
			invoiceId: invoice.id,
			activityId: invoice.activity.at(-1)?.id,
			activityType: InvoiceActivityType.EMAIL_SENT,
		});

		await this.sesService.sendEmail({
			from: companyData.sendFrom,
			to: companyData.replyTo,
			replyTo: companyData.replyTo,
			subject: `Invoice ${invoice.invoiceNumber} sent to Customer ${invoice.customer.name}`,
			html: emailHtml,
			attachments: [...attachments],
		});

		this.logger.info('Email sent to user', {
			invoiceId: invoice.id,
		});
	}

	public async getAttachments(invoice: InvoiceEntity) {
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
