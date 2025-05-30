import { randomUUID } from 'crypto';

import { DomainEntity, DomainEntityKeys } from './abstract.entity';

import { ObjectProperties } from '@/common/ts-helpers';

/**
 * Represents an expense associated with a product.
 */
export type ProductExpense = {
	name: string;
	price: number;
	multiplicator: number;
	categoryId?: string;
};

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
	 * List of expenses associated with this product (optional).
	 */
	public expenses?: ProductExpense[];

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
	}

	public update(
		params: Omit<
			ObjectProperties<ProductEntity>,
			'createdAt' | 'updatedAt' | 'id' | DomainEntityKeys
		>,
	): void {
		Object.assign(this, params);
		this.updatedAt = new Date();
	}
}
