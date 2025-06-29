/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Development utilities for the Servobill app.
 *
 * This file contains functions and helpers intended for use in development only.
 *
 * Example: populateDemoInventory - generates demo inventory types, locations, and items for testing UI and features.
 */

import { API, gql } from '@/api/index';

/**
 * Generates a random UUID (RFC4122 version 4 compliant, simplified for demo use).
 * @returns {string} A random UUID string.
 */
function uuidv4(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAll(
		/[xy]/g,
		function (c) {
			const r = Math.trunc(Math.random() * 16);
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		},
	);
}

// --- TypeScript interfaces for demo data ---
interface DemoInventoryItem {
	id: string;
	name?: string;
	barcode?: string;
	state: string;
	type?: { id: string; name: string };
	location?: { id: string; name: string };
	nextCheck: string;
	lastScanned: string;
	[key: string]: unknown;
}

interface DemoInventoryType {
	id: string;
	name: string;
	properties: string[];
	itemCount: number;
	items: DemoInventoryItem[];
	createdAt: string;
	updatedAt: string;
	parent?: string;
	children: DemoInventoryType[];
	[key: string]: unknown;
}

interface DemoInventoryLocation {
	id: string;
	name: string;
	itemCount: number;
	items: DemoInventoryItem[];
	createdAt: string;
	updatedAt: string;
	parent?: string;
	children: DemoInventoryLocation[];
	[key: string]: unknown;
}

/**
 * Populates the backend with demo inventory types, locations, and items using GraphQL mutations.
 *
 * This ensures that after running this function, API queries will return the demo data.
 *
 * - Types: Some with children, some without.
 * - Locations: Some with children, some without.
 * - Items: Some attached to types/locations, some types/locations without items.
 *
 * This function is attached to window.devUtils for easy invocation in the browser console.
 *
 * Note: This function no longer uses localStorage. All demo data is seeded exclusively via the backend API.
 */
