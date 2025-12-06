import { randomUUID } from 'node:crypto';

import type { Entity, Schema } from 'electrodb';
import { injectable } from 'inversify';

import type { DomainEntity as DomainBaseEntity } from '../entities/abstract.entity';
import { Span } from '../instrumentation';

import { AbstractRepository } from './abstract-repository';

@injectable()
export abstract class AbstractDynamodbRepository<
  OrmEntity,
  DomainEntity extends DomainBaseEntity,
  CreateArgs extends unknown[],
  S extends Schema<A, F, C>,
  A extends string = string,
  F extends string = string,
  C extends string = string,
> extends AbstractRepository<OrmEntity, DomainEntity, CreateArgs> {
  protected store!: Entity<string, string, string, S>;

  protected abstract mainIdName: string;
  protected abstract storeId: string;

  @Span('Repository.getById')
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

  @Span('Repository.createWithId')
  public async createWithId(entityId: string, ...args: CreateArgs): Promise<DomainEntity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = this.store as Entity<string, string, string, any>;
    const entity = this.generateEmptyItem(entityId, ...args);

    const data = this.domainToOrmEntity(entity);
    await store.create({ ...data, storeId: this.storeId }).go();
    await this.purgeOutbox(entity);
    return this.ormToDomainEntity({ data });
  }

  @Span('Repository.create')
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

  @Span('Repository.save')
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

  @Span('Repository.delete')
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
