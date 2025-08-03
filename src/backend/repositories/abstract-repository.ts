import { injectable } from 'inversify';

import { DomainEntity as DomainBaseEntity } from '../entities/abstract.entity';
import type { EventBusService } from '../services/eventbus.service';

import { Logger } from '@/backend/services/logger.service';

export type AbstractRepositoryInterface<
	DomainEntity extends DomainBaseEntity,
	CreateArgs extends unknown[],
	Interface extends object,
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
	protected abstract eventBus: EventBusService;
	protected abstract logger: Logger;

	protected abstract generateEmptyItem(
		id: string,
		...args: CreateArgs
	): DomainEntity;

	protected abstract ormToDomainEntitySafe(
		ormEntity: Omit<OrmEntity, 'storeId'>,
	): DomainEntity;

	protected abstract domainToOrmEntity(
		domainEntity: DomainEntity,
	): Omit<OrmEntity, 'storeId'>;

	protected ormToDomainEntity(
		ormEntity:
			| {
					data: Omit<OrmEntity, 'storeId'>;
			  }
			| Omit<OrmEntity, 'storeId'>,
	): DomainEntity;
	protected ormToDomainEntity(
		ormEntity?:
			| {
					data?: Omit<OrmEntity, 'storeId'> | null;
			  }
			| Omit<OrmEntity, 'storeId'>
			| null,
	): DomainEntity | null;
	protected ormToDomainEntity(
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
		await entity.purgeEvents(async (event) => {
			this.logger.debug('Purging Outbox Event', { event });

			await this.eventBus.send(event.name, {
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
