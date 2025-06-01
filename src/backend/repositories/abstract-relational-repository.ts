import { randomUUID } from 'node:crypto';

import {
	Repository,
	EntityManager,
	ObjectLiteral,
	DeepPartial,
	FindOptionsWhere,
} from 'typeorm';

import { DomainEntity as DomainBaseEntity } from '../entities/abstract.entity';

import { AbstractRepository } from './abstract-repository';

import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { DeferredPromise } from '@/common/deferred';

/**
 * Abstract base repository for relational DB-backed entities using TypeORM (Postgres/SQLite).
 * Extend this class for each entity to implement relational DB-specific logic.
 *
 * @template OrmEntity - The TypeORM entity type.
 * @template DomainEntity - The domain entity type.
 * @template CreateArgs - Arguments for creating a new domain entity.
 */
export abstract class AbstractRelationalRepository<
	OrmEntity extends ObjectLiteral,
	DomainEntity extends DomainBaseEntity,
	CreateArgs extends unknown[] = [],
> extends AbstractRepository<OrmEntity, DomainEntity, CreateArgs> {
	protected initialized = new DeferredPromise<void>();
	/**
	 * TypeORM repository for the entity.
	 */
	public repository?: Repository<OrmEntity>;

	/**
	 * TypeORM entity manager (optional, for advanced operations).
	 */
	public entityManager?: EntityManager;

	/**
	 * Constructor sets up repository and entity manager from RelationalDbService.
	 * @param db RelationalDbService instance
	 * @param ormEntityClass The ORM entity class for this repository
	 */
	constructor({
		db,
		ormEntityClass,
	}: {
		db: RelationalDbService;
		ormEntityClass: { new (): OrmEntity };
	}) {
		super();
		db.initialize()
			.then(() => {
				this.repository = db.getRepository(ormEntityClass);
				this.entityManager = db.getEntityManager();
				this.initialized.resolve();

				return;
			})
			.catch((error) => {
				this.initialized.reject(error);
			});
	}

	/**
	 * Gets a domain entity by its primary key.
	 */
	public async getById(id: string): Promise<DomainEntity | null> {
		await this.initialized.promise;
		const ormEntity = await this.repository?.findOneBy({
			id,
		} as unknown as FindOptionsWhere<OrmEntity>);
		return ormEntity ? this.ormToDomainEntity(ormEntity) : null;
	}

	/**
	 * Saves a domain entity to the database.
	 */
	public async save(domainEntity: DomainEntity): Promise<void> {
		await this.initialized.promise;
		const ormEntity = this.domainToOrmEntity(
			domainEntity,
		) as DeepPartial<OrmEntity>;
		await this.repository?.save([ormEntity]);

		await this.purgeOutbox(domainEntity);
	}

	/**
	 * Deletes a domain entity by its primary key.
	 */
	public async delete(id: string): Promise<void> {
		await this.initialized.promise;
		await this.repository?.delete(id);
	}

	public async createWithId(
		entityId: string,
		...args: CreateArgs
	): Promise<DomainEntity> {
		await this.initialized.promise;

		const entity = this.generateEmptyItem(entityId, ...args);
		const data = this.domainToOrmEntity(entity);

		await this.repository?.save([data as DeepPartial<OrmEntity>]);
		await this.purgeOutbox(entity);

		// Return the domain entity from the ORM entity
		return this.ormToDomainEntity(data as OrmEntity);
	}

	public async create(...args: CreateArgs): Promise<DomainEntity> {
		await this.initialized.promise;

		const entityId = randomUUID().toString();

		const entity = this.generateEmptyItem(entityId, ...args);
		const data = this.domainToOrmEntity(entity);

		await this.repository?.save([data as DeepPartial<OrmEntity>]);
		await this.purgeOutbox(entity);

		// Return the domain entity from the ORM entity
		return this.ormToDomainEntity(data as OrmEntity);
	}
}
