import { DomainEntity, DomainEntityKeys } from './abstract.entity';

/**
 * Represents the state of an inventory item
 */
export enum InventoryItemState {
	NEW = 'NEW',
	DEFAULT = 'DEFAULT',
	BROKEN = 'BROKEN',
	REMOVED = 'REMOVED',
}

/**
 * Represents the type of history entry for an inventory item
 */
export enum InventoryHistoryType {
	NOTE = 'NOTE',
	CHECK = 'CHECK',
	STATE_CHANGE = 'STATE_CHANGE',
}

/**
 * Represents the state of a check for an inventory item
 */
export enum InventoryCheckState {
	PASS = 'PASS',
	RECHECK = 'RECHECK',
	FAIL = 'FAIL',
}

/**
 * Represents a history entry for an inventory item
 */
export interface InventoryHistoryEntry {
	type: InventoryHistoryType;
	state?: InventoryCheckState;
	date: Date;
	note?: string;
}

/**
 * InventoryItem entity representing physical items in inventory
 * Tracks item state, location, type, and maintenance history
 */
export class InventoryItemEntity extends DomainEntity {
	public id!: string;
	public typeId?: string;
	public name?: string;
	public barcode?: string;
	public locationId!: string;
	public state!: InventoryItemState;
	public properties!: [string, string][];
	public nextCheck!: Date;
	public lastScanned!: Date;
	public history!: InventoryHistoryEntry[];
	public createdAt!: Date;
	public updatedAt!: Date;

	constructor(props: Partial<Omit<InventoryItemEntity, DomainEntityKeys>>) {
		super();
		Object.assign(this, props);

		// Initialize default values
		if (!this.history) {
			this.history = [];
		}
		if (!this.properties) {
			this.properties = [];
		}
		if (!this.state) {
			this.state = InventoryItemState.NEW;
		}
		if (!this.createdAt) {
			this.createdAt = new Date();
		}
		if (!this.updatedAt) {
			this.updatedAt = new Date();
		}
	}

	/**
	 * Updates the state of the inventory item and adds a history entry
	 * @param newState The new state to set
	 * @param note Optional note about the state change
	 */
	public updateState(newState: InventoryItemState, note?: string): void {
		if (this.state === newState) {
			return;
		}

		this.state = newState;
		this.updatedAt = new Date();

		// Add history entry for state change
		this.history.push({
			type: InventoryHistoryType.STATE_CHANGE,
			date: new Date(),
			note: note || `State changed from ${this.state} to ${newState}`,
		});
	}

	/**
	 * Adds a check entry to the history
	 * @param checkState The result of the check
	 * @param note Optional note about the check
	 */
	public addCheck(checkState: InventoryCheckState, note?: string): void {
		this.lastScanned = new Date();
		this.updatedAt = new Date();

		this.history.push({
			type: InventoryHistoryType.CHECK,
			state: checkState,
			date: new Date(),
			note,
		});
	}

	/**
	 * Adds a note to the history
	 * @param note The note to add
	 */
	public addNote(note: string): void {
		this.updatedAt = new Date();

		this.history.push({
			type: InventoryHistoryType.NOTE,
			date: new Date(),
			note,
		});
	}

	/**
	 * Updates the next check date
	 * @param nextCheck The new next check date
	 */
	public updateNextCheck(nextCheck: Date): void {
		this.nextCheck = nextCheck;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the properties of the inventory item
	 * @param properties The new properties array
	 */
	public updateProperties(properties: [string, string][]): void {
		this.properties = properties;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the location of the inventory item
	 * @param locationId The new location ID
	 * @param note Optional note about the location change
	 */
	public updateLocation(locationId: string, note?: string): void {
		if (this.locationId === locationId) {
			return;
		}

		const oldLocation = this.locationId;
		this.locationId = locationId;
		this.updatedAt = new Date();

		// Add history entry for location change
		this.history.push({
			type: InventoryHistoryType.NOTE,
			date: new Date(),
			note: note || `Location changed from ${oldLocation} to ${locationId}`,
		});
	}

	/**
	 * Updates the name of the inventory item
	 * @param name The new name
	 */
	public updateName(name: string): void {
		this.name = name;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the type ID of the inventory item
	 * @param typeId The new type ID (can be undefined for one-off items)
	 */
	public updateTypeId(typeId?: string): void {
		this.typeId = typeId;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the barcode of the inventory item
	 * @param barcode The new barcode (optional)
	 */
	public updateBarcode(barcode?: string): void {
		this.barcode = barcode;
		this.updatedAt = new Date();
	}

	/**
	 * Checks if the item is overdue for its next check
	 * @returns true if the item is overdue, false otherwise
	 */
	public isOverdue(): boolean {
		return this.nextCheck < new Date();
	}

	/**
	 * Gets the most recent check entry from history
	 * @returns The most recent check entry or undefined if none exists
	 */
	public getLastCheck(): InventoryHistoryEntry | undefined {
		return this.history
			.filter((entry) => entry.type === InventoryHistoryType.CHECK)
			.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
	}
}
