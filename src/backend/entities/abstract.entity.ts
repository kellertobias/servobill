/* eslint-disable @typescript-eslint/no-explicit-any */
export class DomainEvent<T = any> {
	public readonly occurredOn: Date;

	constructor(
		public readonly aggregateId: string,
		public readonly name: string,
		public readonly data: T,
	) {
		this.occurredOn = new Date();
	}
}

export abstract class DomainEntity {
	public abstract id: string;
	public events: DomainEvent[] = [];
	protected addEvent(event: DomainEvent) {
		this.events.push(event);
	}
	public async purgeEvents(send: (event: DomainEvent) => Promise<void>) {
		for (const event of this.events) {
			await send(event);
		}
		this.events = [];
	}
}

export type DomainEntityKeys = keyof Omit<DomainEntity, 'id'>;
