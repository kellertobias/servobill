/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/order */

import { randomUUID } from 'node:crypto';

import { execSync } from 'node:child_process';

import fs from 'node:fs';
import path from 'node:path';

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
import { parseStringPromise } from 'xml2js';
import { MUSTANG_JAR_PATH } from '@/test/vitest.setup-e2e';

const getResult = (result: { content: Buffer; filename: string }[]): string => {
	expect(result).toBeDefined();
	expect(result.length).toBeGreaterThan(0);
	const xml = result
		.find((attachment) => attachment.filename.endsWith('.xml'))
		?.content.toString();
	expect(xml).toBeDefined();
	return xml!;
};

/**
 * Formats validation errors into a human-friendly, multi-line string for test output.
 * Each error includes the message, location, and criterion for easier debugging.
 *
 * @param errors - Array of validation error objects
 * @returns A formatted string summarizing all errors
 */
function formatValidationErrors(
	fileName: string,
	errors?: Array<{ message: string; location: string; criterion: string }>,
): string {
	if (!errors || errors.length === 0) {
		return '';
	}
	return (
		'Invoice XML validation failed with the following errors:' +
		'\n' +
		'\n' +
		errors
			.map((e, i) => {
				// split on the first of the two characters
				// that appear: colon or closing square bracket (:])
				const errorName = e.message.split(/[:\]]/)[0];
				const fullErrorName = `${errorName}${e.message.slice(
					errorName.length,
					errorName.length + 1,
				)}`;
				const errorMessage = e.message.slice(fullErrorName.length).trim();
				const location = e.location;

				return `
  ${i + 1}. ${fullErrorName}
    ${errorMessage}

    Location: ${location}
`;
			})
			.join('\n') +
		'\n' +
		`Please check the invoice XML for more details: ${fileName}\n\n`
	);
}

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

	const { source, valid, errors, fileName } = await validateInvoiceXml(xml);

	// If validation fails, throw a readable error for Vitest
	if (!valid) {
		const formatted = formatValidationErrors(fileName, errors);
		expect(valid, formatted).toBe(true);
	}

	return { invoice, source, valid, errors };
};

/**
 * Validates the given invoice XML using the Mustang validator JAR.
 *
 * This function runs the validator via execSync. If the XML is invalid, the process
 * will exit with an error, but the error output (stdout) will still contain the XML
 * error report. We catch the error, extract the XML output, and proceed to parse it
 * so that validation results (including errors) are always available.
 *
 * @param xml - The invoice XML string to validate
 * @returns An object containing the parsed invoice, validation result, and errors
 */
export const validateInvoiceXml = async (xml: string) => {
	// create a temp directory
	fs.mkdirSync('.test-temp', { recursive: true });
	// write the xml file to a temp file with a random name
	const fileName = path.join(`.test-temp/invoice-${randomUUID()}.xml`);
	fs.writeFileSync(fileName, xml);

	// use Mustang to validate the XML:
	/*
		java
		-Xmx1G
		-Dfile.encoding=UTF-8
		-jar ${MUSTANG_JAR_PATH}
		--no-notices
		--action validate
		--source invoice.xml
		2>/dev/null
	*/
	const command = `java -Xmx1G -Dfile.encoding=UTF-8 -jar ${MUSTANG_JAR_PATH} --no-notices --action validate --source ${fileName} 2>/dev/null`;

	let output;
	try {
		output = execSync(command, {
			encoding: 'utf8',
		});
	} catch (error: unknown) {
		// If validation fails, the error output (stdout) contains the XML error report
		output =
			error && typeof error === 'object' && 'stdout' in error
				? (error as { stdout?: string; stderr?: string; message?: string })
						.stdout ||
					(error as { stderr?: string }).stderr ||
					(error as { message?: string }).message
				: String(error);
	}

	// parse the output as XML
	const invoice = await parseStringPromise(xml);
	const out = await parseStringPromise(output ?? '');
	const v = out.validation;
	const messages = out.validation?.xml?.pop()?.messages?.pop() as
		| Record<
				'error',
				{
					_: string;
					$: {
						type: string;
						message?: string;
						location: string;
						criterion: string;
					};
				}[]
		  >
		| undefined;

	const validationResult = {
		fileName,
		source: invoice,
		errors: messages?.error?.map(
			(e: {
				_: string;
				$: {
					type: string;
					message?: string;
					location: string;
					criterion: string;
				};
			}) => ({
				message: e._,
				location: e.$.location,
				criterion: e.$.criterion,
			}),
		),
		valid: v.summary?.pop()?.$?.status === 'valid',
	};

	// unlinke the temp file if there are no errors
	if (!validationResult.errors || validationResult.errors.length === 0) {
		fs.unlinkSync(fileName);
	}

	return validationResult;
};
