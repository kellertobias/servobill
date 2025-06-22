'use client';

import React, { Fragment, useState } from 'react';
import clsx from 'clsx';

import { Menu, Transition } from '@headlessui/react';
import {
	ChevronDownIcon,
	PlusIcon,
	QrCodeIcon,
} from '@heroicons/react/20/solid';

import { PageCard, PageContent } from '@/components/page';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Table } from '@/components/table';
import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';

/**
 * Type definitions for inventory data
 */
interface InventoryItem {
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
}

interface InventoryType {
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
}

interface InventoryLocation {
	id: string;
	name: string;
	barcode?: string;
	itemCount?: number;
	items: InventoryItem[];
	createdAt: string;
	updatedAt: string;
}

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

	/**
	 * Renders the header section with search bar and tabs
	 */
	const renderHeader = () => (
		<PageCard noPadding>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 px-5">
				{/* Search Bar */}
				<div className="flex-1 max-w-md pb-2">
					<Input
						placeholder="Search inventory..."
						value={searchQuery}
						onChange={setSearchQuery}
					/>
				</div>

				{/* Tabs */}
				<div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
					<button
						onClick={() => setActiveTab('types')}
						className={clsx(
							'px-3 py-2 text-sm font-medium rounded-md transition-colors',
							activeTab === 'types'
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-500 hover:text-gray-700',
						)}
					>
						Types
					</button>
					<button
						onClick={() => setActiveTab('locations')}
						className={clsx(
							'px-3 py-2 text-sm font-medium rounded-md transition-colors',
							activeTab === 'locations'
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-500 hover:text-gray-700',
						)}
					>
						Locations
					</button>
				</div>
			</div>
		</PageCard>
	);

	/**
	 * Renders the action buttons (Open Scanner and New Inventory dropdown)
	 */
	const renderActionButtons = () => (
		<div className="flex items-center space-x-3">
			{/* Open Scanner Button */}
			<Button
				disabled
				icon={QrCodeIcon}
				header
				onClick={() => {
					// TODO: Implement scanner functionality
					console.log('Open scanner clicked');
				}}
			>
				Open Scanner
			</Button>

			{/* New Inventory Dropdown */}
			<Menu as="div" className="relative">
				<Menu.Button as={Fragment}>
					<Button disabled icon={PlusIcon} header>
						New Inventory
						<ChevronDownIcon className="ml-2 h-4 w-4" />
					</Button>
				</Menu.Button>
				<Transition
					as={Fragment}
					enter="transition ease-out duration-100"
					enterFrom="transform opacity-0 scale-95"
					enterTo="transform opacity-100 scale-100"
					leave="transition ease-in duration-75"
					leaveFrom="transform opacity-100 scale-100"
					leaveTo="transform opacity-0 scale-95"
				>
					<Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
						<Menu.Item>
							{({ active }) => (
								<button
									onClick={() => {
										// TODO: Implement new item creation
										console.log('Create new item');
									}}
									className={clsx(
										active ? 'bg-gray-100' : '',
										'block w-full text-left px-4 py-2 text-sm text-gray-700',
									)}
								>
									Item
								</button>
							)}
						</Menu.Item>
						<Menu.Item>
							{({ active }) => (
								<button
									onClick={() => {
										// TODO: Implement new type creation
										console.log('Create new type');
									}}
									className={clsx(
										active ? 'bg-gray-100' : '',
										'block w-full text-left px-4 py-2 text-sm text-gray-700',
									)}
								>
									Type
								</button>
							)}
						</Menu.Item>
						<Menu.Item>
							{({ active }) => (
								<button
									onClick={() => {
										// TODO: Implement new location creation
										console.log('Create new location');
									}}
									className={clsx(
										active ? 'bg-gray-100' : '',
										'block w-full text-left px-4 py-2 text-sm text-gray-700',
									)}
								>
									Location
								</button>
							)}
						</Menu.Item>
					</Menu.Items>
				</Transition>
			</Menu>
		</div>
	);

	/**
	 * Renders the inventory data table based on active tab
	 */
	const renderInventoryTable = () => {
		return activeTab === 'types' ? (
			<Table
				title="Inventory Types"
				data={currentData || []}
				loading={currentLoading}
				keyField="id"
				getCategory={(data: Record<string, unknown>) =>
					(data as unknown as InventoryType).name
				}
				columns={[
					{
						key: 'name',
						title: 'Type Name',
						className: 'py-5',
						render: (data: Record<string, unknown>) => {
							const type = data as unknown as InventoryType;
							return (
								<>
									<div className="text-sm font-medium leading-6 text-gray-900">
										{type.name}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900">
											{type.itemCount} items
										</span>
									</div>
								</>
							);
						},
					},
					{
						key: 'properties',
						title: 'Properties',
						className: 'py-5',
						render: (data: Record<string, unknown>) => {
							const type = data as unknown as InventoryType;
							return (
								<>
									<div className="text-xs leading-6 text-gray-500">
										{type.properties.length > 0 ? (
											type.properties.map((prop: string, index: number) => (
												<span
													key={index}
													className="inline-block bg-gray-100 rounded-full px-2 py-1 mr-1 mb-1 text-xs"
												>
													{prop}
												</span>
											))
										) : (
											<span className="text-gray-400">No properties</span>
										)}
									</div>
								</>
							);
						},
					},
					{
						key: 'items',
						title: 'Items',
						className: 'py-5',
						render: (data: Record<string, unknown>) => {
							const type = data as unknown as InventoryType;
							return (
								<>
									<div className="text-xs leading-6 text-gray-500">
										{type.items && type.items.length > 0 ? (
											type.items.slice(0, 3).map((item: InventoryItem) => (
												<div key={item.id} className="mb-1">
													<span className="text-gray-900">{item.name}</span>
													{item.location && (
														<span className="text-gray-500 ml-1">
															@ {item.location.name}
														</span>
													)}
												</div>
											))
										) : (
											<span className="text-gray-400">No items</span>
										)}
										{type.items && type.items.length > 3 && (
											<div className="text-xs text-gray-400 mt-1">
												+{type.items.length - 3} more items
											</div>
										)}
									</div>
								</>
							);
						},
					},
				]}
			/>
		) : (
			<Table
				title="Inventory Locations"
				data={currentData || []}
				loading={currentLoading}
				keyField="id"
				getCategory={(data: Record<string, unknown>) =>
					(data as unknown as InventoryLocation).name
				}
				columns={[
					{
						key: 'name',
						title: 'Location Name',
						className: 'py-5',
						render: (data: Record<string, unknown>) => {
							const location = data as unknown as InventoryLocation;
							return (
								<>
									<div className="text-sm font-medium leading-6 text-gray-900">
										{location.name}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900">
											{location.itemCount || 0} items
										</span>
									</div>
								</>
							);
						},
					},
					{
						key: 'barcode',
						title: 'Barcode',
						className: 'py-5',
						render: (data: Record<string, unknown>) => {
							const location = data as unknown as InventoryLocation;
							return (
								<>
									<div className="text-xs leading-6 text-gray-500">
										{location.barcode ? (
											<span className="font-mono text-gray-900">
												{location.barcode}
											</span>
										) : (
											<span className="text-gray-400">No barcode</span>
										)}
									</div>
								</>
							);
						},
					},
					{
						key: 'items',
						title: 'Items',
						className: 'py-5',
						render: (data: Record<string, unknown>) => {
							const location = data as unknown as InventoryLocation;
							return (
								<>
									<div className="text-xs leading-6 text-gray-500">
										{location.items && location.items.length > 0 ? (
											location.items.slice(0, 3).map((item: InventoryItem) => (
												<div key={item.id} className="mb-1">
													<span className="text-gray-900">{item.name}</span>
													{item.type && (
														<span className="text-gray-500 ml-1">
															({item.type.name})
														</span>
													)}
												</div>
											))
										) : (
											<span className="text-gray-400">No items</span>
										)}
										{location.items && location.items.length > 3 && (
											<div className="text-xs text-gray-400 mt-1">
												+{location.items.length - 3} more items
											</div>
										)}
									</div>
								</>
							);
						},
					},
				]}
			/>
		);
	};

	return (
		<PageContent
			title="Inventory - Work in Progress"
			noCard
			contentClassName="pt-6"
			right={renderActionButtons()}
		>
			{renderHeader()}
			<PageCard noPadding className="py-6">
				<div className="flex flex-col gap-4 text-gray-500 text-sm text-center">
					This is work in progress and not yet functional.
				</div>
				{renderInventoryTable()}
			</PageCard>
		</PageContent>
	);
}
