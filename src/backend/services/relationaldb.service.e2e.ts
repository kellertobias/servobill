import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RelationalDbService } from './relationaldb.service';
import { ConfigService, DatabaseType } from './config.service';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// These are imported from the testcontainers setup
import {
	POSTGRES_PORT,
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_DB,
} from '../../../vitest.setup-e2e';

/**
 * Minimal TypeORM entity for testing
 */
@Entity()
class TestEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column('text')
	value!: string;
}

describe('RelationalDbService (Postgres) E2E', () => {
	let dbService: RelationalDbService;

	beforeAll(async () => {
		// Patch the OrmEntityRegistry to include our test entity BEFORE service instantiation
		const { OrmEntityRegistry } = await import('@/common/orm-entity-registry');
		OrmEntityRegistry.push(TestEntity);
		// Create config after POSTGRES_PORT is set
		const config = {
			tables: {
				databaseType: DatabaseType.POSTGRES,
				postgres: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`,
			},
		};
		// Wait a moment to ensure the container is ready
		await new Promise((res) => setTimeout(res, 1000));
		dbService = new RelationalDbService({
			...config,
		} as unknown as ConfigService);
		await dbService.initialize();
	});

	afterAll(async () => {
		// Clean up test data and close connection
		const repo = dbService.getRepository(TestEntity);
		await repo.clear();
		dbService['dataSource'].isInitialized &&
			(await dbService['dataSource'].destroy());
	});

	it('should insert and retrieve a row', async () => {
		const repo = dbService.getRepository(TestEntity);
		const saved = await repo.save({ value: 'hello' });
		expect(saved.id).toBeDefined();
		const found = await repo.findOneBy({ id: saved.id });
		expect(found).toBeDefined();
		expect(found?.value).toBe('hello');
	});
});
