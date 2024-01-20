import { DomainEntity, DomainEntityKeys } from './abstract.entity';

import { ObjectProperties } from '@/common/ts-helpers';

export class EmailEntity extends DomainEntity {
	public id!: string;
	public entityType!: string;
	public entityId!: string;
	public recipient!: string;
	public sentAt!: Date;

	constructor(params: Omit<ObjectProperties<EmailEntity>, DomainEntityKeys>) {
		super();
		Object.assign(this, params);
	}

	public update(
		params: Partial<
			Omit<ObjectProperties<EmailEntity>, 'id' | DomainEntityKeys>
		>,
	): void {
		Object.assign(this, params);
	}
}
