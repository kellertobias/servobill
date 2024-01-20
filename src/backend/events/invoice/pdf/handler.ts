import 'reflect-metadata';

import { EventHandler } from '../../types';
import { makeEventHandler } from '../../event-handler';

import { InvoiceGeneratePdfEvent } from './event';

import { InvoiceRepository } from '@/backend/repositories/invoice.repository';
import { SettingsRepository } from '@/backend/repositories/settings.repository';
import { PdfTemplateSetting } from '@/backend/entities/settings.entity';
import { CqrsBus } from '@/backend/services/cqrs.service';
import { CreateInvoicePdfCommand } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.command';
import { CreateInvoicePdfHandler } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.handler';
import { DefaultContainer } from '@/common/di';
import { GenerateInvoiceHtmlHandler } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.handler';
import { GenerateInvoiceHtmlCommand } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.command';

export const handlerName = 'handler';
export const layers = ['layers/chromium'];
export const handler: EventHandler = makeEventHandler(
	InvoiceGeneratePdfEvent,
	async (event, { logger }) => {
		console.log(event);
		const invoiceRepository = DefaultContainer.get(InvoiceRepository);
		const settingsRepository = DefaultContainer.get(SettingsRepository);
		const cqrs = CqrsBus.forRoot({
			handlers: [CreateInvoicePdfHandler, GenerateInvoiceHtmlHandler],
			container: DefaultContainer,
		});

		const template = await settingsRepository.getSetting(PdfTemplateSetting);

		if (!template?.pdfTemplate) {
			throw new Error('No pdf template found');
		}

		const invoice = await invoiceRepository.getById(event.invoiceId);

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		if (invoice.contentHash !== event.forContentHash) {
			logger.info(
				`Invoice has changed since pdf generation was requested. Not generating pdf.`,
				{
					invoiceId: invoice.id,
					invoiceContentHash: invoice.contentHash,
					requestedContentHash: event.forContentHash,
				},
			);
			return;
		}
		const { html } = await cqrs.execute(
			new GenerateInvoiceHtmlCommand({
				logoUrl: template.invoiceCompanyLogo,
				template: template.pdfTemplate,
				styles: template.pdfStyles,
				invoice,
				company: template.companyData,
			}),
		);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { success, pdf, ...location } = await cqrs.execute(
			new CreateInvoicePdfCommand({
				invoice,
				html,
			}),
		);

		if (!success) {
			throw new Error('Pdf generation failed');
		}

		invoice.updatePdf(location);

		await invoiceRepository.save(invoice);
	},
);
