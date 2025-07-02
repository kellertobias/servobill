import React from 'react';

/**
 * Props for InventoryActivityFeed component.
 * Extend this in the future to accept activity/history data.
 */
export interface InventoryActivityFeedProps {
	// itemId: string;
	// history: Array<any>;
}

/**
 * Placeholder for the inventory activity/history feed.
 * To be implemented with real activity data in the future.
 *
 * @param props - InventoryActivityFeedProps
 */
export const InventoryActivityFeed: React.FC<InventoryActivityFeedProps> = () =>
	/* { itemId, history } */
	{
		return (
			<div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5 p-6 mt-4">
				<h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">
					Activity & History
				</h2>
				<div className="text-gray-400 text-sm">
					Activity feed coming soon...
				</div>
			</div>
		);
	};
