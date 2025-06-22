import React, { Fragment } from 'react';
import clsx from 'clsx';

import { Menu, Transition } from '@headlessui/react';
import {
	ChevronDownIcon,
	PlusIcon,
	QrCodeIcon,
} from '@heroicons/react/20/solid';

import { Button } from '@/components/button';

/**
 * @file Component for the action buttons in the inventory page header.
 */

/**
 * Renders the action buttons for the inventory page, including "Open Scanner"
 * and a dropdown for creating new inventory items, types, or locations.
 *
 * @returns The rendered action buttons component.
 */
export function InventoryActions() {
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
}
