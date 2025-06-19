import 'reflect-metadata';

import '@/backend/services/config.service';

import { EventHandler } from '../../types';
import { makeEventHandler } from '../../event-handler';

import { InvoiceGeneratePdfEvent } from './event';

import {
	INVOICE_REPOSITORY,
	SETTINGS_REPOSITORY,
} from '@/backend/repositories';
import type {
	InvoiceRepository,
	SettingsRepository,
} from '@/backend/repositories';
import {
	CompanyDataSetting,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
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
		const invoiceRepository = DefaultContainer.get(
			INVOICE_REPOSITORY,
		) as InvoiceRepository;
		const settingsRepository = DefaultContainer.get(
			SETTINGS_REPOSITORY,
		) as SettingsRepository;
		const cqrs = CqrsBus.forRoot({
			handlers: [CreateInvoicePdfHandler, GenerateInvoiceHtmlHandler],
			container: DefaultContainer,
		});

		const template = await settingsRepository.getSetting(PdfTemplateSetting);
		const companyData = await settingsRepository.getSetting(CompanyDataSetting);

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
				logoUrl: companyData.invoiceCompanyLogo,
				template: template.pdfTemplate,
				styles: template.pdfStyles,
				invoice,
				company: companyData.companyData,
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
