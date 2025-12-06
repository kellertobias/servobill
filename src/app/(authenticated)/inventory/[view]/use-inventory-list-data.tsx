import { useState } from 'react';
import { API, gql } from '@/api/index';
import type { InventoryLocationWhereInput, InventoryTypeWhereInput } from '@/common/gql/graphql';
import { useLoadData } from '@/hooks/load-data';
import type { InventoryLocation, InventoryType, InventoryView } from '../types';

/**
 * Query for searching all inventory types (not restricted to root/parent).
 */
const QUERY_TYPE_SEARCH = gql(`
    query InventoryTypesSearch($where: InventoryTypeWhereInput) {
      entries: inventoryTypes(where: $where) {
        id
        name
        parentName
      }
    }
  `);

/**
 * Query for searching all inventory locations (not restricted to root/parent).
 */
const QUERY_LOCATION_SEARCH = gql(`
    query InventoryLocationsSearch($where: InventoryLocationWhereInput) {
      entries: inventoryLocations(where: $where) {
        id
        name
        barcode
        parentName
      }
    }
  `);

/**
 * Query for root/parent-based inventory types (used for non-search listing).
 */
const QUERY_TYPE = gql(`
    query InventoryTypesList($where: InventoryTypeWhereInput, $id: String) {
      entries: inventoryTypes(where: $where) {
        id
        name
        parent
        children {
          id
          name
          itemCount
        }
      }
      node: inventoryType(id: $id) {
        id
        name
        parent
      }
    }
  `);

/**
 * Query for root/parent-based inventory locations (used for non-search listing).
 */
const QUERY_LOCATION = gql(`
    query InventoryLocationsList($where: InventoryLocationWhereInput, $id: String) {
      entries: inventoryLocations(where: $where) {
        id
        name
        barcode
        children {
          id
          name
          itemCount
          barcode
        }
      }
      node: inventoryLocation(id: $id) {
        id
        name
        barcode
        parent
      }
    }
  `);

/**
 * Type for the fake root node used in search results.
 */
interface FakeRootNode {
  id: string;
  name: string;
  parent: null;
  barcode?: null;
  children: (InventoryType | InventoryLocation)[];
}

/**
 * Represents the data structure returned by useInventoryListData.
 * - entries: array of inventory types or locations (or fake root node for search)
 * - node: the current node (type or location) if applicable
 */
export type InventoryListDataResult = {
  entries: (InventoryType | InventoryLocation | FakeRootNode)[];
  node: InventoryType | InventoryLocation | null;
};

/**
 * Custom hook to load inventory list data for either types or locations.
 *
 * - If searchQuery is empty, loads root-level entries or children of a given parent.
 * - If searchQuery is non-empty, searches across all levels and wraps results in a fake root node 'Search Results'.
 *
 * @param view - 'type' or 'location' to select which entity to load
 * @param id - Optional parent id to load children for
 */
export const useInventoryListData = ({ view, id }: { view: InventoryView; id?: string }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, loading, reload } = useLoadData<
    InventoryListDataResult,
    { view: InventoryView; id?: string; searchQuery: string }
  >(
    async ({ view, id, searchQuery }) => {
      // If searching, do not restrict by parent/rootOnly
      if (searchQuery) {
        const where: InventoryTypeWhereInput | InventoryLocationWhereInput = {
          search: searchQuery,
        };
        if (view === 'type') {
          // We cast the result to InventoryListDataResult due to generic GraphQL query system
          const result = (await API.query({
            query: QUERY_TYPE_SEARCH,
            variables: { where },
          })) as { entries: InventoryType[] };
          const fakeRoot: FakeRootNode = {
            id: 'search',
            name: 'Search Results',
            parent: null,
            children: result.entries.map(
              (entry) =>
                ({
                  id: entry.id,
                  name: `${entry.parentName ? `${entry.parentName} / ` : ''}${entry.name}`,
                  itemCount: entry.itemCount,
                  barcode: entry.barcode,
                }) as unknown as InventoryType
            ),
          };
          return {
            entries: [fakeRoot],
            node: null,
          };
        }
        if (view === 'location') {
          // We cast the result to InventoryListDataResult due to generic GraphQL query system
          const result = (await API.query({
            query: QUERY_LOCATION_SEARCH,
            variables: { where },
          })) as { entries: InventoryLocation[] };
          const fakeRoot: FakeRootNode = {
            id: 'search',
            name: 'Search Results',
            parent: null,
            barcode: null,
            children: result.entries.map(
              (entry) =>
                ({
                  id: entry.id,
                  name: `${entry.parentName ? `${entry.parentName} / ` : ''}${entry.name}`,
                  itemCount: entry.itemCount,
                  barcode: entry.barcode,
                }) as unknown as InventoryLocation
            ),
          };
          return {
            entries: [fakeRoot],
            node: null,
          };
        }
        throw new Error('Invalid view');
      }
      // Normal (non-search) behavior: restrict to root or children of parent
      const where: InventoryTypeWhereInput | InventoryLocationWhereInput = {};
      if (id) {
        where.parent = id;
      } else {
        where.rootOnly = true;
      }
      if (view === 'type') {
        // We cast the result to InventoryListDataResult due to generic GraphQL query system
        return (await API.query({
          query: QUERY_TYPE,
          variables: { where, id: id ?? null },
        })) as { entries: InventoryType[]; node: InventoryType | null };
      }
      if (view === 'location') {
        // We cast the result to InventoryListDataResult due to generic GraphQL query system
        return (await API.query({
          query: QUERY_LOCATION,
          variables: { where, id: id ?? null },
        })) as { entries: InventoryLocation[]; node: InventoryLocation | null };
      }
      throw new Error('Invalid view');
    },
    { view, id, searchQuery }
  );

  return {
    entries: data?.entries,
    node: data?.node,
    loading,
    reload,
    searchQuery,
    setSearchQuery,
  };
};
