import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for the audit_log table (Postgres/SQLite).
 */
@OrmEntity
@Entity('audit_log')
@Index(['createdAt', 'id'])
export class AuditLogOrmEntity {
	@PrimaryColumn('varchar')
	id!: string;

	@Column('timestamp')
	createdAt!: Date;

	@Index()
	@Column('varchar', { nullable: true })
	actorId?: string | null;

	@Column('varchar', { nullable: true })
	actorEmail?: string | null;

	@Column('varchar', { nullable: true })
	actorName?: string | null;

	@Column('varchar')
	action!: string;

	@Index()
	@Column('varchar', { nullable: true })
	entityType?: string | null;

	@Column('varchar', { nullable: true })
	entityId?: string | null;

	@Column('boolean')
	success!: boolean;

	@Column('json', { nullable: true })
	details?: Record<string, unknown> | null;

	@Column('varchar', { nullable: true })
	ipAddress?: string | null;
}
