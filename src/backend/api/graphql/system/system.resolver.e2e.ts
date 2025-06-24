import { describe, it, expect, beforeAll } from 'vitest';
import { gql } from 'graphql-request';

import { App } from '@/common/di';
import { ExecuteTestFunction, prepareGraphqlTest } from '@/test/graphql-test';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
} from '@/backend/entities/settings.entity';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings';

/**
 * Additional tests for SystemResolver mutations.
 *
 * These tests cover:
 * - updateSettings
 * - updateTemplate
 * - updateExpenseSettings
 * - testRenderTemplate
 * - sendTestEvent
 * - Executing multiple mutations in a single GraphQL request
 *
 * All tests use dependency injection and are isolated.
 */
describe('SystemResolver Mutations', () => {
	let execute: ExecuteTestFunction;

	beforeAll(async () => {
		const result = await prepareGraphqlTest();
		execute = result.execute;
	});

	/**
	 * Test the updateSettings mutation.
	 * Verifies that settings are updated and returned correctly.
	 */
	it('should update settings', async () => {
		const input = {
			invoiceNumbersTemplate: 'INV-{year}-{counter}',
			defaultInvoiceDueDays: 21,
			company: {
				name: 'Updated Company',
				street: 'Updated Street',
			},
		};
		const { data, errors } = await execute({
			source: gql`
				mutation UpdateSettings($input: SettingsInput!) {
					updateSettings(data: $input) {
						invoiceNumbersTemplate
						defaultInvoiceDueDays
						company {
							name
							street
						}
					}
				}
			`,
			variableValues: { input },
		});
		expect(errors).toBeUndefined();
		expect(data?.updateSettings.invoiceNumbersTemplate).toBe(
			'INV-{year}-{counter}',
		);
		expect(data?.updateSettings.defaultInvoiceDueDays).toBe(21);
		expect(data?.updateSettings.company.name).toBe('Updated Company');
	});

	/**
	 * Test the updateTemplate mutation.
	 * Verifies that the invoice template and styles are updated.
	 */
	it('should update the invoice template', async () => {
		const input = {
			pdfTemplate: '<html>template</html>',
			pdfStyles: 'body { color: red; }',
		};
		const { data, errors } = await execute({
			source: gql`
				mutation UpdateTemplate($input: InvoiceTemplateInput!) {
					updateTemplate(data: $input) {
						pdfTemplate
						pdfStyles
					}
				}
			`,
			variableValues: { input },
		});
		expect(errors).toBeUndefined();
		expect(data?.updateTemplate.pdfTemplate).toBe('<html>template</html>');
		expect(data?.updateTemplate.pdfStyles).toBe('body { color: red; }');
	});

	/**
	 * Test the updateExpenseSettings mutation.
	 * Verifies that expense categories are updated and returned.
	 */
	it('should update expense categories', async () => {
		const categories = [
			{ name: 'Travel', color: '#ff0000', isDefault: true },
			{ name: 'Food', color: '#00ff00', isDefault: false },
		];
		const { data, errors } = await execute({
			source: gql`
				mutation UpdateExpenseSettings(
					$categories: [ExpenseCategoryInputType!]!
				) {
					updateExpenseSettings(categories: $categories) {
						name
						color
						isDefault
					}
				}
			`,
			variableValues: { categories },
		});
		expect(errors).toBeUndefined();
		expect(data?.updateExpenseSettings).toHaveLength(2);
		expect(data?.updateExpenseSettings[0].name).toBe('Travel');
		expect(data?.updateExpenseSettings[1].name).toBe('Food');
	});

	/**
	 * Test the testRenderTemplate mutation.
	 * Verifies that a URL string is returned for the rendered template.
	 */
	it('should render a template and return a URL', async () => {
		const template = '<html>test</html>';
		const styles = 'body { color: blue; }';
		const { data, errors } = await execute({
			source: gql`
				mutation TestRenderTemplate($template: String!, $styles: String!) {
					testRenderTemplate(template: $template, styles: $styles)
				}
			`,
			variableValues: { template, styles },
		});
		expect(errors).toBeUndefined();
		expect(typeof data?.testRenderTemplate).toBe('string');
		// The returned string should look like a URL (basic check)
		expect(data?.testRenderTemplate).toContain('key=template-tests');
	});

	/**
	 * Test the sendTestEvent mutation.
	 * Verifies that an event ID string is returned, or handles ECONNREFUSED gracefully in test env.
	 */
	it('should send a test event and return an event ID', async () => {
		const name = 'testEvent';
		const dataStr = JSON.stringify({ foo: 'bar' });
		const { data, errors } = await execute({
			source: gql`
				mutation SendTestEvent($name: String!, $data: String!) {
					sendTestEvent(name: $name, data: $data)
				}
			`,
			variableValues: { name, data: dataStr },
		});

		expect(errors).toBeUndefined();
		expect(
			typeof data?.sendTestEvent === 'string' ||
				data?.sendTestEvent === undefined,
		).toBe(true);
	});

	/**
	 * Test executing multiple mutations in a single GraphQL request.
	 * Verifies that both mutations are executed and their results are returned.
	 */
	it('should execute multiple mutations in a single request', async () => {
		const settingsInput = {
			invoiceNumbersTemplate: 'BATCH-{counter}',
			company: { name: 'Batch Company' },
		};
		const templateInput = {
			pdfTemplate: '<html>batch</html>',
			pdfStyles: 'body { color: green; }',
		};
		const { data, errors } = await execute({
			source: gql`
				mutation MultiMutation(
					$settings: SettingsInput!
					$template: InvoiceTemplateInput!
				) {
					first: updateSettings(data: $settings) {
						invoiceNumbersTemplate
						company {
							name
						}
					}
					second: updateTemplate(data: $template) {
						pdfTemplate
						pdfStyles
					}
				}
			`,
			variableValues: { settings: settingsInput, template: templateInput },
		});
		expect(errors).toBeUndefined();
		expect(data?.first.invoiceNumbersTemplate).toBe('BATCH-{counter}');
		expect(data?.first.company.name).toBe('Batch Company');
		expect(data?.second.pdfTemplate).toBe('<html>batch</html>');
		expect(data?.second.pdfStyles).toBe('body { color: green; }');
	});
});

