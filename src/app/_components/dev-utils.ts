/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Development utilities for the Servobill app.
 *
 * This file contains functions and helpers intended for use in development only.
 *
 * Example: populateDemoInventory - generates demo inventory types, locations, and items for testing UI and features.
 */

import { API, gql } from '@/api/index';

import type {
	DevToolsInventoryItemsQuery,
	InventoryLocationsListQuery,
	InventoryTypesListQuery,
} from '@/common/gql/graphql';

/**
 * Generates a random UUID (RFC4122 version 4 compliant, simplified for demo use).
 * @returns {string} A random UUID string.
 */
function uuidv4(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAll(/[xy]/g, (c) => {
		const r = Math.trunc(Math.random() * 16);
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Helper to create a demo inventory item object for seeding.
 */
function makeItem({
	name,
	barcode,
	state,
	type,
	location,
	properties,
}: {
	name: string;
	barcode: string;
	state: string;
	type: { id: string; name: string };
	location: { id: string; name: string };
	properties?: { key: string; value: string }[];
}) {
	return {
		id: uuidv4(),
		name,
		barcode,
		state,
		type: type ? { id: type.id, name: type.name } : undefined,
		location: location ? { id: location.id, name: location.name } : undefined,
		nextCheck: new Date().toISOString(),
		lastScanned: new Date().toISOString(),
		properties: properties || [],
	};
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
 * Deletes ALL inventory items, types, and locations from the backend (in this order).
 * This is useful for resetting the inventory database during development.
 *
 * Usage: await window.devUtils.deleteAllInventoryData()
 */
export async function deleteAllInventoryData(): Promise<void> {
	try {
		// --- GraphQL mutation definitions ---
		const DELETE_ITEM_MUTATION = gql(`
			mutation DeleteInventoryItemDevTools($id: String!) {
				deleteInventoryItem(id: $id)
			}
		`);
		const DELETE_TYPE_MUTATION = gql(`
			mutation DeleteInventoryTypeDevTools($id: String!) {
				deleteInventoryType(id: $id)
			}
		`);
		const DELETE_LOCATION_MUTATION = gql(`
			mutation DeleteInventoryLocationDevTools($id: String!) {
				deleteInventoryLocation(id: $id)
			}
		`);

		// --- Fetch all data ---
		const { types, locations, items } = await fetchAllInventoryData();

		// --- Delete all items ---
		for (const item of items) {
			try {
				await API.query({
					query: DELETE_ITEM_MUTATION,
					variables: { id: item.id },
				});
				// eslint-disable-next-line no-console
				console.log(
					`[deleteAllInventoryData] Deleted item: ${item.name} (${item.id})`,
				);
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(
					`[deleteAllInventoryData] Error deleting item: ${item.id}`,
					error,
				);
			}
		}

		// --- Delete all types ---
		for (const type of types) {
			try {
				await API.query({
					query: DELETE_TYPE_MUTATION,
					variables: { id: type.id },
				});
				// eslint-disable-next-line no-console
				console.log(
					`[deleteAllInventoryData] Deleted type: ${type.name} (${type.id})`,
				);
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(
					`[deleteAllInventoryData] Error deleting type: ${type.id}`,
					error,
				);
			}
		}

		// --- Delete all locations ---
		for (const loc of locations) {
			try {
				await API.query({
					query: DELETE_LOCATION_MUTATION,
					variables: { id: loc.id },
				});
				// eslint-disable-next-line no-console
				console.log(
					`[deleteAllInventoryData] Deleted location: ${loc.name} (${loc.id})`,
				);
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(
					`[deleteAllInventoryData] Error deleting location: ${loc.id}`,
					error,
				);
			}
		}
		// eslint-disable-next-line no-console
		console.log('[deleteAllInventoryData] All inventory data deleted.');
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('[deleteAllInventoryData] Error during deletion:', error);
	}
}

/**
 * Populates the backend with the new demo inventory types, locations, and items using GraphQL mutations.
 *
 * This function is attached to window.devUtils for easy invocation in the browser console.
 *
 * Note: This function no longer uses localStorage. All demo data is seeded exclusively via the backend API.
 */
export async function populateDemoInventory(): Promise<void> {
	try {
		// --- Define parent locations ---
		const locStorage = { id: uuidv4(), name: 'Storage Locations' };
		const locBags = { id: uuidv4(), name: 'Bags & Racks' };
		const locRentals = { id: uuidv4(), name: 'Long-Term-Rentals' };

		// --- Define child locations with parent relations ---
		// Storage Locations
		const locBasement = {
			id: uuidv4(),
			name: 'Basement Storage',
			parent: locStorage.id,
		};
		const locAppartment = {
			id: uuidv4(),
			name: 'Appartment Storage',
			parent: locStorage.id,
		};
		// Bags & Racks
		const locAllDayBag = {
			id: uuidv4(),
			name: 'All-Day Bag',
			parent: locBags.id,
		};
		const locTravelBag = {
			id: uuidv4(),
			name: 'Travel Bag',
			parent: locBags.id,
		};
		const locToolBag = { id: uuidv4(), name: 'Tool Bag', parent: locBags.id };
		const locDJBag = { id: uuidv4(), name: 'DJ Bag', parent: locBags.id };
		const locLightDeskCase = {
			id: uuidv4(),
			name: 'Light Desk Case',
			parent: locBags.id,
		};
		const locVideoRack = {
			id: uuidv4(),
			name: 'Video Rack',
			parent: locBags.id,
		};
		// Long-Term-Rentals (People)
		const locAdam = { id: uuidv4(), name: 'Adam Apple', parent: locRentals.id };
		const locBob = {
			id: uuidv4(),
			name: 'Bob Brussels',
			parent: locRentals.id,
		};
		const locCathrin = {
			id: uuidv4(),
			name: 'Cathrin Corwell',
			parent: locRentals.id,
		};

		// --- Compose locations array with parent-child structure ---
		// Note: Backend API may not support parent assignment on creation; this is for local structure/UI.
		const locations: DemoInventoryLocation[] = [
			// Parents
			{
				...locStorage,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locBags,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locRentals,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			// Children
			{
				...locBasement,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locAppartment,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locAllDayBag,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locTravelBag,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locToolBag,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locDJBag,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locLightDeskCase,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locVideoRack,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locAdam,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locBob,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...locCathrin,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
		];

		// --- Assign children arrays for local structure (for UI/testing) ---
		const locationMap: Record<string, DemoInventoryLocation> = {};
		locations.forEach((loc) => {
			locationMap[loc.id] = loc;
		});
		// Assign children to parents
		locations.forEach((loc) => {
			if (loc.parent && locationMap[loc.parent]) {
				locationMap[loc.parent].children.push(loc);
			}
		});

		// --- Define new types structure ---
		// IT-Equipment
		const typeIT = { id: uuidv4(), name: 'IT-Equipment', properties: [] };
		const typeScreens = {
			id: uuidv4(),
			name: 'Screens',
			parent: typeIT.id,
			properties: ['Touch', 'Resolution', 'Mobile', 'Serial'],
		};
		const typeUSBC = {
			id: uuidv4(),
			name: 'USB-C Hub Dock',
			parent: typeIT.id,
			properties: ['Ports', 'Power Delivery'],
		};
		const typeThunderbolt = {
			id: uuidv4(),
			name: 'Thunderbolt Docking Station',
			parent: typeIT.id,
			properties: ['Ports', 'Power Delivery'],
		};
		const typeLaptop = {
			id: uuidv4(),
			name: 'Laptop',
			parent: typeIT.id,
			properties: ['Model', 'Processor', 'Memory', 'Storage'],
		};
		const typeDesktop = {
			id: uuidv4(),
			name: 'Desktop',
			parent: typeIT.id,
			properties: ['Processor', 'Memory', 'Storage', 'Graphics'],
		};
		// Audio Equipment
		const typeAudio = { id: uuidv4(), name: 'Audio Equipment', properties: [] };
		const typeMicrophone = {
			id: uuidv4(),
			name: 'Microphone',
			parent: typeAudio.id,
			properties: [],
		};
		const typeWirelessMic = {
			id: uuidv4(),
			name: 'Wireless Microphone',
			parent: typeAudio.id,
			properties: [],
		};
		const typeWirelessBeltpack = {
			id: uuidv4(),
			name: 'Wireless Beltpack',
			parent: typeAudio.id,
			properties: [],
		};
		// Cables
		const typeCables = { id: uuidv4(), name: 'Cables', properties: [] };
		const typeXLR = {
			id: uuidv4(),
			name: 'XLR Cables',
			parent: typeCables.id,
			properties: [],
		};
		const typeXLR5m = {
			id: uuidv4(),
			name: '5m',
			parent: typeXLR.id,
			properties: [],
		};
		const typePower = {
			id: uuidv4(),
			name: 'Power Cables',
			parent: typeCables.id,
			properties: [],
		};
		const typePower3m = {
			id: uuidv4(),
			name: '3m',
			parent: typePower.id,
			properties: [],
		};
		const typePower5m = {
			id: uuidv4(),
			name: '5m',
			parent: typePower.id,
			properties: [],
		};
		const typePowerMulti3m = {
			id: uuidv4(),
			name: '3x Multisocket 3m',
			parent: typePower.id,
			properties: [],
		};
		const types: DemoInventoryType[] = [
			// IT-Equipment
			{
				...typeIT,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeScreens,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeUSBC,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeThunderbolt,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeLaptop,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeDesktop,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			// Audio Equipment
			{
				...typeAudio,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeMicrophone,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeWirelessMic,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeWirelessBeltpack,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			// Cables
			{
				...typeCables,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeXLR,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typeXLR5m,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typePower,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typePower3m,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typePower5m,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
			{
				...typePowerMulti3m,
				itemCount: 0,
				items: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				children: [],
			},
		];
		// Assign children for hierarchy (for local structure, not backend)
		types.forEach((type) => {
			type.children = types.filter((t) => t.parent === type.id);
		});

		// --- Generate realistic items for these types and locations ---
		const items: DemoInventoryItem[] = [
			// IT-Equipment
			makeItem({
				name: 'Dell UltraSharp U2720Q',
				barcode: 'SCR-001',
				state: 'DEFAULT',
				type: typeScreens,
				location: locBasement,
				properties: [
					{ key: 'Resolution', value: '3840x2160' },
					{ key: 'Touch', value: 'No' },
					{ key: 'Serial', value: 'DU2720Q-12345' },
				],
			}),
			makeItem({
				name: 'Apple MacBook Pro 16"',
				barcode: 'LAP-001',
				state: 'NEW',
				type: typeLaptop,
				location: locAppartment,
				properties: [
					{ key: 'Model', value: '2021 M1 Max' },
					{ key: 'Memory', value: '32GB' },
					{ key: 'Storage', value: '1TB' },
				],
			}),
			makeItem({
				name: 'CalDigit TS3 Plus',
				barcode: 'TB-001',
				state: 'DEFAULT',
				type: typeThunderbolt,
				location: locLightDeskCase,
				properties: [
					{ key: 'Ports', value: '15' },
					{ key: 'Power Delivery', value: '87W' },
				],
			}),
			makeItem({
				name: 'Anker USB-C Hub',
				barcode: 'USBC-001',
				state: 'DEFAULT',
				type: typeUSBC,
				location: locAllDayBag,
				properties: [
					{ key: 'Ports', value: '7' },
					{ key: 'Power Delivery', value: '60W' },
				],
			}),
			// Audio Equipment
			makeItem({
				name: 'Shure SM58',
				barcode: 'MIC-001',
				state: 'DEFAULT',
				type: typeMicrophone,
				location: locDJBag,
			}),
			makeItem({
				name: 'Sennheiser EW 100 G4',
				barcode: 'WMIC-001',
				state: 'DEFAULT',
				type: typeWirelessMic,
				location: locTravelBag,
			}),
			makeItem({
				name: 'Sennheiser Beltpack',
				barcode: 'BELT-001',
				state: 'DEFAULT',
				type: typeWirelessBeltpack,
				location: locToolBag,
			}),
			// Cables
			makeItem({
				name: 'Sommer XLR 5m',
				barcode: 'XLR-5M-001',
				state: 'DEFAULT',
				type: typeXLR5m,
				location: locBasement,
			}),
			makeItem({
				name: 'Schuko Power 3m',
				barcode: 'PWR-3M-001',
				state: 'DEFAULT',
				type: typePower3m,
				location: locBasement,
			}),
			makeItem({
				name: 'Schuko Power 5m',
				barcode: 'PWR-5M-001',
				state: 'DEFAULT',
				type: typePower5m,
				location: locBasement,
			}),
			makeItem({
				name: '3x Multisocket 3m',
				barcode: 'MULTI-3M-001',
				state: 'DEFAULT',
				type: typePowerMulti3m,
				location: locBasement,
			}),
			// Long Term Rentals
			makeItem({
				name: 'MacBook Air (Adam)',
				barcode: 'LAP-ADAM-001',
				state: 'DEFAULT',
				type: typeLaptop,
				location: locAdam,
				properties: [{ key: 'Model', value: '2020 M1' }],
			}),
			makeItem({
				name: 'DJ Controller (Bob)',
				barcode: 'DJ-BOB-001',
				state: 'DEFAULT',
				type: typeAudio,
				location: locBob,
			}),
			makeItem({
				name: 'Monitor Speaker (Cathrin)',
				barcode: 'SPK-CATH-001',
				state: 'DEFAULT',
				type: typeAudio,
				location: locCathrin,
			}),
		];

		// Assign items to types and locations (for local structure, not backend)
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

		// --- Backend Seeding Logic ---
		// GraphQL mutation definitions
		const CREATE_TYPE_MUTATION = gql(`
			mutation CreateInventoryTypeDevTools($input: InventoryTypeInput!) {
				createInventoryType(data: $input) { id name parent properties createdAt updatedAt }
			}
		`);
		const CREATE_LOCATION_MUTATION = gql(`
			mutation CreateInventoryLocationDevTools($input: InventoryLocationInput!) {
				createInventoryLocation(data: $input) { id name barcode parent createdAt updatedAt }
			}
		`);
		const CREATE_ITEM_MUTATION = gql(`
			mutation CreateInventoryItemDevTools($input: InventoryItemInput!) {
				createInventoryItem(data: $input) { id name barcode state type { id } location { id } nextCheck lastScanned createdAt updatedAt }
			}
		`);

		// --- Insert types (parents first, then children) ---
		const typeIdMap: Record<string, string> = {};
		for (const type of types) {
			const input = {
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

		// --- Insert locations ---
		const locationIdMap: Record<string, string> = {};
		for (const loc of locations) {
			const input = {
				name: loc.name,
				barcode: loc.barcode,
				parent: loc.parent ? locationIdMap[loc.parent] : undefined,
			};
			const res = await API.query({
				query: CREATE_LOCATION_MUTATION,
				variables: { input },
			});
			locationIdMap[loc.id] = res.createInventoryLocation.id;
		}
		const fallbackLocationId = Object.values(locationIdMap)[0];

		// --- Insert items ---
		for (const item of items) {
			const input = {
				name: item.name,
				barcode: item.barcode,
				state: item.state,
				typeId: item.type ? typeIdMap[item.type.id] : undefined,
				locationId: item.location
					? locationIdMap[item.location.id]
					: fallbackLocationId,
				nextCheck: item.nextCheck,
				properties: item.properties || [],
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
	types: InventoryTypesListQuery['entries'];
	locations: InventoryLocationsListQuery['entries'];
	items: DevToolsInventoryItemsQuery['inventoryItems'];
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
	(
		window as unknown as { devUtils: Record<string, unknown> }
	).devUtils.deleteAllInventoryData = deleteAllInventoryData;
}
