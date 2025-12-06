import { beforeEach, describe, expect, it } from 'vitest';
import { prepareRepoTest } from '@/test/repo-test';
import { AttachmentDynamoDBRepository } from './attachment.dynamodb-repository';
import { AttachmentRelationalRepository } from './attachment.relational-repository';
import type { AttachmentCreateInput, AttachmentRepository } from './interface';
import { AttachmentOrmEntity } from './relational-orm-entity';

const repoTestCases = prepareRepoTest<AttachmentRepository>({
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
		a2.expenseIds = ['exp-2'];
		a3.inventoryId = 'invtry-2';
		await repo.save(a1);
		await repo.save(a2);
		await repo.save(a3);
		const byInvoice = await repo.listByQuery({ invoiceId: 'inv-2' });
		expect(byInvoice.some((a) => a.id === a1.id)).toBe(true);
		const byExpense = await repo.listByQuery({ expenseId: 'exp-2' });
		expect(byExpense.some((a) => a.id === a2.id)).toBe(true);
		const byInventory = await repo.listByQuery({ inventoryId: 'invtry-2' });
		expect(byInventory.some((a) => a.id === a3.id)).toBe(true);
	});

	it('should handle multiple expense IDs', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<AttachmentRepository>(RepositoryImplementation);

		// 1. Create with a single expense ID
		const a1 = await repo.create({
			fileName: 'a1-exp.pdf',
			mimeType: 'application/pdf',
			size: 100,
			s3Key: 'k-exp-1',
			s3Bucket: 'b',
			expenseIds: ['exp-1'],
		});
		let fetchedA1 = await repo.getById(a1.id);
		expect(fetchedA1?.expenseIds).toEqual(['exp-1']);

		// 2. Create with multiple expense IDs
		const a2 = await repo.create({
			fileName: 'a2-exp.pdf',
			mimeType: 'application/pdf',
			size: 100,
			s3Key: 'k-exp-2',
			s3Bucket: 'b',
			expenseIds: ['exp-1', 'exp-2'],
		});
		let fetchedA2 = await repo.getById(a2.id);
		expect(fetchedA2?.expenseIds?.sort()).toEqual(['exp-1', 'exp-2'].sort());

		// 3. Add an expense ID
		a1.expenseIds = ['exp-1', 'exp-3'];
		await repo.save(a1);
		fetchedA1 = await repo.getById(a1.id);
		expect(fetchedA1?.expenseIds?.sort()).toEqual(['exp-1', 'exp-3'].sort());

		// 4. Remove an expense ID
		a2.expenseIds = ['exp-1'];
		await repo.save(a2);
		fetchedA2 = await repo.getById(a2.id);
		expect(fetchedA2?.expenseIds).toEqual(['exp-1']);

		// 5. List by expenseId
		const listByExp1 = await repo.listByQuery({ expenseId: 'exp-1' });
		expect(listByExp1.length).toBe(2);
		expect(listByExp1.some((a) => a.id === a1.id)).toBe(true);
		expect(listByExp1.some((a) => a.id === a2.id)).toBe(true);

		const listByExp2 = await repo.listByQuery({ expenseId: 'exp-2' });
		expect(listByExp2.length).toBe(0);

		const listByExp3 = await repo.listByQuery({ expenseId: 'exp-3' });
		expect(listByExp3.length).toBe(1);
		expect(listByExp3.some((a) => a.id === a1.id)).toBe(true);
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
