// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
	SettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import { SettingsDynamodbRepository } from './settings.dynamodb-repository';
import { SettingsRelationalRepository } from './settings.relational-repository';
import { SettingsRepository } from './interface';
import { SettingsOrmEntity } from './relational-orm-entity';
import { prepareRepoTest } from '@/test/repo-test';

const repoTestCases = prepareRepoTest({
	name: 'Settings',
	relational: SettingsRelationalRepository,
	dynamodb: SettingsDynamodbRepository,
	relationalOrmEntity: SettingsOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and update a settings record using the class-based API', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<SettingsRepository>(RepositoryImplementation);
		// Create and save a PdfTemplateSetting
		const initial = new PdfTemplateSetting(
			{
				pdfTemplate: 'foo',
				emailSubjectInvoices: 'bar',
			},
			async () => {},
		);
		await repo.save(
			new SettingsEntity({
				settingId: PdfTemplateSetting.settingId,
				data: JSON.stringify(initial.serializable()),
			}),
		);
		// Get using the class-based API
		const found = await repo.getSetting(PdfTemplateSetting);
		expect(found).toBeInstanceOf(PdfTemplateSetting);
		expect(found.pdfTemplate).toBe('foo');
		expect(found.emailSubjectInvoices).toBe('bar');
		// Update and save
		found.pdfTemplate = 'baz';
		await found.save();
		const updated = await repo.getSetting(PdfTemplateSetting);
		expect(updated.pdfTemplate).toBe('baz');
	});
});
