import React from 'react';
import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';

/**
 * @file Custom hook for fetching inventory data (types and locations).
 */

/**
 * GQL query for fetching inventory types.
 */
const INVENTORY_TYPES_QUERY = gql(`
	query InventoryTypes($where: InventoryTypeWhereInput) {
		inventoryTypes(where: $where) {
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
				location {
					id
					name
				}
				nextCheck
				lastScanned
			}
			createdAt
			updatedAt
		}
	}
`);

/**
 * GQL query for fetching inventory locations.
 */
const INVENTORY_LOCATIONS_QUERY = gql(`
	query InventoryLocations($where: InventoryLocationWhereInput) {
		inventoryLocations(where: $where) {
			id
			name
			barcode
			itemCount
			items {
				id
				name
				barcode
				state
				type {
					id
					name
				}
				nextCheck
				lastScanned
			}
			createdAt
			updatedAt
		}
	}
`);

/**
 * Custom hook to fetch and manage inventory data.
 * @param searchQuery - The search query to filter inventory items.
 * @returns An object containing inventory types and locations data, loading states, and reload functions.
 */
export function useInventory(searchQuery: string) {
  // Load inventory types data
  const {
    data: typesData,
    loading: typesLoading,
    reload: reloadTypes,
  } = useLoadData(async () =>
    API.query({
      query: INVENTORY_TYPES_QUERY,
      variables: {
        where: searchQuery ? { search: searchQuery } : undefined,
      },
    })
  );

  // Load inventory locations data
  const {
    data: locationsData,
    loading: locationsLoading,
    reload: reloadLocations,
  } = useLoadData(async () =>
    API.query({
      query: INVENTORY_LOCATIONS_QUERY,
      variables: {
        where: searchQuery ? { search: searchQuery } : undefined,
      },
    })
  );

  // Reload data when search query changes
  React.useEffect(() => {
    reloadTypes();
    reloadLocations();
  }, [searchQuery, reloadTypes, reloadLocations]);

  return {
    typesData,
    typesLoading,
    locationsData,
    locationsLoading,
  };
}
