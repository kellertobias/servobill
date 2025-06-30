import { useState } from 'react';

import { useLoadData } from '@/hooks/load-data';
import { API, gql } from '@/api/index';

import { InventoryView } from '../types';

import {
	InventoryLocationWhereInput,
	InventoryTypeWhereInput,
} from '@/common/gql/graphql';

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
      }
    }
  `);

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
      }
    }
  `);

export const useInventoryListData = ({
	view,
	id,
}: {
	view: InventoryView;
	id?: string;
}) => {
	const [searchQuery, setSearchQuery] = useState('');
	const { data, loading, reload } = useLoadData(
		async () => {
			const where: InventoryTypeWhereInput | InventoryLocationWhereInput = {};
			if (id) {
				where.parent = id;
			} else {
				where.rootOnly = true;
			}
			if (searchQuery) {
				where.search = searchQuery;
			}
			if (view === 'type') {
				return API.query({
					query: QUERY_TYPE,
					variables: { where },
				});
			}
			if (view === 'location') {
				return API.query({
					query: QUERY_LOCATION,
					variables: { where, id: id ?? null },
				});
			}
			throw new Error('Invalid view');
		},
		{ view, id, searchQuery },
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
