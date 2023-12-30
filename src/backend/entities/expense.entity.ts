import { randomUUID } from 'crypto';

import { DomainEntity, DomainEntityKeys } from './abstract.entity';

import { ObjectProperties } from '@/common/ts-helpers';

export class ExpenseEntity extends DomainEntity {
	public id!: string;
	public name!: string;
	public description?: string;
	public notes?: string;
	public expendedCents!: number;
	public taxCents?: number;
	public createdAt!: Date;
	public updatedAt!: Date;
	public expendedAt!: Date;

	constructor(
		params: Omit<
			ObjectProperties<ExpenseEntity>,
			'id' | 'createdAt' | 'updatedAt' | DomainEntityKeys
		> &
			Partial<Pick<ExpenseEntity, 'id' | 'createdAt' | 'updatedAt'>>,
	) {
		super();
		Object.assign(this, params);
		if (!this.id) {
			this.id = randomUUID().toString();
		}
		if (!this.createdAt) {
			this.createdAt = new Date();
		}
		if (!this.updatedAt) {
			this.updatedAt = new Date();
		}
	}

	public update(
		params: Omit<
			ObjectProperties<ExpenseEntity>,
			'createdAt' | 'updatedAt' | 'id' | DomainEntityKeys
		>,
	): void {
		Object.assign(this, params);
		this.updatedAt = new Date();
	}
}