export async function populateDemoInventory(): Promise<void> {
	try {
		// --- Generate Types (step 1: create all without children) ---
		const typeA: DemoInventoryType = {
			id: uuidv4(),
			name: 'Electronics',
			properties: ['brand', 'model'],
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const typeB: DemoInventoryType = {
			id: uuidv4(),
			name: 'Furniture',
			properties: ['material'],
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const typeA1: DemoInventoryType = {
			id: uuidv4(),
			name: 'Laptops',
			parent: typeA.id,
			properties: ['cpu', 'ram'],
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const typeA2: DemoInventoryType = {
			id: uuidv4(),
			name: 'Phones',
			parent: typeA.id,
			properties: ['os'],
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const typeB1: DemoInventoryType = {
			id: uuidv4(),
			name: 'Chairs',
			parent: typeB.id,
			properties: ['color'],
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const typeStationery: DemoInventoryType = {
			id: uuidv4(),
			name: 'Stationery',
			properties: [],
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		// --- Assign children (step 2) ---
		typeA.children = [typeA1, typeA2];
		typeB.children = [typeB1];
		// --- Collect all types ---
		const types: DemoInventoryType[] = [
			typeA,
			typeB,
			typeStationery,
			typeA1,
			typeA2,
			typeB1,
		];

		// --- Generate Locations (step 1: create all without children) ---
		const locA: DemoInventoryLocation = {
			id: uuidv4(),
			name: 'Warehouse',
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const locB: DemoInventoryLocation = {
			id: uuidv4(),
			name: 'Office',
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const locA1: DemoInventoryLocation = {
			id: uuidv4(),
			name: 'Shelf 1',
			parent: locA.id,
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const locA2: DemoInventoryLocation = {
			id: uuidv4(),
			name: 'Shelf 2',
			parent: locA.id,
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const locB1: DemoInventoryLocation = {
			id: uuidv4(),
			name: 'Desk 1',
			parent: locB.id,
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		const locRemote: DemoInventoryLocation = {
			id: uuidv4(),
			name: 'Remote Storage',
			itemCount: 0,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			children: [],
		};
		// --- Assign children (step 2) ---
		locA.children = [locA1, locA2];
		locB.children = [locB1];
		// --- Collect all locations ---
		const locations: DemoInventoryLocation[] = [
			locA,
			locB,
			locRemote,
			locA1,
			locA2,
			locB1,
		];

		// --- Generate Items ---
		const items: DemoInventoryItem[] = [
			{
				id: uuidv4(),
				name: 'MacBook Pro',
				barcode: 'MBP-001',
				state: 'NEW',
				type: { id: typeA1.id, name: typeA1.name },
				location: { id: locA1.id, name: locA1.name },
				nextCheck: new Date().toISOString(),
				lastScanned: new Date().toISOString(),
			},
			{
				id: uuidv4(),
				name: 'iPhone',
				barcode: 'IPH-001',
				state: 'DEFAULT',
				type: { id: typeA2.id, name: typeA2.name },
				location: { id: locA2.id, name: locA2.name },
				nextCheck: new Date().toISOString(),
				lastScanned: new Date().toISOString(),
			},
			{
				id: uuidv4(),
				name: 'Office Chair',
				barcode: 'CHAIR-001',
				state: 'DEFAULT',
				type: { id: typeB1.id, name: typeB1.name },
				location: { id: locB1.id, name: locB1.name },
				nextCheck: new Date().toISOString(),
				lastScanned: new Date().toISOString(),
			},
			// Item with no type (one-off)
			{
				id: uuidv4(),
				name: 'Whiteboard',
				barcode: 'WB-001',
				state: 'DEFAULT',
				location: { id: locB.id, name: locB.name },
				nextCheck: new Date().toISOString(),
				lastScanned: new Date().toISOString(),
			},
			// Item with no location (unassigned)
			{
				id: uuidv4(),
				name: 'Desk Lamp',
				barcode: 'LAMP-001',
				state: 'NEW',
				type: { id: typeB1.id, name: typeB1.name },
				nextCheck: new Date().toISOString(),
				lastScanned: new Date().toISOString(),
			},
		];

		// Assign items to types and locations
		types.forEach((type) => {
			type.items = items.filter(
				(item) => item.type && item.type.id === type.id,
			);
			type.itemCount = type.items.length;
		});
		locations.forEach((loc) => {
			loc.items = items.filter(
				(item) => item.location && item.location.id === loc.id,
			);
			loc.itemCount = loc.items.length;
		});

		/**
		 * --- Backend Seeding Logic ---
		 * Insert generated demo data into the backend using GraphQL mutations.
		 * This ensures that API queries will return the demo data.
		 *
		 * Note: API.query is used for both queries and mutations in this codebase.
		 */
		// --- GraphQL mutation definitions ---
		const CREATE_TYPE_MUTATION = gql(`
			mutation CreateInventoryTypeDevTools($input: CreateInventoryTypeInput!) {
				createInventoryType(input: $input) { id name parent properties createdAt updatedAt }
			}
		`);
		const CREATE_LOCATION_MUTATION = gql(`
			mutation CreateInventoryLocationDevTools($input: CreateInventoryLocationInput!) {
				createInventoryLocation(input: $input) { id name barcode parent createdAt updatedAt }
			}
		`);
		const CREATE_ITEM_MUTATION = gql(`
			mutation CreateInventoryItemDevTools($input: InventoryItemInput!) {
				createInventoryItem(input: $input) { id name barcode state type { id } location { id } nextCheck lastScanned createdAt updatedAt }
			}
		`);

		// --- Helper: Insert types (parents first, then children) ---
		const typeIdMap: Record<string, string> = {};
		for (const type of types) {
			const input: any = {
				name: type.name,
				properties: type.properties,
				parent: type.parent ? typeIdMap[type.parent] : undefined,
			};
			const res = await API.query({
				query: CREATE_TYPE_MUTATION,
				variables: { input },
			});
			typeIdMap[type.id] = res.createInventoryType.id;
		}

		// --- Helper: Insert locations (parents first, then children) ---
		const locationIdMap: Record<string, string> = {};
		for (const loc of locations) {
			const input: any = {
				name: loc.name,
				barcode: loc.barcode,
				// parent: loc.parent ? locationIdMap[loc.parent] : undefined, // Not supported by backend
			};
			const res = await API.query({
				query: CREATE_LOCATION_MUTATION,
				variables: { input },
			});
			locationIdMap[loc.id] = res.createInventoryLocation.id;
		}

		// Determine fallback locationId for items that lack a location (required by backend)
		const fallbackLocationId = Object.values(locationIdMap)[0];

		// --- Insert items ---
		for (const item of items) {
			const input: any = {
				name: item.name,
				barcode: item.barcode,
				state: item.state,
				typeId: item.type ? typeIdMap[item.type.id] : undefined,
				// Always provide a locationId, fallback to first location if missing (required by backend)
				locationId: item.location
					? locationIdMap[item.location.id]
					: fallbackLocationId,
				nextCheck: item.nextCheck,
				// lastScanned: item.lastScanned, // Not allowed by backend InventoryItemInput
				properties: [], // Add properties if needed
			};
			try {
				const result = await API.query({
					query: CREATE_ITEM_MUTATION,
					variables: { input },
				});
				// eslint-disable-next-line no-console
				console.log('[populateDemoInventory] Created item:', input, result);
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(
					'[populateDemoInventory] Error creating item:',
					input,
					error,
				);
			}
		}

		// Print all created data with type and UUIDs
		// eslint-disable-next-line no-console
		console.log('==== Created Inventory Types ====');
		// eslint-disable-next-line no-console
		console.table(
			types.map((t) => ({
				Type: 'Type',
				Name: t.name,
				UUID: t.id,
				Parent: t.parent || '',
				Children: t.children.length,
				Items: t.items.length,
			})),
		);
		types.forEach((t) => {
			// eslint-disable-next-line no-console
			console.log(`[Type] ${t.name} (UUID: ${t.id})`, t);
		});

		// eslint-disable-next-line no-console
		console.log('==== Created Inventory Locations ====');
		// eslint-disable-next-line no-console
		console.table(
			locations.map((l) => ({
				Type: 'Location',
				Name: l.name,
				UUID: l.id,
				Parent: l.parent || '',
				Children: l.children.length,
				Items: l.items.length,
			})),
		);
		locations.forEach((l) => {
			// eslint-disable-next-line no-console
			console.log(`[Location] ${l.name} (UUID: ${l.id})`, l);
		});

		// eslint-disable-next-line no-console
		console.log('==== Created Inventory Items ====');
		// eslint-disable-next-line no-console
		console.table(
			items.map((i) => ({
				Type: 'Item',
				Name: i.name,
				UUID: i.id,
				TypeId: i.type?.id || '',
				LocationId: i.location?.id || '',
				State: i.state,
			})),
		);
		items.forEach((i) => {
			// eslint-disable-next-line no-console
			console.log(`[Item] ${i.name} (UUID: ${i.id})`, i);
		});

		// eslint-disable-next-line no-console
		console.log(
			'[populateDemoInventory] Demo inventory data generated and stored in backend.',
		);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('[populateDemoInventory] Error during creation:', error);
	}
}

/**
 * Fetches all inventory types, locations, and items from the API.
 *
 * @returns {Promise<{ types: any[]; locations: any[]; items: any[] }>} An object containing arrays of types, locations, and items.
 *
 * Usage: await window.devUtils.fetchAllInventoryData()
 */
export async function fetchAllInventoryData(): Promise<{
	types: any[];
	locations: any[];
	items: any[];
}> {
	try {
		// GraphQL queries for all types, locations, and items (with unique operation names)
		const INVENTORY_TYPES_QUERY = gql(`
			query DevToolsInventoryTypes {
				inventoryTypes {
					id
					name
					checkInterval
					checkType
					properties
					parent
					itemCount
					items {
						id
						name
						barcode
						state
						location { id name }
						nextCheck
						lastScanned
					}
					createdAt
					updatedAt
				}
			}
		`);

		const INVENTORY_LOCATIONS_QUERY = gql(`
			query DevToolsInventoryLocations {
				inventoryLocations {
					id
					name
					barcode
					itemCount
					items {
						id
						name
						barcode
						state
						type { id name }
						nextCheck
						lastScanned
					}
					createdAt
					updatedAt
				}
			}
		`);

		const INVENTORY_ITEMS_QUERY = gql(`
			query DevToolsInventoryItems {
				inventoryItems {
					id
					name
					barcode
					state
					type { id name }
					location { id name }
					nextCheck
					lastScanned
					createdAt
					updatedAt
				}
			}
		`);

		const typesPromise = API.query({ query: INVENTORY_TYPES_QUERY });
		const locationsPromise = API.query({
			query: INVENTORY_LOCATIONS_QUERY,
		});
		const itemsPromise = API.query({ query: INVENTORY_ITEMS_QUERY });

		const [typesRes, locationsRes, itemsRes] = await Promise.all([
			typesPromise,
			locationsPromise,
			itemsPromise,
		]);

		// Print results in a readable way
		// eslint-disable-next-line no-console
		console.log('==== Inventory Types ====', typesRes.inventoryTypes);
		// eslint-disable-next-line no-console
		console.log(
			'==== Inventory Locations ====',
			locationsRes.inventoryLocations,
		);
		// eslint-disable-next-line no-console
		console.log('==== Inventory Items ====', itemsRes.inventoryItems);

		return {
			types: typesRes.inventoryTypes,
			locations: locationsRes.inventoryLocations,
			items: itemsRes.inventoryItems,
		};
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('[fetchAllInventoryData] Error during fetching:', error);
		return { types: [], locations: [], items: [] };
	}
}

// Attach to window.devUtils for easy access in browser console
if (typeof window !== 'undefined') {
	(window as unknown as { devUtils?: Record<string, unknown> }).devUtils =
		(window as unknown as { devUtils?: Record<string, unknown> }).devUtils ||
		{};
	(
		window as unknown as { devUtils: Record<string, unknown> }
	).devUtils.populateDemoInventory = populateDemoInventory;
	(
		window as unknown as { devUtils: Record<string, unknown> }
	).devUtils.fetchAllInventoryData = fetchAllInventoryData;
}
