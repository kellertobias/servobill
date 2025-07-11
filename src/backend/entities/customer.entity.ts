import { randomUUID } from 'crypto';

import { DomainEntity, DomainEntityKeys } from './abstract.entity';
import { CompanyDataSetting } from './settings.entity';

import { ObjectProperties } from '@/common/ts-helpers';

export class CustomerEntity extends DomainEntity {
	public id!: string;
	public name!: string;
	public customerNumber!: string;
	public contactName?: string;
	public showContact!: boolean;
	public email?: string;
	public street?: string;
	public zip?: string;
	public city?: string;
	public state?: string;
	public notes?: string;
	/**
	 * The ISO 3166-1 alpha-2 country code (e.g. 'DE', 'US') representing the customer's country.
	 * Used for address formatting, tax calculations, and compliance.
	 * Should match the type used in CompanyDataSetting.companyData.countryCode.
	 */
	public countryCode?: CompanyDataSetting['companyData']['countryCode'];
	public createdAt!: Date;
	public updatedAt!: Date;

	constructor(
		params: Omit<
			ObjectProperties<CustomerEntity>,
			'id' | 'createdAt' | 'updatedAt' | DomainEntityKeys
		> &
			Partial<Pick<CustomerEntity, 'id' | 'createdAt' | 'updatedAt'>>,
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
			ObjectProperties<CustomerEntity>,
			'createdAt' | 'updatedAt' | 'id' | 'customerNumber' | DomainEntityKeys
		>,
	): void {
		Object.assign(this, params);
		this.updatedAt = new Date();
	}
}
