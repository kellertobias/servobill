/* eslint-disable @typescript-eslint/no-unused-vars */
import { doToast } from '@/components/toast';

import { API, gql } from '..';

import { requestFile } from './helper';

/**
 * Sorts elements so that parents always come before their children.
 * Elements must have an 'id' and optional 'parentId' (referring to another element's 'id').
 * Returns a new array with parents before children. Throws if a cycle or missing parent is detected.
 *
 * @param elements Array of elements with 'id' and optional 'parentId'.
 * @returns Sorted array with parents before children.
 */
function sortElementsByParent<T extends { id: string; parent?: string }>(elements: T[]): T[] {
  const remaining = new Set(elements);
  const added = new Set<string>();
  const result: T[] = [];

  let maxIterations = 10000;

  while (remaining.size > 0 && maxIterations > 0) {
    // make sure we don't get stuck in an infinite loop
    maxIterations -= 1;

    for (const el of remaining) {
      if (!el.parent || added.has(el.parent)) {
        result.push(el);
        added.add(el.id);
        remaining.delete(el);
      }
    }
  }

  if (result.length !== elements.length) {
    const missing = elements.filter((el) => !added.has(el.id)).map((el) => el.id);
    throw new Error(`Could not resolve parent relationships for: ${missing.join(', ')}`);
  }

  return result;
}

/**
 * Imports a batch of elements (locations or types) after sorting parents before children.
 * Builds a map from file IDs to server IDs, and rewrites parentId fields accordingly.
 */
async function importElements({
  elements,
  entityName,
}: {
  elements: Array<{ id: string; name: string; parent?: string } & Record<string, string>>;
  entityName: string;
}) {
  // Sort elements so parents come before children
  const sorted = sortElementsByParent(elements);

  const mutation = gql(`
        mutation Import${entityName}Bulk($data: Inventory${entityName}Input!) {
            data: createInventory${entityName}(data: $data) { id }
        }
    `);

  // Map of file ID -> server ID
  const idMap: Record<string, string> = {};

  let importedCount = 0;

  // import already sorted elements. parents first.
  for (const el of sorted) {
    // Prepare input, rewriting parentId to server ID if present
    const { id, parent, createdAt, updatedAt, ...rest } = el;
    const input: Record<string, string> = rest;

    // get parent id from already imported elements
    if (parent) {
      if (!idMap[parent]) {
        throw new Error(`Parent with id ${parent} not imported yet for ${entityName} ${el.name}`);
      }
      input.parent = idMap[parent];
    }

    console.log(el, input);

    // Create via GraphQL mutation
    const newId = (
      (await API.query({
        query: mutation as never,
        variables: { data: input },
      })) as unknown as { data: { id: string } }
    )?.data?.id;

    if (!newId) {
      throw new Error(`Failed to import ${entityName}: ${el.name}`);
    }

    idMap[id] = newId;
    importedCount += 1;
  }
  return { idMap, importedCount };
}

/**
 * Imports inventory locations and types from a JSON object.
 * Handles parent-child relationships by sorting elements so parents come first,
 * then importing each and mapping file IDs to server IDs for parent references.
 *
 * Example JSON format:
 * {
 *   "locations": [
 *     { "id": "1", "name": "Warehouse" },
 *     { "id": "2", "name": "Shelf A", "parentId": "1" }
 *   ],
 *   "types": [
 *     { "id": "a", "name": "Electronics" },
 *     { "id": "b", "name": "Laptops", "parentId": "a" }
 *   ]
 * }
 *
 * @param jsonInput The JSON string or object containing locations and types.
 */
export async function importInventoryLocationsAndTypesFromJSON() {
  const raw = await requestFile();
  if (!raw) {
    return;
  }
  doToast({
    promise: (async () => {
      // Parse input if string
      const data = JSON.parse(raw);
      const { inventory } = data;
      const { locations = [], types = [] } = inventory;

      try {
        // Import locations
        const locationResult = await importElements({
          elements: locations,
          entityName: 'Location',
        });

        // Import types
        const typeResult = await importElements({
          elements: types,
          entityName: 'Type',
        });
        return `Imported ${locationResult.importedCount} locations and ${typeResult.importedCount} types.`;
      } catch (error) {
        console.error(error);
        throw error;
      }
    })(),
    loading: 'Importing Inventory Locations and Types...',
    success: 'Inventory Locations and Types Imported!',
    error: 'Failed to import inventory locations/types.',
  });
}
