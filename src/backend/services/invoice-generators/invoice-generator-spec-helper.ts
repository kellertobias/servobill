import { randomUUID } from 'node:crypto';

// eslint-disable-next-line import/no-extraneous-dependencies
import { expect } from 'vitest';

import { InvoiceGeneratorStrategy } from './interface';

import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
	VatStatus,
} from '@/backend/entities/settings.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import '@/test/e-invoice-vitest-helper';

const getResult = (result: { content: Buffer; filename: string }[]): string => {
	expect(result).toBeDefined();
	expect(result.length).toBeGreaterThan(0);
	const xml = result
		.find((attachment) => attachment.filename.endsWith('.xml'))
		?.content.toString();
	expect(xml).toBeDefined();
	return xml!;
};

export const runGenerator = async (
	generator: InvoiceGeneratorStrategy,
	data: {
		subject?: string;
		vatStatus: VatStatus;
		items: InvoiceItemEntity[];
		paidCents?: number;
		footerText?: string;
	},
) => {
	const customer = new CustomerEntity({
		name: 'Testing Ltd.',
		street: 'Main Street 98',
		zip: '12345',
		city: 'Testingville',
		email: 'info@testing.com',
		countryCode: 'FR',
		customerNumber: `CUST-${Date.now() % 1000}`,
		showContact: false,
	});
	// Create minimal valid invoice entity
	const invoice = new InvoiceEntity({
		id: randomUUID(),
		subject: data.subject ?? 'Test Invoice',
		invoiceNumber: `INV-TEST-${Date.now()}`,
		type: InvoiceType.INVOICE,
		status: InvoiceStatus.SENT,
		customer,
		createdAt: new Date(),
		updatedAt: new Date(),
		invoicedAt: new Date(),
		dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
		items: data.items,
		totalCents: data.items.reduce((acc, item) => acc + item.priceCents, 0),
		totalTax: data.items.reduce(
			(acc, item) => acc + item.priceCents * item.taxPercentage,
			0,
		),
		paidCents: data.paidCents ?? 0,
		paidAt: data.paidCents ? new Date() : undefined,
		footerText: data.footerText,
		submissions: [],
		activity: [],
	});

	const companyData = {
		invoiceCompanyLogo: 'https://example.com/logo.png',
		companyData: {
			name: 'Cool Stuff Inc.',
			street: 'Awesomeness Street 123',
			zip: '45678',
			city: 'Great City',
			email: 'info@coolstuff.com',
			phone: '+1234567890',
			taxId: '345/345/9876',
			vatId: 'DE00712365489',
			web: 'https://coolstuff.com',
			bank: {
				accountHolder: 'Cool Stuff Inc.',
				iban: 'DE00712365489',
				bic: 'DEUTDEDB001',
			},
			countryCode: 'DE',
		},
		currency: 'EUR',
		vatStatus: data.vatStatus,
		sendFrom: 'info@coolstuff.com',
		replyTo: 'info@coolstuff.com',
	} as CompanyDataSetting;

	const invoiceSettings = {} as InvoiceSettingsEntity;
	const pdfTemplate = {
		pdfTemplate: '<html><body>Invoice</body></html>',
		pdfStyles: '',
	} as PdfTemplateSetting;

	invoice.totalCents = data.items.reduce(
		(acc, item) => acc + item.priceCents,
		0,
	);
	invoice.totalTax = data.items.reduce(
		(acc, item) => acc + (item.priceCents * item.taxPercentage) / 100,
		0,
	);

	const result = await generator.generate(invoice, {
		companyData,
		invoiceSettings,
		template: pdfTemplate,
	});

	const xml = getResult(result);

	// TODO Fix this type error based on ambient types. For now we just cast it
	await (
		expect(xml) as unknown as { toBeValidEInvoice: () => Promise<void> }
	).toBeValidEInvoice();

	return { invoice, xml };
};
