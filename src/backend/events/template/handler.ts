import 'reflect-metadata';

import '@/backend/services/config.service';
import { EventHandler } from '../types';
import { makeEventHandler } from '../event-handler';

import { GenerateTemplatePreviewEvent } from './event';

import { CqrsBus } from '@/backend/services/cqrs.service';
import { DefaultContainer } from '@/common/di';
import { GenerateInvoiceHtmlCommand } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.command';
import { InvoiceEntity, InvoiceType } from '@/backend/entities/invoice.entity';
import { GenerateInvoiceHtmlHandler } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.handler';
import { CreateInvoicePdfCommand } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.command';
import { CreateInvoicePdfHandler } from '@/backend/cqrs/generate-pdf/create-invoice-pdf.handler';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';

export const handlerName = 'handler';
export const layers = ['layers/chromium'];
export const handler: EventHandler = makeEventHandler(
	GenerateTemplatePreviewEvent,
	async (event, { logger }) => {
		const { template, styles } = event;

		const fileStorageService =
			DefaultContainer.get<FileStorageService>(FILE_STORAGE_SERVICE);
		const bus = CqrsBus.forRoot({
			handlers: [GenerateInvoiceHtmlHandler, CreateInvoicePdfHandler],
			container: DefaultContainer,
		});

		const invoice = {
			subject: 'Test Invoice PDF',
			invoiceNumber: event.data.invoiceNumber,
			type: InvoiceType.INVOICE,
			invoicedAt: new Date(),
			dueAt: new Date(),
			customer: {
				customerNumber: event.data.customerNumber,
				showContact: true,
				contactName: 'John Doe',
				name: 'Doe Inc.',
				street: 'Test Address',
				zip: '12345',
				city: 'Test City',
				country: 'Test Country',
			},
			items: [
				{
					id: '1',
					name: 'Expensive Item',
					description:
						'This item is expensive on purpose.\n\nIt is a test item.',
					quantity: 11,
					priceCents: 100000,
					taxPercentage: 19,
				},
				{
					id: '2',
					name: 'Driving to the customer',
					description: 'This is a cheap item\nWith a high quantity',
					quantity: 999,
					priceCents: 10,
					taxPercentage: 7,
				},
			],
			footerText:
				'This is a footer text\n\nIt can be used to add additional information to the invoice',
			totalCents: 100000 * 11 + 10 * 999 + 100000 * 11 * 0.19 + 10 * 999 * 0.07,
			totalTax: 100000 * 11 * 0.19 + 10 * 999 * 0.07,
		} as InvoiceEntity;

		const { html } = await bus.execute(
			new GenerateInvoiceHtmlCommand({
				logoUrl: event.data.logo,
				invoice,
				company: event.data.company,
				template,
				styles,
			}),
		);

		if (event.pdf) {
			await bus.execute(
				new CreateInvoicePdfCommand({
					key: event.key,
					html,
					invoice,
				}),
			);
		} else {
			await fileStorageService.saveFile(event.key, Buffer.from(html));
			logger.info('uploaded', { key: event.key });
		}
	},
);
