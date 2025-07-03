import React from 'react';

import dayjs from 'dayjs';

/**
 * Props for InventoryItemStatusCard component.
 */
export interface InventoryItemStatusCardProps {
	status: string;
	onStatusChange: (status: string) => void;
	nextCheck?: string | null;
	lastScanned?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

/**
 * Card displaying the status (state) and all relevant dates for an inventory item.
 * Allows changing the status, and shows dates with improved layout.
 *
 * @param props - InventoryItemStatusCardProps
 */
export const InventoryItemStatusCard: React.FC<
	InventoryItemStatusCardProps
> = ({
	status,
	onStatusChange,
	nextCheck,
	lastScanned,
	createdAt,
	updatedAt,
}) => {
	// State options as in the item drawer
	const stateOptions = [
		{ value: 'NEW', label: 'New' },
		{ value: 'DEFAULT', label: 'Active' },
		{ value: 'BROKEN', label: 'Broken' },
		{ value: 'REMOVED', label: 'Retired' },
	];

	return (
		<div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5 p-6 mb-4">
			<h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">
				Status
			</h2>
			{/* State selector as button group */}
			<div className="mb-4">
				<div
					className="flex space-x-1 bg-gray-100 p-1 rounded-lg"
					role="group"
					aria-label="Item state selector"
				>
					{stateOptions.map((option) => (
						<button
							key={option.value}
							onClick={() => onStatusChange(option.value)}
							type="button"
							className={[
								'px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none',
								status === option.value
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-500 hover:text-gray-700',
							].join(' ')}
							aria-pressed={status === option.value}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>
			{/* Dates with improved layout */}
			<div className="space-y-3">
				<div>
					<div className="font-semibold text-gray-800 text-xs">Next Check</div>
					<div className="text-gray-700 text-sm">
						{nextCheck ? dayjs(nextCheck).format('DD.MM.YYYY, HH:mm') : '-'}
					</div>
				</div>
				<div>
					<div className="font-semibold text-gray-800 text-xs">
						Last Scanned
					</div>
					<div className="text-gray-700 text-sm">
						{lastScanned ? dayjs(lastScanned).format('DD.MM.YYYY, HH:mm') : '-'}
					</div>
				</div>
				<div>
					<div className="font-semibold text-gray-800 text-xs">Created</div>
					<div className="text-gray-700 text-sm">
						{createdAt ? dayjs(createdAt).format('DD.MM.YYYY, HH:mm') : '-'}
					</div>
				</div>
				<div>
					<div className="font-semibold text-gray-800 text-xs">Updated</div>
					<div className="text-gray-700 text-sm">
						{updatedAt ? dayjs(updatedAt).format('DD.MM.YYYY, HH:mm') : '-'}
					</div>
				</div>
			</div>
		</div>
	);
};
