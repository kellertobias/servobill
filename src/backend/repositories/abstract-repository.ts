import { randomUUID } from 'crypto';

import { Entity, Schema } from 'electrodb';
import { injectable } from 'inversify';

import { DomainEntity as DomainBaseEntity } from '../entities/abstract.entity';
import { EventBusService } from '../services/eventbus.service';
import { Span } from '../instrumentation';

import { Logger } from '@/backend/services/logger.service';
import { DefaultContainer } from '@/common/di';

export type AbstractRepositoryInterface<
	DomainEntity extends DomainBaseEntity,
	CreateArgs extends unknown[],
	Interface extends {},
> = {
	getById(id: string): Promise<DomainEntity | null>;
	createWithId(entityId: string, ...args: CreateArgs): Promise<DomainEntity>;
	create(...args: CreateArgs): Promise<DomainEntity>;
	save(entity: DomainEntity): Promise<void>;
	delete(id: string): Promise<void>;
} & Interface;

@injectable()
export abstract class AbstractRepository<
	OrmEntity,
	DomainEntity extends DomainBaseEntity,
	CreateArgs extends unknown[],
> {
	protected abstract logger: Logger;

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

	protected async purgeOutbox(entity: DomainEntity): Promise<void> {
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

	public abstract getById(id: string): Promise<DomainEntity | null>;
	public abstract createWithId(
		entityId: string,
		...args: CreateArgs
	): Promise<DomainEntity>;
	public abstract create(...args: CreateArgs): Promise<DomainEntity>;
	public abstract save(entity: DomainEntity): Promise<void>;
	public abstract delete(id: string): Promise<void>;
}
