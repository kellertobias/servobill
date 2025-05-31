// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';

import { CustomerDynamodbRepository } from './customer.dynamodb-repository';
import { CustomerRelationalRepository } from './customer.relational-repository';
import { CustomerOrmEntity } from './relational-orm-entity';
import { CustomerRepository } from './interface';

import { CustomerEntity } from '@/backend/entities/customer.entity';
import { prepareRepoTest } from '@/test/repo-test';

/**
 * Parameterized test suite for both repository implementations.
 */
const repoTestCases = prepareRepoTest<CustomerRepository>({
	name: 'Customer',
	relational: CustomerRelationalRepository,
	dynamodb: CustomerDynamodbRepository,
	relationalOrmEntity: CustomerOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and delete a customer', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<CustomerRepository>(RepositoryImplementation);

		const customer = new CustomerEntity({
			id: 'c1',
			name: 'Test Customer',
			customerNumber: 'CUST-001',
			showContact: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await repo.createWithId(customer.id);

		await repo.save(customer);
		const found = await repo.getById('c1');
		expect(found).toBeDefined();
		expect(found?.name).toBe('Test Customer');
		await repo.delete('c1');
		const afterDelete = await repo.getById('c1');
		expect(afterDelete).toBeNull();
	});

	it('should list customers using listByQuery', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<CustomerRepository>(RepositoryImplementation);
		const customers = [
			new CustomerEntity({
				id: 'c2',
				name: 'Alice',
				customerNumber: 'CUST-002',
				showContact: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
			new CustomerEntity({
				id: 'c3',
				name: 'Bob',
				customerNumber: 'CUST-003',
				showContact: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
			new CustomerEntity({
				id: 'c4',
				name: 'Charlie',
				customerNumber: 'CUST-004',
				showContact: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		];
		for (const c of customers) {
			await repo.createWithId(c.id);

			await repo.save(c);
		}
		const all = await repo.listByQuery({});
		const allIds = all.map((c: CustomerEntity) => c.id);
		expect(allIds).toEqual(expect.arrayContaining(['c2', 'c3', 'c4']));
		const searchAlice = await repo.listByQuery({ where: { search: 'ali' } });
		expect(searchAlice.length).toBeGreaterThan(0);
		expect(searchAlice[0].name.toLowerCase()).toContain('alice');
		const searchNone = await repo.listByQuery({ where: { search: 'xyz' } });
		expect(searchNone.length).toBe(0);
		for (const c of customers) {
			await repo.delete(c.id);
		}
	});
});
