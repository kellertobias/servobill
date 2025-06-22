import React from 'react';
import clsx from 'clsx';

import { Input } from '@/components/input';
import { PageCard } from '@/components/page';

/**
 * @file Component for the header section of the inventory page, including search and tabs.
 */

interface InventoryHeaderProps {
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
	activeTab: 'types' | 'locations';
	onTabChange: (tab: 'types' | 'locations') => void;
}

/**
 * Renders the header for the inventory page, with a search bar and tabs to switch
 * between 'Types' and 'Locations' views.
 *
 * @param props - The component props.
 * @param props.searchQuery - The current search query.
 * @param props.onSearchQueryChange - Callback to update the search query.
 * @param props.activeTab - The currently active tab.
 * @param props.onTabChange - Callback to change the active tab.
 * @returns The rendered header component.
 */
export function InventoryHeader({
	searchQuery,
	onSearchQueryChange,
	activeTab,
	onTabChange,
}: InventoryHeaderProps) {
	return (
		<PageCard noPadding>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 px-5">
				{/* Search Bar */}
				<div className="flex-1 max-w-md pb-2">
					<Input
						placeholder="Search inventory..."
						value={searchQuery}
						onChange={onSearchQueryChange}
					/>
				</div>

				{/* Tabs */}
				<div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
					<button
						onClick={() => onTabChange('types')}
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
						onClick={() => onTabChange('locations')}
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
}
