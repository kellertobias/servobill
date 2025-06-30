import React, { forwardRef } from 'react';

import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { useSaveCallback } from '@/hooks/load-data';

import { useInventoryDrawer } from './use-inventory-drawer';
import { InventoryTypeSelect } from './inventory-type-select';
import { InventoryLocationSelect } from './inventory-location-select';

type InventoryItem = {
	id: string;
	name: string;
	barcode: string;
	type: string;
	location: string;
	state: string;
};

/**
 * Drawer component for creating or editing an inventory item.
 * Exposes an imperative openDrawer(id) method via ref.
 * Uses useLoadData and useSaveCallback for data management.
 *
 * @param {object} props
 * @param {() => void} props.onReload - Callback to trigger reload after save/delete.
 * @param {React.Ref<{ openDrawer: (id: string) => void }>} ref - Ref to control the drawer imperatively.
 */
const EditInventoryItemDrawer = forwardRef(
	(
		{ onReload }: { onReload: () => void },
		ref: React.Ref<{ openDrawer: (id: string) => void }>,
	) => {
		// Use a ref to store the pending parentId for new item creation
		const pendingParentIdRef = React.useRef<string | undefined>();
		React.useImperativeHandle(ref, () => ({
			openDrawer: (id: string, parentId?: string) => {
				pendingParentIdRef.current = parentId;
				// @ts-expect-error: Imperative handle for drawer open
				ref.current?.openDrawer(id);
			},
		}));
		const { drawerId, handleClose } = useInventoryDrawer({ ref });

		const initialData = React.useMemo(
			() => ({
				id: 'new',
				name: '',
				barcode: '',
				type: pendingParentIdRef.current ?? '',
				location: pendingParentIdRef.current ?? '',
				state: 'ACTIVE',
			}),
			[pendingParentIdRef.current],
		);

		const [data, setData] = React.useState<Partial<InventoryItem>>(initialData);

		// useSaveCallback for saving changes
		const { onSave } = useSaveCallback({
			id: 'new',
			entityName: 'InventoryItem',
			data,
			initialData,
			reload: () => {
				onReload?.();
			},
			mapper: (data) => ({
				name: data.name,
				barcode: data.barcode || undefined,
				type: data.type || undefined,
				location: data.location || undefined,
				state: data.state || undefined,
			}),
		});

		if (!data) {
			return null;
		}

		return (
			<Drawer
				id={drawerId}
				title={'New Item'}
				subtitle={initialData?.name}
				onClose={handleClose}
				onCancel={handleClose}
				onSave={
					onSave
						? async () => {
								await onSave?.();
								handleClose();
							}
						: undefined
				}
				saveText={'Create'}
				cancelText="Cancel"
			>
				<div className="divide-y divide-gray-200 px-4 sm:px-6">
					<div className="space-y-6 pb-5 pt-6">
						{/* Name input */}
						<Input
							label="Name"
							value={data.name}
							onChange={(name) => setData((current) => ({ ...current, name }))}
							placeholder="Item name"
						/>
						{/* Barcode input */}
						<Input
							label="Barcode (optional)"
							value={data.barcode}
							onChange={(barcode) =>
								setData((current) => ({ ...current, barcode }))
							}
							placeholder="Barcode (optional)"
						/>
						{/* Type select */}
						<InventoryTypeSelect
							value={data.type}
							onChange={(type) =>
								setData((current) => ({ ...current, type: type ?? '' }))
							}
						/>
						{/* Location select */}
						<InventoryLocationSelect
							value={data.location}
							onChange={(location) =>
								setData((current) => ({ ...current, location: location ?? '' }))
							}
						/>

						<div>
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								State
							</label>
							<div
								className="flex space-x-1 bg-gray-100 p-1 rounded-lg"
								role="group"
								aria-label="Item state selector"
							>
								{[
									{ value: 'ACTIVE', label: 'Active' },
									{ value: 'INACTIVE', label: 'Inactive' },
									{ value: 'LOST', label: 'Lost' },
									{ value: 'RETIRED', label: 'Retired' },
								].map((option) => (
									<button
										key={option.value}
										onClick={() =>
											setData((current) => ({
												...current,
												state: option.value,
											}))
										}
										type="button"
										className={[
											'px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none',
											data.state === option.value
												? 'bg-white text-gray-900 shadow-sm'
												: 'text-gray-500 hover:text-gray-700',
										].join(' ')}
										aria-pressed={data.state === option.value}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			</Drawer>
		);
	},
);

export { EditInventoryItemDrawer };
