import { Column, Entity, PrimaryColumn } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * Relational database entity for InventoryType.
 * Maps to the inventory_types table in the database.
 */
@OrmEntity
@Entity('inventory_types')
export class InventoryTypeOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  searchName!: string;

  @Column('int', { nullable: true })
  checkInterval?: number;

  @Column('varchar', { nullable: true })
  checkType?: string;

  @Column('json')
  properties!: string;

  @Column('text', { nullable: true })
  parent?: string;

  @Column('timestamp')
  createdAt!: Date;

  @Column('timestamp')
  updatedAt!: Date;
}
