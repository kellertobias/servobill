import 'reflect-metadata';

import { EventHandler } from '../../types';
import { makeEventHandler } from '../../event-handler';

import { InvoiceSendEvent } from './event';

import {
	INVOICE_REPOSITORY,
	SETTINGS_REPOSITORY,
	EMAIL_REPOSITORY,
} from '@/backend/repositories';
import type {
	InvoiceRepository,
	SettingsRepository,
	EmailRepository,
} from '@/backend/repositories';
import { PdfTemplateSetting } from '@/backend/entities/settings.entity';
import { CqrsBus } from '@/backend/services/cqrs.service';
import { CreateInvoicePdfCommand } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.command';
import { CreateInvoicePdfHandler } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.handler';
import { DefaultContainer } from '@/common/di';
import { GenerateInvoiceHtmlHandler } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.handler';
import { GenerateInvoiceHtmlCommand } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.command';
import { FILE_STORAGE_SERVICE } from '@/backend/services/file-storage.service';
import type { FileStorageService } from '@/backend/services/file-storage.service';
import { SESService } from '@/backend/services/ses.service';
import { InvoiceEntity, InvoiceType } from '@/backend/entities/invoice.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import type { AttachmentRepository } from '@/backend/repositories/attachment/interface';

const getSubject = async (
	invoice: InvoiceEntity,
	settings: PdfTemplateSetting,
	bus: CqrsBus,
) => {
	const subjects = {
		invoice: settings.emailSubjectInvoices,
		offer: settings.emailSubjectOffers,
		reminder: settings.emailSubjectReminder,
		warning: settings.emailSubjectWarning,
	};

	const subjectTemplate =
		subjects[invoice.type === InvoiceType.INVOICE ? 'invoice' : 'offer'];
	const { html } = await bus.execute(
		new GenerateInvoiceHtmlCommand({
			logoUrl: settings.emailCompanyLogo,
			noWrap: true,
			template: subjectTemplate,
			styles: '',
			invoice,
			company: settings.companyData,
		}),
	);
	return html;
};

const getEmail = async (
	invoice: InvoiceEntity,
	settings: PdfTemplateSetting,
	bus: CqrsBus,
) => {
	const { html } = await bus.execute(
		new GenerateInvoiceHtmlCommand({
			logoUrl: settings.emailCompanyLogo,
			template: settings.emailTemplate,
			styles: '',
			invoice,
			company: settings.companyData,
		}),
	);
	return html;
};

export const handlerName = 'handler';
export const layers = ['layers/chromium'];
export const handler: EventHandler = makeEventHandler(
	InvoiceSendEvent,
	async (event, { logger }) => {
		const invoiceRepository = DefaultContainer.get(
			INVOICE_REPOSITORY,
		) as InvoiceRepository;
		const settingsRepository = DefaultContainer.get(
			SETTINGS_REPOSITORY,
		) as SettingsRepository;
		const emailRepository = DefaultContainer.get(
			EMAIL_REPOSITORY,
		) as EmailRepository;
		const attachmentRepository = DefaultContainer.get(
			ATTACHMENT_REPOSITORY,
		) as AttachmentRepository;

		const ses = DefaultContainer.get(SESService);
		const cqrs = CqrsBus.forRoot({
			handlers: [CreateInvoicePdfHandler, GenerateInvoiceHtmlHandler],
			container: DefaultContainer,
		});
		const fileStorage = DefaultContainer.get(
			FILE_STORAGE_SERVICE,
		) as FileStorageService;

		const invoice = await invoiceRepository.getById(event.invoiceId);

		if (!invoice || invoice.contentHash !== event.forContentHash) {
			logger.info(
				`Invoice has changed since pdf generation was requested or is not present at all. Not generating pdf.`,
				{
					invoiceId: event.invoiceId,
					requestedContentHash: event.forContentHash,
				},
			);
			return;
		}

		const template = await settingsRepository.getSetting(PdfTemplateSetting);

		let pdf: Buffer | undefined;

		if (
			invoice.pdf?.forContentHash !== invoice.contentHash ||
			!invoice.pdf.key
		) {
			logger.info('No PDF. Generating', { invoiceId: invoice.id });
			const { html } = await cqrs.execute(
				new GenerateInvoiceHtmlCommand({
					logoUrl: template.invoiceCompanyLogo,
					template: template.pdfTemplate,
					styles: template.pdfStyles,
					invoice,
					company: template.companyData,
				}),
			);
			const {
				success,
				pdf: generatedPdf,
				...location
			} = await cqrs.execute(
				new CreateInvoicePdfCommand({
					invoice,
					html,
				}),
			);

			if (!success) {
				throw new Error('Pdf generation failed');
			}

			pdf = generatedPdf;
			invoice.updatePdf(location);

			await invoiceRepository.save(invoice);
			logger.info('PDF generated. Saving.', { invoiceId: invoice.id });
		} else {
			logger.info('PDF exists. Downloading', {
				invoiceId: invoice.id,
				key: invoice.pdf.key,
			});
			// Get pdf from storage abstraction
			if (!invoice.pdf.bucket || !invoice.pdf.key) {
				throw new Error('PDF bucket or key missing');
			}
			pdf = await fileStorage.getFile(invoice.pdf.bucket, invoice.pdf.key);
		}

		if (!pdf) {
			throw new Error('No PDF');
		}

		if (!invoice.customer.email) {
			throw new Error('No email address');
		}

		logger.info("Generating email's subject and body", {
			invoiceId: invoice.id,
		});

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
		 * Download all flagged attachments from S3.
		 */
		const extraAttachments = [];
		for (const activity of flaggedAttachmentActivities) {
			if (!activity.attachmentId) {
				continue;
			}
			const attachment = await attachmentRepository.getById(
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
				fileBuffer = await fileStorage.getFile(
					attachment.s3Bucket,
					attachment.s3Key,
				);
			} catch {
				continue;
			}
			extraAttachments.push({
				filename: attachment.fileName,
				content: fileBuffer,
			});
		}

		const subject = await getSubject(invoice, template, cqrs);
		const emailHtml = await getEmail(invoice, template, cqrs);
		const redactedTo = `<redacted>@${invoice.customer.email.split('@').at(-1)}`;
		logger.info('Sending email', {
			invoiceId: invoice.id,
			subject,
			to: redactedTo,
		});
		// Send email
		const msg = await ses.sendEmail({
			from: template.sendFrom,
			to: invoice.customer.email,
			replyTo: template.replyTo,
			subject,
			html: emailHtml,
			attachments: [
				{
					filename: 'invoice.pdf',
					content: pdf,
				},
				...extraAttachments,
			],
		});

		const emailStatus = await emailRepository.createWithId(msg.response);
		emailStatus.update({
			entityType: 'invoice',
			entityId: invoice.id,
			recipient: invoice.customer.email,
			sentAt: new Date(),
		});
		emailRepository.save(emailStatus);

		logger.info('Email sent', { invoiceId: invoice.id, to: redactedTo });

		invoice.addActivity(
			new InvoiceActivityEntity({
				type: InvoiceActivityType.EMAIL_SENT,
			}),
		);

		await invoiceRepository.save(invoice);

		await ses.sendEmail({
			from: template.sendFrom,
			to: template.replyTo,
			replyTo: template.replyTo,
			subject: `Invoice ${invoice.invoiceNumber} sent to Customer ${invoice.customer.name}`,
			html: emailHtml,
			attachments: [
				{
					filename: 'invoice.pdf',
					content: pdf,
				},
				...extraAttachments,
			],
		});
	},
);
