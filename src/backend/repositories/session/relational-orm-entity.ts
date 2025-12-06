import { Column, Entity, PrimaryColumn } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for the Session table (relational DB).
 */
@OrmEntity
@Entity('sessions')
export class SessionOrmEntity {
	/** Unique identifier for the session. */
	@PrimaryColumn('varchar')
	sessionId!: string;

	/** The userId associated with this session. */
	@Column('varchar')
	userId!: string;

	/** Renewal token/id for session renewal. */
	@Column('varchar')
	renewalId!: string;

	/** Expiration date/time for the session. */
	@Column('timestamptz')
	expiresAt!: Date;

	/** Creation date/time for the session. */
	@Column('timestamptz')
	createdAt!: Date;

	/** Last update date/time for the session. */
	@Column('timestamptz')
	updatedAt!: Date;
}
