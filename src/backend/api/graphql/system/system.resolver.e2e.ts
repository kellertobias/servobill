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

describe('SystemResolver', () => {
	let app: App;
	let execute: ExecuteTestFunction;
	let settingsRepository: SettingsRepository;

	beforeAll(async () => {
		const { app: testApp, execute: testExecute } = await prepareGraphqlTest();
		app = testApp;
		execute = testExecute;
		settingsRepository = app.get<SettingsRepository>(SETTINGS_REPOSITORY);
	});

	// @TODO this doesn't work yet, since the mocking of graphql is broken somewhere
	it.skip('should return the settings', async () => {
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
