/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { parseStringPromise } from 'xml2js';
import dayjs from 'dayjs';

import {
	InvoiceFormat,
	ReceiptStructuredExtractionService,
} from './receipt-structured-extraction.service';
import { ZugferdExtractorStrategy } from './receipt-structured-zugferd';
import { XRechnungExtractorStrategy } from './receipt-structured-xrechnung';
import { ExtractedInvoiceStructure } from './receipt-structured-strategy-interface';

import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { VatStatus } from '@/backend/entities/settings.entity';
import { ZugferdInvoiceGenerator } from '@/backend/services/invoice-generators/zugferd-invoice-generator';
import { XRechnungInvoiceGenerator } from '@/backend/services/invoice-generators/xrechnung-invoice-generator';
import { runGenerator } from '@/backend/services/invoice-generators/invoice-generator-spec-helper';
import type { ExpenseRepository } from '@/backend/repositories';

const generators = [
	{
		name: 'ZUGFeRD',
		generator: () => new ZugferdInvoiceGenerator(),
		extractor: () => new ZugferdExtractorStrategy(),
	},
	{
		name: 'XRechnung',
		generator: () => new XRechnungInvoiceGenerator(),
		extractor: () => new XRechnungExtractorStrategy(),
	},
];

/**
 * Helper to create invoice items for test cases
 */
function createItems(
	config: {
		quantity: number;
		price: number;
		vat: number;
		name?: string;
		description?: string;
	}[],
): InvoiceItemEntity[] {
	return config.map(
		(item, idx) =>
			new InvoiceItemEntity({
				name: item.name || `Item ${idx + 1}`,
				description: item.description || `Description for item ${idx + 1}`,
				quantity: item.quantity,
				priceCents: item.price,
				taxPercentage: item.vat,
			}),
	);
}

describe('ReceiptStructuredExtractionService extracts correct xml', () => {
	generators.forEach(({ name, generator }) => {
		it(`should detect ${name} invoice`, async () => {
			// given
			const { xml } = await runGenerator(generator(), {
				vatStatus: VatStatus.VAT_ENABLED,
				items: createItems([{ quantity: 1, price: 1000, vat: 0 }]),
			});
			const parsed = await parseStringPromise(xml);

			const service = new ReceiptStructuredExtractionService({
				createWithId: vi.fn().mockResolvedValue({}),
				save: vi.fn().mockResolvedValue({}),
			} as unknown as ExpenseRepository);

			// when
			const format = service['detectInvoiceFormat'](parsed);

			// then
			switch (name) {
				case 'ZUGFeRD': {
					expect(format).toBe(InvoiceFormat.ZUGFeRD);
					break;
				}
				case 'XRechnung': {
					expect(format).toBe(InvoiceFormat.XRechnung);
					break;
				}
				default: {
					expect(format).toBe(InvoiceFormat.Unknown);
					break;
				}
			}
		});
	});
});

