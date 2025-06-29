'use client';

import '@/components/dev-utils';

import { notFound, useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';

import { InventoryHeader } from '../components/inventory-header';
import { InventoryTypesTable } from '../components/inventory-types-table';
import { InventoryLocationsTable } from '../components/inventory-locations-table';
import { InventoryView, InventoryType, InventoryLocation } from '../types';

/**
 * Main inventory list page for /inventory/[view].
 * Handles switching between types and locations based on the view param.
 */
export default function InventoryListPage({
	params,
}: {
	params: { view: InventoryView };
}) {
	const { view } = params;
	const [searchQuery, setSearchQuery] = useState('');
	const router = useRouter();

	// Load data for types or locations
	const {
		data: typesData,
		loading: typesLoading,
		reload: reloadTypes,
	} = useLoadData(async () =>
		API.query({
			query: gql(`
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
              location { id name }
              nextCheck
              lastScanned
            }
            createdAt
            updatedAt
          }
        }
      `),
			variables: { where: searchQuery ? { search: searchQuery } : undefined },
		}),
	);

	const {
		data: locationsData,
		loading: locationsLoading,
		reload: reloadLocations,
	} = useLoadData(async () =>
		API.query({
			query: gql(`
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
              type { id name }
              nextCheck
              lastScanned
            }
            createdAt
            updatedAt
          }
        }
      `),
			variables: { where: searchQuery ? { search: searchQuery } : undefined },
		}),
	);

	React.useEffect(() => {
		reloadTypes();
		reloadLocations();
	}, [searchQuery, reloadTypes, reloadLocations]);

	if (view !== 'type' && view !== 'location') {
		notFound();
	}

	return (
		<div className="pt-6">
			<InventoryHeader
				activeTab={view === 'type' ? 'types' : 'locations'}
				onTabChange={(tab) =>
					router.push(`/inventory/${tab === 'types' ? 'type' : 'location'}`)
				}
				searchQuery={searchQuery}
				onSearchQueryChange={setSearchQuery}
			/>
			<div className="py-6">
				{view === 'type' ? (
					<InventoryTypesTable
						data={typesData?.inventoryTypes as InventoryType[]}
						loading={typesLoading}
						onRowClick={(type) => router.push(`/inventory/type/${type.id}`)}
					/>
				) : (
					<InventoryLocationsTable
						data={locationsData?.inventoryLocations as InventoryLocation[]}
						loading={locationsLoading}
						onRowClick={(location) =>
							router.push(`/inventory/location/${location.id}`)
						}
					/>
				)}
			</div>
		</div>
	);
}
