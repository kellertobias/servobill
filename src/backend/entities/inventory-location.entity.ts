import { DomainEntity, DomainEntityKeys } from './abstract.entity';

/**
 * InventoryLocation entity representing physical locations where inventory items can be stored
 * Used as part of the settings to define available locations
 */
export class InventoryLocationEntity extends DomainEntity {
	public id!: string;
	public name!: string;
	public barcode?: string; // Optional barcode for easy identification and scanning
	public createdAt!: Date;
	public updatedAt!: Date;

	constructor(props: Partial<Omit<InventoryLocationEntity, DomainEntityKeys>>) {
		super();
		Object.assign(this, props);

		// Initialize default values
		if (!this.createdAt) {
			this.createdAt = new Date();
		}
		if (!this.updatedAt) {
			this.updatedAt = new Date();
		}
	}

	/**
	 * Updates the name of the inventory location
	 * @param name The new name
	 */
	public updateName(name: string): void {
		this.name = name;
		this.updatedAt = new Date();
	}

	/**
	 * Updates the barcode of the inventory location
	 * @param barcode The new barcode (optional)
	 */
	public updateBarcode(barcode?: string): void {
		this.barcode = barcode;
		this.updatedAt = new Date();
	}
}
