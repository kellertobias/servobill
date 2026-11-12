import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { UserIdentity } from '@/backend/entities/user.entity';
import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for the users table (Postgres/SQLite).
 */
@OrmEntity
@Entity('users')
export class UserOrmEntity {
	@PrimaryColumn('varchar')
	id!: string;

	@Index({ unique: true })
	@Column('varchar')
	email!: string;

	@Column('varchar')
	name!: string;

	@Column('varchar')
	role!: string;

	@Column('text', { nullable: true })
	passwordHash?: string | null;

	@Column('json', { nullable: true })
	identities?: UserIdentity[] | null;

	@Column('boolean', { default: false })
	disabled!: boolean;

	@Column('text', { nullable: true })
	profilePictureUrl?: string | null;

	@Column('timestamp', { nullable: true })
	lastLoginAt?: Date | null;

	@Column('integer', { default: 0 })
	failedLoginCount!: number;

	@Column('timestamp', { nullable: true })
	lockedUntil?: Date | null;

	@Column('timestamp')
	createdAt!: Date;

	@Column('timestamp')
	updatedAt!: Date;
}
