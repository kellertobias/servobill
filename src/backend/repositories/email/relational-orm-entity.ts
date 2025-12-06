import { Column, Entity, PrimaryColumn } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for Email, used in relational databases.
 * Mirrors the EmailEntity and DynamoDB schema.
 */
@OrmEntity
@Entity('email')
export class EmailOrmEntity {
  /** Unique identifier for the email */
  @PrimaryColumn('text')
  id!: string;

  /** Type of the related entity (e.g., invoice, customer) */
  @Column('text')
  entityType!: string;

  /** ID of the related entity */
  @Column('text')
  entityId!: string;

  /** Recipient email address */
  @Column('text')
  recipient!: string;

  /** When the email was sent */
  @Column('timestamp', { nullable: false })
  sentAt!: Date;
}
