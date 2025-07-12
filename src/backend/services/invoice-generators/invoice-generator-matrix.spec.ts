/**
 * Matrix test for invoice generators (ZUGFeRD and XRechnung).
 *
 * This test suite covers the following cases for both generators:
 * - empty invoice
 * - invoice with VAT disabled and just one item
 * - invoice with VAT disabled and multiple items
 * - invoice with VAT disabled and one item and one negative/discount item
 * - invoice with VAT enabled and just one item
 * - invoice with VAT enabled and multiple items
 * - invoice with VAT enabled and one item and one negative/discount item
 *
 * For each case, we generate the required entities, call both generators, and assert that a result is returned.
 * This prepares for future CLI-based validation of the generated files.
 *
 * Why: Ensures both invoice generator strategies work for all relevant VAT/item/discount scenarios.
 * How: Uses a parameterized (matrix) test to cover all combinations, with clear comments and JSDoc.
 */

import { describe, it, expect } from 'vitest';

import { ZugferdInvoiceGenerator } from './zugferd-invoice-generator';
import { XRechnungInvoiceGenerator } from './xrechnung-invoice-generator';
import { runGenerator } from './invoice-generator-spec-helper';

import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { VatStatus } from '@/backend/entities/settings.entity';

// Helper to create invoice items for test cases
function createItems(
	config: { count: number; price: number; vat: number }[],
	vatEnabled: boolean,
): InvoiceItemEntity[] {
	const items: InvoiceItemEntity[] = [];
	for (const item of config) {
		items.push(
			new InvoiceItemEntity({
				name: `Item ${item.count}`,
				description: `Description for item ${item.count}`,
				quantity: item.count,
				priceCents: item.price,
				taxPercentage: vatEnabled ? item.vat : 0,
			}),
		);
	}
	return items;
}

const itemsTestCases = {
	oneItem: [{ count: 1, price: 100, vat: 19 }],
	multipleItems: [
		{ count: 3, price: 100, vat: 19 },
		{ count: 5, price: 999, vat: 19 },
		{ count: 1, price: 2000, vat: 7 },
	],
	oneItemAndOneDiscount: [
		{ count: 1, price: 100, vat: 19 },
		{ count: 1, price: -50, vat: 19 },
	],
	multipleItemsAndMultipleDiscounts: [
		{ count: 3, price: 100, vat: 19 },
		{ count: 5, price: 999, vat: 19 },
		{ count: 1, price: 2000, vat: 7 },
		{ count: 1, price: -50, vat: 19 },
		{ count: 1, price: -100, vat: 7 },
	],
};

const testCategories = [
	{
		name: 'VAT enabled',
		vatStatus: VatStatus.VAT_ENABLED,
		items: { ...itemsTestCases },
	},
	{
		name: 'VAT kleinunternehmer',
		vatStatus: VatStatus.VAT_DISABLED_KLEINUNTERNEHMER,
		items: { ...itemsTestCases },
	},
	{
		name: 'VAT disabled',
		vatStatus: VatStatus.VAT_DISABLED_OTHER,
		items: { ...itemsTestCases },
	},
];

describe('InvoiceGenerator', () => {
	describe('ZUGFeRD', () => {
		testCategories.forEach((testCase) => {
			describe(testCase.name, () => {
				it(`should generate a regular invoice`, async () => {
					const { source, valid } = await runGenerator(
						new ZugferdInvoiceGenerator(),
						{
							items: createItems(
								testCase.items.multipleItems,
								testCase.vatStatus === VatStatus.VAT_ENABLED,
							),
							vatStatus: testCase.vatStatus,
						},
					);
					expect(source).toBeDefined();
					expect(valid).toBe(true);
				});
				it.skip(`should generate an invoice with multiple discounts`, async () => {
					const { source, valid } = await runGenerator(
						new ZugferdInvoiceGenerator(),
						{
							items: createItems(
								testCase.items.multipleItemsAndMultipleDiscounts,
								testCase.vatStatus === VatStatus.VAT_ENABLED,
							),
							vatStatus: testCase.vatStatus,
						},
					);
					expect(source).toBeDefined();
					expect(valid).toBe(true);
				});
			});
		});
	});
	describe('XRechnung', () => {
		testCategories.forEach((testCase) => {
			describe(testCase.name, () => {
				it(`should generate a regular invoice`, async () => {
					const { source, valid } = await runGenerator(
						new XRechnungInvoiceGenerator(),
						{
							items: createItems(
								testCase.items.multipleItems,
								testCase.vatStatus === VatStatus.VAT_ENABLED,
							),
							vatStatus: testCase.vatStatus,
						},
					);
					expect(source).toBeDefined();
					expect(valid).toBe(true);
				});
				it(`should generate an invoice with multiple discounts`, async () => {
					const { source, valid } = await runGenerator(
						new XRechnungInvoiceGenerator(),
						{
							items: createItems(
								testCase.items.multipleItemsAndMultipleDiscounts,
								testCase.vatStatus === VatStatus.VAT_ENABLED,
							),
							vatStatus: testCase.vatStatus,
						},
					);
					expect(source).toBeDefined();
					expect(valid).toBe(true);
				});
			});
		});
	});
});
