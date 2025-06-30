'use client';

import React, { Fragment } from 'react';
import clsx from 'clsx';
import { useRouter, usePathname, useParams } from 'next/navigation';

import { Menu, Transition } from '@headlessui/react';
import {
	ChevronDownIcon,
	PlusIcon,
	QrCodeIcon,
} from '@heroicons/react/20/solid';

import { Button } from '@/components/button';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { doToast } from '@/components/toast';
import { API, gql } from '@/api/index';

/**
 * @file Component for the action buttons in the inventory page header.
 */

/**
 * Helper to determine if the current route is a type or location detail page.
 * Returns the type: 'type' | 'location' | null, and the id if present.
 */
function useInventoryParentContext() {
	const pathname = usePathname();
	const params = useParams();
	// Example routes: /inventory/types/[typeId], /inventory/locations/[locationId]
	if (pathname?.includes('/inventory/types/') && params?.typeId) {
		return { type: 'type', id: params.typeId as string };
	}
	if (pathname?.includes('/inventory/locations/') && params?.locationId) {
		return { type: 'location', id: params.locationId as string };
	}
	return { type: null, id: null };
}

/**
 * Renders the action buttons for the inventory page, including "Open Scanner"
 * and a dropdown for creating new inventory items, types, or locations.
 *
 * Handles dialog-driven creation for types and locations, including parent context.
 */
export function InventoryActions() {
	const router = useRouter();
	const parentContext = useInventoryParentContext();

	const [dialog, setDialog] = React.useState<null | {
		mode: 'type' | 'location';
		open: boolean;
	}>(null);
	const [name, setName] = React.useState('');
	const [loading, setLoading] = React.useState(false);

	/**
	 * Handles creation of a new inventory type or location via GraphQL mutation.
	 * On success, navigates to the new detail page.
	 */
	const handleCreate = async () => {
		if (!dialog || !name.trim()) {
			return;
		}
		setLoading(true);
		try {
			const res =
				dialog.mode === 'type'
					? await API.query({
							query: gql(`
								mutation CreateInventoryType($input: InventoryTypeInput!) {
									createResponse: createInventoryType(data: $input) { id }
								}
							`),
							variables: {
								input: {
									name,
									parent:
										parentContext.type === 'type'
											? parentContext.id
											: undefined,
								},
							},
						})
					: await API.query({
							query: gql(`
								mutation CreateInventoryLocation($input: InventoryLocationInput!) {
									createResponse: createInventoryLocation(data: $input) { id }
								}
							`),
							variables: { input: { name } },
						});

			if (dialog.mode === 'type') {
				doToast({ type: 'success', message: 'Inventory type created.' });
				setDialog(null);
				setName('');
				if (res && res.createResponse && res.createResponse.id) {
					router.push(`/inventory/types/${res.createResponse.id}`);
				}
			} else if (dialog.mode === 'location') {
				doToast({ type: 'success', message: 'Inventory location created.' });
				setDialog(null);
				setName('');
				if (res && res.createResponse && res.createResponse.id) {
					router.push(`/inventory/locations/${res.createResponse.id}`);
				}
			}
		} catch (error) {
			doToast({
				type: 'danger',
				message: String(error) || 'Failed to create.',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
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
					<Button icon={PlusIcon} header>
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
									onClick={() => setDialog({ mode: 'type', open: true })}
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
									onClick={() => setDialog({ mode: 'location', open: true })}
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

			{/* Creation Dialog/Drawer */}
			<Drawer
				id={dialog?.open ? 'create-inventory' : null}
				title={
					dialog?.mode === 'type'
						? 'Create Inventory Type'
						: 'Create Inventory Location'
				}
				subtitle={
					dialog?.mode === 'type' && parentContext.type === 'type'
						? 'This type will be created as a child of the current type.'
						: dialog?.mode === 'location' && parentContext.type === 'location'
							? 'This location will be created as a child of the current location.'
							: undefined
				}
				onClose={() => {
					setDialog(null);
					setName('');
				}}
				onCancel={() => {
					setDialog(null);
					setName('');
				}}
				onSave={async () => {
					await handleCreate();
				}}
				saveText={loading ? 'Creating...' : 'Create'}
				cancelText="Cancel"
			>
				<div className="py-2">
					<Input
						label="Name"
						value={name}
						onChange={setName}
						placeholder={
							dialog?.mode === 'type' ? 'Type name' : 'Location name'
						}
					/>
				</div>
			</Drawer>
		</div>
	);
}