describe('ReceiptStructuredStrategy extracts correct data', () => {
	const testCases = [
		{
			label: 'single item, no tax',
			items: [{ quantity: 1, price: 1000, vat: 0, name: 'Taxfree Item' }],
			expect: (result: ExtractedInvoiceStructure, xml: string) => {
				expect(result.lineItems, xml).toHaveLength(1);
				expect(result.lineItems[0].name, xml).toBe('Taxfree Item');
				expect(result.lineItems[0].unitPriceCents, xml).toBe(1000);
				expect(result.lineItems[0].taxPercent, xml).toBe(0);
				expect(result.lineItems[0].taxCents, xml).toBe(0);
				expect(result.lineItems[0].netCents, xml).toBe(1000);
				expect(result.lineItems[0].totalCents, xml).toBe(1000);

				expect(result.totals?.netCents, xml).toBe(1000);
				expect(result.totals?.taxCents, xml).toBe(0);
				expect(result.totals?.grossCents, xml).toBe(1000);
			},
		},
		{
			label: 'single item, with tax',
			items: [{ quantity: 1, price: 1000, vat: 19, name: 'Crypto Gift Card' }],
			expect: (result: ExtractedInvoiceStructure, xml: string) => {
				expect(result.lineItems, xml).toHaveLength(1);
				expect(result.lineItems[0].name, xml).toBe('Crypto Gift Card');
				expect(result.lineItems[0].unitPriceCents, xml).toBe(1000);
				expect(result.lineItems[0].taxPercent, xml).toBe(19);
				expect(result.lineItems[0].taxCents, xml).toBe(190);
				expect(result.lineItems[0].totalCents, xml).toBe(1000 * 1.19);

				expect(result.totals?.netCents, xml).toBe(1000);
				expect(result.totals?.taxCents, xml).toBe(190);
				expect(result.totals?.grossCents, xml).toBe(1000 * 1.19);
			},
		},
		{
			label: 'multiple items, with tax',
			items: [
				{ quantity: 2, price: 500, vat: 19, name: 'Water Melon' },
				{ quantity: 1, price: 2000, vat: 7, name: 'Iced Tea 10L' },
			],
			expect: (result: ExtractedInvoiceStructure, xml: string) => {
				expect(result.lineItems, xml).toHaveLength(2);
				expect(result.lineItems[0].name, xml).toBe('Water Melon');
				expect(result.lineItems[0].taxCents, xml).toBe(2 * 500 * 0.19);
				expect(result.lineItems[0].totalCents, xml).toBe(2 * 500 * 1.19);

				expect(result.lineItems[1].name, xml).toBe('Iced Tea 10L');
				expect(result.lineItems[1].taxCents, xml).toBe(1 * 2000 * 0.07);
				expect(result.lineItems[1].totalCents, xml).toBe(1 * 2000 * 1.07);
				const total = result.lineItems.reduce(
					(sum: number, li: any) => sum + li.totalCents,
					0,
				);
				expect(total, xml).toBe(2 * 500 * 1.19 + 1 * 2000 * 1.07);

				expect(result.totals?.netCents, xml).toBe(2 * 500 + 1 * 2000);
				expect(result.totals?.taxCents, xml).toBe(
					2 * 500 * 0.19 + 1 * 2000 * 0.07,
				);
				expect(result.totals?.grossCents, xml).toBe(
					2 * 500 * 1.19 + 1 * 2000 * 1.07,
				);
			},
		},
		{
			label: 'single item, multiple quantities',
			items: [{ quantity: 5, price: 300, vat: 19, name: 'Honeydew Melon' }],
			expect: (result: ExtractedInvoiceStructure, xml: string) => {
				expect(result.lineItems, xml).toHaveLength(1);
				expect(result.lineItems[0].name, xml).toBe('Honeydew Melon');
				expect(result.lineItems[0].taxPercent, xml).toBe(19);
				expect(result.lineItems[0].taxCents, xml).toBe(300 * 5 * 0.19);
				expect(result.lineItems[0].totalCents, xml).toBe(1500 * 1.19);

				expect(result.totals?.netCents, xml).toBe(1500);
				expect(result.totals?.taxCents, xml).toBe(300 * 5 * 0.19);
				expect(result.totals?.grossCents, xml).toBe(1500 * 1.19);
			},
		},
		{
			label: 'multiple items and allowances',
			items: [
				{ quantity: 2, price: 500, vat: 19, name: 'Avocado' },
				{ quantity: 1, price: 2000, vat: 7, name: 'Roast Beef' },
				{
					quantity: 1,
					price: -300,
					vat: 19,
					name: 'Discount Coupon',
					description: 'Test Discount Description',
				},
			],
			expect: (result: ExtractedInvoiceStructure, xml: string) => {
				// For this test, the extraction should merge all items and allowances into a single result
				// (as per user request: combine titles & descriptions, cannot attach price per item)
				// For now, just check that at least one line item is present and total is correct
				expect(result.lineItems, xml).toHaveLength(1);
				expect(result.lineItems[0].name, xml).toBe(
					'Avocado, Roast Beef, Discount Coupon',
				);
				expect(result.totals?.taxCents, xml).toBe(
					2 * 500 * 0.19 + 1 * 2000 * 0.07 - 300 * 0.19,
				);
				expect(result.totals?.grossCents, xml).toBe(
					2 * 500 * 1.19 + 1 * 2000 * 1.07 - 300 * 1.19,
				);
				expect(result.totals?.netCents, xml).toBe(2 * 500 + 1 * 2000 - 300);
			},
		},
	];

	generators.forEach(({ name, generator, extractor }) => {
		describe(`${name} extraction`, () => {
			testCases.forEach(({ label, items, expect: expectFn }) => {
				it(`should extract: ${label}`, async () => {
					// given
					const { invoice, xml } = await runGenerator(generator(), {
						vatStatus: VatStatus.VAT_ENABLED,
						items: createItems(items),
						assertCorrectStructure: false,
					});

					// when
					const parsed = await parseStringPromise(xml);
					const result = await extractor().extract({
						xml: parsed,
						currency: 'EUR',
					});

					// then
					expectFn(result, xml);
					expect(result.invoiceNumber).toBe(invoice.invoiceNumber);
					expect(dayjs(result.invoiceDate).format('DD.MM.YYYY')).toBe(
						dayjs(invoice.invoicedAt).format('DD.MM.YYYY'),
					);
					expect(result.from).toBe('Cool Stuff Inc.');
				});
			});
		});
	});
});