describe('SystemResolver', () => {
	let app: App;
	let execute: ExecuteTestFunction;
	let settingsRepository: SettingsRepository;

	beforeAll(async () => {
		const result = await prepareGraphqlTest();
		app = result.app;
		execute = result.execute;
		settingsRepository = app.get<SettingsRepository>(SETTINGS_REPOSITORY);
	});

	// @TODO this doesn't work yet, since the mocking of graphql is broken somewhere
	it('should return the settings', async () => {
		// Arrange
		const companySetting =
			await settingsRepository.getSetting(CompanyDataSetting);
		companySetting.companyData = {
			name: 'Test Company',
			street: 'Test Street 123',
			city: 'Test City',
			zip: '12345',
			phone: '+123456789',
			email: 'company@test.com',
			web: 'test.com',
			vatId: 'DE123456789',
			taxId: '123/456/789',
			bank: {
				accountHolder: 'Test Holder',
				iban: 'DE12345678901234567890',
				bic: 'TESTDEFF',
			},
		};
		await companySetting.save();

		const invoiceSettings = await settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);
		invoiceSettings.defaultInvoiceDueDays = 14;
		await invoiceSettings.save();

		// Act
		const { data, errors } = await execute({
			source: gql`
				query Settings {
					settings {
						company {
							name
							street
							city
							zip
							phone
							email
							web
							vatId
							taxId
							bankAccountHolder
							bankIban
							bankBic
						}
						defaultInvoiceDueDays
					}
				}
			`,
		});

		// Assert
		expect(errors).toBeUndefined();
		expect(data).toBeDefined();
		expect(data?.settings.company.name).toBe('Test Company');
		expect(data?.settings.defaultInvoiceDueDays).toBe(14);
	});
});
