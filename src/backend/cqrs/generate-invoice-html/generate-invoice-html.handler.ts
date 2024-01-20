import * as handlebars from 'handlebars';
import dayjs from 'dayjs';

import { GenerateInvoiceHtmlCommand } from './generate-invoice-html.command';

import { CqrsHandler, ICqrsHandler } from '@/backend/services/cqrs.service';
import { centsToPrice } from '@/common/money';
import { InvoiceType } from '@/backend/entities/invoice.entity';
import { Span } from '@/backend/instrumentation';

const makeTemplate = (template: string, styles: string) => {
	return `
	<!DOCTYPE html>
	<html lang="en" style="width: 210mm; height: 295mm; padding: 0; margin: 0;">
	  <head>
		<meta charset="UTF-8" />
	  </head>
	  <style>
		${styles}
	  </style>
	  <body style="width: 210mm; height: 295mm; padding: 0; margin: 0;">
		${template}
	  </body>
	</html>
`;
};

handlebars.registerHelper('foldmarks', () => {
	return new handlebars.SafeString(`
	<div class="foldmarks">
	${['10.8cm', '20.6cm']
		.map(
			(top) =>
				`<div style="position: absolute; content: ' '; color: transparent; width: 3mm; border-top: 0.5mm solid #CCC; left: 2mm; top: ${top};"></div>`,
		)
		.join('\n')}
	</div>
	`);
});

@CqrsHandler(GenerateInvoiceHtmlCommand)
export class GenerateInvoiceHtmlHandler
	implements ICqrsHandler<GenerateInvoiceHtmlCommand>
{
	constructor() {}

	@Span('GenerateInvoiceHtmlHandler.execute')
	private buildData(command: GenerateInvoiceHtmlCommand['request']) {
		return {
			name:
				command.invoice.customer.contactName || command.invoice.customer.name,
			company: {
				...command.company,
				logo: command.logoUrl,
			},
			customer: command.invoice.customer,
			number:
				command.invoice.type === InvoiceType.INVOICE
					? command.invoice.invoiceNumber
					: command.invoice.offerNumber,

			due: command.invoice.dueAt,
			invoice: {
				...command.invoice,
				footerText: command.invoice.footerText || '',
			},
			subtotal: `${centsToPrice(
				command.invoice.items.reduce(
					(acc, item) => acc + item.priceCents * item.quantity,
					0,
				),
			)}€`,
			tax: `${centsToPrice(
				command.invoice.items.reduce(
					(acc, item) =>
						acc + item.priceCents * item.quantity * (item.taxPercentage / 100),
					0,
				),
			)}€`,
			total: `${centsToPrice(
				command.invoice.items.reduce(
					(acc, item) =>
						acc +
						item.priceCents * item.quantity * (1 + item.taxPercentage / 100),
					0,
				),
			)}€`,
			paid: command.invoice.paidCents
				? `${centsToPrice(command.invoice.paidCents)}€`
				: false,
			remaining: command.invoice.paidCents
				? `${centsToPrice(
						command.invoice.items.reduce(
							(acc, item) =>
								acc +
								item.priceCents *
									item.quantity *
									(1 + item.taxPercentage / 100),
							0,
						) - command.invoice.paidCents,
					)}€`
				: false,

			items: command.invoice.items.map((item) => ({
				name: item.name,
				description: item.description,
				quantity: item.quantity,
				price: `${centsToPrice(item.priceCents)}€`,
				tax: `${item.taxPercentage}%`,
				total: `${centsToPrice(
					item.priceCents * item.quantity * (1 + item.taxPercentage / 100),
				)}€`,
			})),
		};
	}

	private registerHelpers(command: GenerateInvoiceHtmlCommand['request']) {
		handlebars.registerHelper('date', function (date, format) {
			if (!date || !(typeof date === 'string' || date instanceof Date)) {
				date =
					command.invoice.type === InvoiceType.INVOICE
						? command.invoice.invoicedAt
						: command.invoice.offeredAt;
			}
			if (!date) {
				return 'Invalid date';
			}
			return dayjs(date).format(
				typeof format === 'string' && format ? format : 'DD.MM.YYYY',
			);
		});
		handlebars.registerHelper('nl2br', function (text: string) {
			return new handlebars.SafeString(
				`${text || ''}`.replaceAll('\n', '<br />'),
			);
		});
		handlebars.registerHelper('withTax', function (options) {
			const hasTax = command.invoice.items.some(
				(item) => item?.taxPercentage && item?.taxPercentage > 0,
			);
			// eslint-disable-next-line unicorn/prefer-ternary
			if (hasTax) {
				// @ts-expect-error this references the handlebars context
				return options.fn(this);
			} else {
				// @ts-expect-error this references the handlebars context
				return options.inverse(this);
			}
		});
		handlebars.registerHelper('ifInvoice', function (options) {
			// eslint-disable-next-line unicorn/prefer-ternary
			if (command.invoice.type === InvoiceType.INVOICE) {
				// @ts-expect-error this references the handlebars context
				return options.fn(this);
			} else {
				// @ts-expect-error this references the handlebars context
				return options.inverse(this);
			}
		});
		handlebars.registerHelper('ifOffer', function (options) {
			// eslint-disable-next-line unicorn/prefer-ternary
			if (command.invoice.type === InvoiceType.OFFER) {
				// @ts-expect-error this references the handlebars context
				return options.fn(this);
			} else {
				// @ts-expect-error this references the handlebars context
				return options.inverse(this);
			}
		});
	}

	@Span('GenerateInvoiceHtmlHandler.execute')
	async execute(command: GenerateInvoiceHtmlCommand['request']) {
		const template = command.noWrap
			? command.template
			: makeTemplate(command.template, command.styles);

		this.registerHelpers(command);

		const compiledTemplate = handlebars.compile(template);
		const data = this.buildData(command);
		const html = compiledTemplate(data);

		return {
			html,
		};
	}
}
