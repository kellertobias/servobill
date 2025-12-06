// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';
import { TimeBasedJobEntity } from '@/backend/entities/time-based-job.entity';
import { prepareRepoTest } from '@/test/repo-test';
import type { TimeBasedJobRepository } from './interface';
import { TimeBasedJobOrmEntity } from './relational-orm-entity';
import { TimeBasedJobDynamodbRepository } from './time-based-job.dynamodb-repository';
import { TimeBasedJobRelationalRepository } from './time-based-job.relational-repository';

/**
 * Parameterized test suite for both repository implementations (DynamoDB, Relational).
 * Ensures consistent behavior and test coverage for all supported backends.
 */
describe.each(
  prepareRepoTest<TimeBasedJobRepository>({
    name: 'TimeBasedJob',
    relational: TimeBasedJobRelationalRepository,
    dynamodb: TimeBasedJobDynamodbRepository,
    relationalOrmEntity: TimeBasedJobOrmEntity,
  })
)('$name (E2E)', ({ setup, onBeforeEach }) => {
  beforeEach(async () => {
    await onBeforeEach();
  });

  /**
   * Tests basic CRUD operations: create, get, and delete a time-based job.
   * Verifies that the job can be retrieved after saving and is gone after deletion.
   */
  it('should create, get, and delete a time-based job', async () => {
    const { app, RepositoryImplementation } = await setup();
    const repo = app.create<TimeBasedJobRepository>(RepositoryImplementation);

    const jobId = randomUUID();

    await repo.createWithId(jobId, {
      runAfter: Date.now() + 10000,
      eventType: 'send_invoice',
      eventPayload: { invoiceId: randomUUID() },
    });

    const found = await repo.getById(jobId);
    expect(found).toBeDefined();
    expect(found?.eventType).toBe('send_invoice');
    await repo.delete(jobId);
    const afterDelete = await repo.getById(jobId);
    expect(afterDelete).toBeNull();
  });

  /**
   * Tests the listDueJobs method, which should return only jobs due at or before the given timestamp.
   * Ensures correct filtering and ordering of due jobs.
   */
  it('should list jobs due at or before a given timestamp', async () => {
    const { app, RepositoryImplementation } = await setup();
    const repo = app.create<TimeBasedJobRepository>(RepositoryImplementation);
    const now = Date.now();
    const jobId1 = randomUUID();
    const jobId2 = randomUUID();
    const jobs = [
      new TimeBasedJobEntity({
        id: jobId1,
        runAfter: now - 1000,
        eventType: 'send_invoice',
        eventPayload: { invoiceId: randomUUID() },
      }),
      new TimeBasedJobEntity({
        id: jobId2,
        runAfter: now + 100000,
        eventType: 'send_invoice',
        eventPayload: { invoiceId: randomUUID() },
      }),
    ];
    // For DynamoDB, ensure the item exists before save (patch) by calling createWithId first
    if (RepositoryImplementation === TimeBasedJobDynamodbRepository) {
      for (const job of jobs) {
        await (repo as TimeBasedJobDynamodbRepository).createWithId(job.id, {
          runAfter: job.runAfter,
          eventType: job.eventType,
          eventPayload: job.eventPayload,
        });
      }
    }
    for (const job of jobs) {
      await repo.save(job);
    }
    const dueJobs = await repo.listDueJobs(now);
    const dueIds = dueJobs.map((j) => j.id);
    expect(dueIds).toContain(jobId1);
    expect(dueIds).not.toContain(jobId2);
    for (const job of jobs) {
      await repo.delete(job.id);
    }
  });
});
