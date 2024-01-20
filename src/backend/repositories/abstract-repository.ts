import { randomUUID } from 'crypto';

import { Entity, Schema } from 'electrodb';
import { injectable } from 'inversify';

import { DomainEntity as DomainBaseEntity } from '../entities/abstract.entity';
import { EventBusService } from '../services/eventbus.service';

import { Logger } from '@/backend/services/logger.service';
import { DefaultContainer } from '@/common/di';

@injectable()
export abstract class AbstractRepository<
	OrmEntity,
	DomainEntity extends DomainBaseEntity,
	CreateArgs extends unknown[],
	S extends Schema<A, F, C>,
	A extends string = string,
	F extends string = string,
	C extends string = string,
> {
	protected abstract logger: Logger;
	protected store!: Entity<string, string, string, S>;

	protected abstract mainIdName: string;

	protected abstract storeId: string;

	protected abstract generateEmptyItem(
		id: string,
		...args: CreateArgs
	): DomainEntity;

	protected abstract ormToDomainEntitySafe(
		ormEntity: Omit<OrmEntity, 'storeId'>,
	): DomainEntity;

	public abstract domainToOrmEntity(
		domainEntity: DomainEntity,
	): Omit<OrmEntity, 'storeId'>;

	public ormToDomainEntity(
		ormEntity:
			| {
					data: Omit<OrmEntity, 'storeId'>;
			  }
			| Omit<OrmEntity, 'storeId'>,
	): DomainEntity;
	public ormToDomainEntity(
		ormEntity?:
			| {
					data?: Omit<OrmEntity, 'storeId'> | null;
			  }
			| Omit<OrmEntity, 'storeId'>
			| null,
	): DomainEntity | null;
	public ormToDomainEntity(
		ormEntity?:
			| {
					data?: Omit<OrmEntity, 'storeId'> | null;
			  }
			| Omit<OrmEntity, 'storeId'>
			| null,
	): DomainEntity | null {
		if (!ormEntity) {
			return null;
		}
		const ormEntityWrapped = ormEntity as {
			data?: Omit<OrmEntity, 'storeId'> | null;
		};
		const ormEntityUnwrapped = ormEntity as Omit<OrmEntity, 'storeId'>;

		const entity = Object.prototype.hasOwnProperty.call(
			ormEntityWrapped,
			'data',
		)
			? ormEntityWrapped.data
			: (ormEntityUnwrapped as Omit<OrmEntity, 'storeId'> | null);

		if (!entity) {
			return null;
		}
		return this.ormToDomainEntitySafe(entity);
	}

	public async getById(id: string): Promise<DomainEntity | null> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const store = this.store as Entity<string, string, string, any>;
		const ormEntity = await store
			.get({
				[this.mainIdName]: id,
				storeId: this.storeId,
			})
			.go();
		const data = this.ormToDomainEntity(ormEntity as OrmEntity);
		return data;
	}

	private async purgeOutbox(entity: DomainEntity): Promise<void> {
		this.logger.debug('Purging Outbox');
		const eventBus = DefaultContainer.get(EventBusService);
		entity.purgeEvents(async (event) => {
			this.logger.debug('Purging Outbox Event', { event });

			await eventBus.send(event.name, {
				aggregateId: event.aggregateId,
				...event.data,
			});
		});
	}

	public async create(...args: CreateArgs): Promise<DomainEntity> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const store = this.store as Entity<string, string, string, any>;
		const entityId = randomUUID().toString();
		const entity = this.generateEmptyItem(entityId, ...args);

		const data = this.domainToOrmEntity(entity);
		await store.create({ ...data, storeId: this.storeId }).go();
		await this.purgeOutbox(entity);
		return this.ormToDomainEntity({ data });
	}

	public async save(entity: DomainEntity): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const store = this.store as Entity<string, string, string, any>;

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const data = this.domainToOrmEntity(entity);

		delete data[this.mainIdName as keyof typeof data];
		await store
			.patch({
				[this.mainIdName]: entity.id,
				storeId: this.storeId,
			})
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.set(data as any)
			.go();
		await this.purgeOutbox(entity);
	}

	public async delete(id: string): Promise<void> {
		const entity = await this.getById(id);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const store = this.store as Entity<string, string, string, any>;
		await store
			.delete({
				[this.mainIdName]: id,
				storeId: this.storeId,
			})
			.go();
		if (entity) {
			await this.purgeOutbox(entity);
		}
	}
}
