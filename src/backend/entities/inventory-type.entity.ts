import { DomainEntity, type DomainEntityKeys } from './abstract.entity';

/**
 * InventoryType entity representing categories/types of inventory items
 * Supports hierarchical structure with parent-child relationships
 * Used as part of the settings to define available item types
 */
export class InventoryTypeEntity extends DomainEntity {
	public id!: string;
	public name!: string;
	public checkInterval?: number; // in days
	public checkType?: string;
	public properties!: string[];
	public parent?: string; // UUID of parent inventory type
	public createdAt!: Date;
	public updatedAt!: Date;

	constructor(props: Partial<Omit<InventoryTypeEntity, DomainEntityKeys>>) {
		super();
		Object.assign(this, props);

		// Initialize default values
		if (!this.properties) {
			this.properties = [];
		}
		if (!this.createdAt) {
			this.createdAt = new Date();
		}
		if (!this.updatedAt) {
			this.updatedAt = new Date();
		}
	}

	/**
	 * Updates the name of the inventory type
	 * @param name The new name
	 */
	public updateName(name: string): void {
		this.name = name;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the check interval for this inventory type
	 * @param checkInterval The check interval in days
	 */
	public updateCheckInterval(checkInterval: number | null | undefined): void {
		if (typeof checkInterval !== 'number') {
			throw new TypeError('Check interval must be a number');
		}
		if (checkInterval < 0) {
			throw new RangeError('Check interval must be greater than 0');
		}
		if (checkInterval === null || checkInterval === undefined) {
			checkInterval = undefined;
		}
		this.checkInterval = checkInterval;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the check type for this inventory type
	 * @param checkType The type of check to perform
	 */
	public updateCheckType(checkType: string | null | undefined): void {
		if (checkType && typeof checkType !== 'string') {
			throw new TypeError('Check type must be a string');
		}
		if (checkType === null || checkType === undefined) {
			checkType = undefined;
		}
		this.checkType = checkType;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the properties for this inventory type
	 * @param properties Array of property names
	 */
	public updateProperties(properties: string[]): void {
		this.properties = properties;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the parent inventory type
	 * @param parent The UUID of the parent inventory type
	 */
	public updateParent(parent: string): void {
		this.parent = parent;
		this.updatedAt = new Date();
	}

	/**
	 * Removes the parent relationship (makes this a root type)
	 */
	public removeParent(): void {
		this.parent = undefined;
		this.updatedAt = new Date();
	}

	/**
	 * Checks if this inventory type has a parent
	 * @returns true if this type has a parent, false otherwise
	 */
	public hasParent(): boolean {
		return !!this.parent;
	}

	/**
	 * Checks if this inventory type is a root type (no parent)
	 * @returns true if this type is a root type, false otherwise
	 */
	public isRoot(): boolean {
		return !this.parent;
	}
}
