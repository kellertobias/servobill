import { doToast } from '@/components/toast';

import { API, gql } from '..';

import { parseCsvFileOrString, requestFile } from './helper';

/**
 * Type for inventory type/location minimal info
 */
type InventoryTypeOrLocationLookup = { id: string; name: string };

/**
 * Type for inventory item property input
 */
type InventoryItemPropertyInput = { key: string; value: string };

/**
 * Type for inventory item input
 */
type InventoryItemInput = {
	name: string;
	barcode: string;
	typeId: string | undefined;
	locationId: string | undefined;
	properties: InventoryItemPropertyInput[];
};

function getRowLookup(
	row: Record<string, string>,
	lookup: 'type' | 'location',
	lookupData: InventoryTypeOrLocationLookup[],
): string | null {
	const lookupId = row[`${lookup}id`]
		? String(row[`${lookup}id`]).trim()
		: null;
	if (lookupId) {
		return lookupId;
	}

	const lookupNameRaw =
		row[`${lookup} name`] || row[`${lookup}name`] || row[`${lookup}`];
	const lookupName = lookupNameRaw
		? String(lookupNameRaw).trim().toLowerCase()
		: null;

	if (!lookupName) {
		return null;
	}
	return (
		lookupData.find((l) => l.name.trim().toLowerCase() === lookupName)?.id ||
		null
	);
}

async function importSingleItem(
	row: Record<string, string>,
	{
		types,
		locations,
	}: {
		types: InventoryTypeOrLocationLookup[];
		locations: InventoryTypeOrLocationLookup[];
	},
): Promise<boolean> {
	const importedRaw = row['imported'] ? String(row['imported']).trim() : null;
	// Skip if 'already imported' is truthy (case-insensitive)
	if (importedRaw && importedRaw !== '' && importedRaw !== 'false') {
		return false;
	}

	const typeId = getRowLookup(row, 'type', types);
	const locationId = getRowLookup(row, 'location', locations);

	const name = row['item name'] || row['name'] || row['item'] || row['title'];
	const barcode = row['barcode'] || row['code'] || row['label'] || row['id'];

	const propertyKeys = Object.keys(row).filter(
		(key) =>
			![
				'imported',
				'type',
				'typeid',
				'type id',
				'typename',
				'type name',
				'location',
				'locationid',
				'location id',
				'locationname',
				'location name',
				'item name',
				'name',
				'item',
				'title',
				'barcode',
				'code',
				'label',
				'id',
			].includes(key),
	);

	// Prepare properties array
	const properties: InventoryItemPropertyInput[] = [];
	for (const key of propertyKeys) {
		properties.push({
			// Uppercase first letter
			key: key.charAt(0).toUpperCase() + key.slice(1),
			value: String(row[key] || '').trim(),
		});
	}

	// Prepare InventoryItemInput
	const input: InventoryItemInput = {
		name: name || '',
		barcode: barcode || '',
		typeId: typeId || undefined,
		locationId: locationId || undefined,
		properties,
	};

	console.log('Importing Inventory Item:', input);

	// Create the item via GraphQL mutation
	await API.query({
		query: gql(`
            mutation ImportInventoryItem($data: InventoryItemInput!) {
                createInventoryItem(data: $data) { id }
            }
        `),
		variables: { data: input },
	});

	return true;
}

/**
 * Imports inventory items from a CSV file selected by the user.
 * Loads all types and locations, parses the CSV, matches by name, and creates items via GraphQL.
 * Skips rows where 'already imported' is truthy.
 * Handles 'Note' and 'Serial' as properties.
 * Shows progress and errors via toast notifications.
 *
 * Expected CSV columns:
 * - already imported (do not import these)
 * - barcode
 * - item name
 * - item info (store as "Note" property)
 * - item serial (store as "Serial" property if present)
 * - type name
 * - location name
 */
export async function importInventoryItemsFromCSV() {
	const raw = await requestFile();
	if (!raw) {
		return;
	}
	doToast({
		promise: (async () => {
			// Load all types and locations
			const [types, locations] = await Promise.all([
				API.query({
					query: gql(`
						query ImportInventoryTypes { inventoryTypes { id name } }
					`),
				}).then((res) => res?.inventoryTypes || []),
				API.query({
					query: gql(`
						query ImportInventoryLocations { inventoryLocations { id name } }
					`),
				}).then((res) => res?.inventoryLocations || []),
			]);

			// Parse the CSV
			const rows = await parseCsvFileOrString(raw);

			// Start import
			let imported = 0;
			for (const row of rows) {
				if (await importSingleItem(row, { types, locations })) {
					imported = imported + 1;
				}
			}
			console.log('Imported', imported, 'inventory items.');
			return `Imported ${imported} inventory items.`;
		})(),
		loading: 'Importing Inventory Items...',
		success: 'Inventory Items Imported!',
		error: 'Failed to import inventory items.',
	});
}
