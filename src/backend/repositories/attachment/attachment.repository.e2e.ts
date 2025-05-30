import { describe, it, expect, beforeEach } from 'vitest';
import { prepareRepoTest } from '@/test/repo-test';
import { AttachmentRelationalRepository } from './attachment.relational-repository';
import { AttachmentDynamoDBRepository } from './attachment.dynamodb-repository';
import { AttachmentOrmEntity } from './relational-orm-entity';
import type { AttachmentCreateInput, AttachmentRepository } from './interface';

const repoTestCases = prepareRepoTest({
	name: 'Attachment',
	relational: AttachmentRelationalRepository,
	dynamodb: AttachmentDynamoDBRepository,
	relationalOrmEntity: AttachmentOrmEntity,
});

describe.each(repoTestCases)('$name', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, retrieve, update, and delete an attachment', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<AttachmentRepository>(RepositoryImplementation);
		const input: AttachmentCreateInput = {
			fileName: 'test.pdf',
			mimeType: 'application/pdf',
			size: 1234,
			s3Key: 's3/key/1',
			s3Bucket: 'bucket',
		};
		const entity = await repo.create(input);
		expect(entity.id).toBeDefined();
		const fetched = await repo.getById(entity.id);
		expect(fetched).toBeTruthy();
		expect(fetched?.fileName).toBe('test.pdf');
		entity.status = 'finished';
		await repo.save(entity);
		const updated = await repo.getById(entity.id);
		expect(updated?.status).toBe('finished');
		await repo.delete(entity.id);
		const deleted = await repo.getById(entity.id);
		expect(deleted).toBeNull();
	});

	it('should list by invoiceId, expenseId, inventoryId', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<AttachmentRepository>(RepositoryImplementation);

		const a1 = await repo.create({
			fileName: 'a1.pdf',
			mimeType: 'application/pdf',
			size: 100,
			s3Key: 'k1',
			s3Bucket: 'b',
		});
		const a2 = await repo.create({
			fileName: 'a2.pdf',
			mimeType: 'application/pdf',
			size: 100,
			s3Key: 'k2',
			s3Bucket: 'b',
		});
		const a3 = await repo.create({
			fileName: 'a3.pdf',
			mimeType: 'application/pdf',
			size: 100,
			s3Key: 'k3',
			s3Bucket: 'b',
		});
		a1.invoiceId = 'inv-2';
		a2.expenseId = 'exp-2';
		a3.inventoryId = 'invtry-2';
		await repo.save(a1);
		await repo.save(a2);
		await repo.save(a3);
		const byInvoice = await repo.listByQuery({ invoiceId: 'inv-2' });
		expect(byInvoice.some((a: any) => a.id === a1.id)).toBe(true);
		const byExpense = await repo.listByQuery({ expenseId: 'exp-2' });
		expect(byExpense.some((a: any) => a.id === a2.id)).toBe(true);
		const byInventory = await repo.listByQuery({ inventoryId: 'invtry-2' });
		expect(byInventory.some((a: any) => a.id === a3.id)).toBe(true);
	});

	it('should delete orphaned attachments', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<AttachmentRepository>(RepositoryImplementation);

		await repo.create({
			fileName: 'orphan.pdf',
			mimeType: 'application/pdf',
			size: 100,
			s3Key: 'k4',
			s3Bucket: 'b',
		});
		const deletedCount = await repo.deleteOrphaned();
		expect(typeof deletedCount).toBe('number');
	});
});
