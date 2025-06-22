/**
 * @file Type definitions for inventory-related data structures.
 *
 * @note The `[key: string]: unknown` index signature is added to these interfaces
 * to make them compatible with the generic `Table` component, which requires
 * a `Record<string, unknown>` constraint for its data type.
 */

export interface InventoryItem {
	id: string;
	name?: string;
	barcode?: string;
	state: string;
	location?: {
		id: string;
		name: string;
	};
	type?: {
		id: string;
		name: string;
	};
	nextCheck: string;
	lastScanned: string;
	[key: string]: unknown;
}

export interface InventoryType {
	id: string;
	name: string;
	checkInterval?: number;
	checkType?: string;
	properties: string[];
	parent?: string;
	itemCount: number;
	items: InventoryItem[];
	createdAt: string;
	updatedAt: string;
	[key: string]: unknown;
}

export interface InventoryLocation {
	id: string;
	name: string;
	barcode?: string;
	itemCount?: number;
	items: InventoryItem[];
	createdAt: string;
	updatedAt: string;
	[key: string]: unknown;
}
