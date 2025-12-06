import type { ObjectProperties } from '@/common/ts-helpers';
import { DomainEntity, type DomainEntityKeys } from './abstract.entity';

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
		Object.assign(this, {
			id: this.id,
			entityType: this.entityType,
			entityId: this.entityId,
			recipient: this.recipient,
			sentAt: this.sentAt,
			...params,
		});
	}
}
