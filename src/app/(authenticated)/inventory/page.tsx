'use client';

import React, { useState } from 'react';

import { PageCard, PageContent } from '@/components/page';
import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';

import {
	InventoryLocation,
	InventoryType,
} from '@/app/(authenticated)/inventory/types';

import { InventoryHeader } from './components/inventory-header';
import { InventoryActions } from './components/inventory-actions';
import { InventoryTypesTable } from './components/inventory-types-table';
import { InventoryLocationsTable } from './components/inventory-locations-table';

/**
 * Inventory page component that displays inventory types and locations
 * with their associated items. Features search functionality and tab navigation
 * between Types and Locations views.
 */
export default function InventoryPage() {
	const [activeTab, setActiveTab] = useState<'types' | 'locations'>('types');
	const [searchQuery, setSearchQuery] = useState('');

	// Load inventory types data
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
			`),
			variables: {
				where: searchQuery ? { search: searchQuery } : undefined,
			},
		}),
	);

	// Load inventory locations data
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
			`),
			variables: {
				where: searchQuery ? { search: searchQuery } : undefined,
			},
		}),
	);

	// Reload data when search query changes
	React.useEffect(() => {
		reloadTypes();
		reloadLocations();
	}, [searchQuery, reloadTypes, reloadLocations]);

	const currentData =
		activeTab === 'types'
			? typesData?.inventoryTypes
			: locationsData?.inventoryLocations;
	const currentLoading =
		activeTab === 'types' ? typesLoading : locationsLoading;

	return (
		<PageContent
			title="Inventory - Work in Progress"
			noCard
			contentClassName="pt-6"
			right={<InventoryActions />}
		>
			<InventoryHeader
				activeTab={activeTab}
				onTabChange={setActiveTab}
				searchQuery={searchQuery}
				onSearchQueryChange={setSearchQuery}
			/>
			<PageCard noPadding className="py-6">
				<div className="flex flex-col gap-4 text-gray-500 text-sm text-center">
					This is work in progress and not yet functional.
				</div>
				{activeTab === 'types' ? (
					<InventoryTypesTable
						data={currentData as InventoryType[]}
						loading={currentLoading}
					/>
				) : (
					<InventoryLocationsTable
						data={currentData as InventoryLocation[]}
						loading={currentLoading}
					/>
				)}
			</PageCard>
		</PageContent>
	);
}
