import { randomUUID } from 'node:crypto';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class DomainEvent<T = any> {
	public readonly id: string;
	public readonly occurredOn: Date;

	constructor(
		public readonly aggregateId: string,
		public readonly name: string,
		public readonly data: T,
	) {
		this.id = randomUUID();
		this.occurredOn = new Date();
	}
}

export abstract class DomainEntity {
	private sentEvents = new Set<string>();
	public abstract id: string;
	public events: DomainEvent[] = [];
	protected addEvent(event: DomainEvent) {
		if (this.sentEvents.has(event.id)) {
			return;
		}
		this.events.push(event);
	}
	public async purgeEvents(send: (event: DomainEvent) => Promise<void>) {
		for (const event of this.events) {
			if (this.sentEvents.has(event.id)) {
				continue;
			}
			this.sentEvents.add(event.id);
			await send(event);
		}
		this.events = [];
	}
}

export type DomainEntityKeys = keyof Omit<DomainEntity, 'id'>;
