import { randomUUID } from 'crypto';

import { DomainEntity, DomainEntityKeys } from './abstract.entity';

import { ObjectProperties } from '@/common/ts-helpers';

export class ProductEntity extends DomainEntity {
	public id!: string;
	public category!: string;
	public name!: string;
	public description?: string;
	public notes?: string;
	public unit?: string;
	public priceCents!: number;
	public taxPercentage!: number;
	public createdAt!: Date;
	public updatedAt!: Date;

	/**
	 * The expense in cents associated with this product (optional).
	 */
	public expenseCents?: number;

	/**
	 * A multiplicator for the expense (optional, defaults to 1).
	 */
	public expenseMultiplicator?: number;

	/**
	 * The expense category ID associated with this product (optional).
	 */
	public expenseCategoryId?: string;

	constructor(
		params: Omit<
			ObjectProperties<ProductEntity>,
			'id' | 'createdAt' | 'updatedAt' | DomainEntityKeys
		> &
			Partial<Pick<ProductEntity, 'id' | 'createdAt' | 'updatedAt'>>,
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
		if (params && 'expenseCategoryId' in params) {
			this.expenseCategoryId = params.expenseCategoryId;
		}
	}

	public update(
		params: Omit<
			ObjectProperties<ProductEntity>,
			'createdAt' | 'updatedAt' | 'id' | DomainEntityKeys
		>,
	): void {
		Object.assign(this, params);
		if ('expenseCategoryId' in params) {
			this.expenseCategoryId = params.expenseCategoryId;
		}
		this.updatedAt = new Date();
	}
}
