'use client';

import clsx from 'clsx';
import React from 'react';

import { Input } from '@/components/input';
import { PageCard } from '@/components/page';

/**
 * @file Component for the header section of the inventory page, including search and tabs.
 */

interface InventoryHeaderProps {
  /** The current search query (main page only). */
  searchQuery?: string;
  /** Callback to update the search query (main page only). */
  onSearchQueryChange?: (query: string) => void;
  /** The currently active tab (main page only). */
  activeTab?: 'types' | 'locations';
  /** Callback to change the active tab (main page only). */
  onTabChange?: (tab: 'types' | 'locations') => void;
  /**
   * If set, renders detail mode: shows the name and an edit button.
   * mode: 'type' | 'location'
   * name: string (type/location name)
   * onEdit: callback to open edit drawer
   */
  mode?: 'type' | 'location';
  name?: string;
  onEdit?: () => void;
}

/**
 * InventoryHeader component for the inventory section.
 *
 * - On the main inventory page, it displays a search bar and tabs to switch between 'Types' and 'Locations'.
 * - On detail pages, it displays the name of the type/location and an edit button.
 *
 * The mode is controlled by the presence of the 'mode' and 'name' props.
 *
 * @param props - InventoryHeaderProps
 * @returns The rendered header component.
 */
export function InventoryHeader(props: InventoryHeaderProps) {
  if (props.mode && props.name) {
    // Detail page header
    return (
      <PageCard noPadding>
        <div className="flex items-center justify-between gap-4 p-3 px-5">
          <div className="text-lg font-semibold">{props.name}</div>
          <button
            className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={props.onEdit}
          >
            Edit {props.mode === 'type' ? 'Type' : 'Location'}
          </button>
        </div>
      </PageCard>
    );
  }
  // Main page header (search + tabs)
  const { searchQuery = '', onSearchQueryChange, activeTab = 'types', onTabChange } = props;
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
            onClick={() => onTabChange && onTabChange('types')}
            className={clsx(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === 'types'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Types
          </button>
          <button
            onClick={() => onTabChange && onTabChange('locations')}
            className={clsx(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === 'locations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Locations
          </button>
        </div>
      </div>
    </PageCard>
  );
}
