// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'vitest';
import { PdfTemplateSetting, SettingsEntity } from '@/backend/entities/settings.entity';
import { prepareRepoTest } from '@/test/repo-test';
import type { SettingsRepository } from './interface';
import { SettingsOrmEntity } from './relational-orm-entity';
import { SettingsDynamodbRepository } from './settings.dynamodb-repository';
import { SettingsRelationalRepository } from './settings.relational-repository';

const repoTestCases = prepareRepoTest<SettingsRepository>({
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
        pdfStyles: 'bar',
      },
      async () => {}
    );
    await repo.save(
      new SettingsEntity({
        settingId: PdfTemplateSetting.settingId,
        data: JSON.stringify(initial.serializable()),
      })
    );
    // Get using the class-based API
    const found = await repo.getSetting(PdfTemplateSetting);
    expect(found).toBeInstanceOf(PdfTemplateSetting);
    expect(found.pdfTemplate).toBe('foo');
    expect(found.pdfStyles).toBe('bar');
    // Update and save
    found.pdfTemplate = 'baz';
    await found.save();
    const updated = await repo.getSetting(PdfTemplateSetting);
    expect(updated.pdfTemplate).toBe('baz');
  });
});
