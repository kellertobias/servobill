import React, { forwardRef } from 'react';
import { useParams } from 'next/navigation';

import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { useSaveCallback } from '@/hooks/load-data';
import { API, gql } from '@/api/index';

import { useInventoryDrawer } from './use-inventory-drawer';
import { InventoryTypeSelect } from './inventory-type-select';
import { InventoryLocationSelect } from './inventory-location-select';

import type { InventoryItemState } from '@/backend/entities/inventory-item.entity';

type InventoryItem = {
	id: string;
	name: string;
	barcode: string;
	type: string;
	location: string;
	state: string;
	properties: { key: string; value: string }[];
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

		/**
		 * Get current route params using Next.js app router.
		 * - 'view' is the inventory type (e.g., electronics, furniture, etc.)
		 * - 'id' is the location or type id, depending on the route
		 *
		 * This allows us to pre-select type/location when creating a new item.
		 */
		const params = useParams() as { view?: string; id?: string };

		React.useImperativeHandle(ref, () => ({
			openDrawer: (id: string, parentId?: string) => {
				pendingParentIdRef.current = parentId;
				// @ts-expect-error: Imperative handle for drawer open
				ref.current?.openDrawer(id);
			},
		}));
		const { drawerId, handleClose } = useInventoryDrawer({ ref });

		// State for default property keys fetched from the selected type
		const [defaultPropertyKeys, setDefaultPropertyKeys] = React.useState<
			string[]
		>([]);

		/**
		 * Compute initial data for the drawer.
		 * If creating a new item, pre-select type/location from route params if available.
		 * Otherwise, use defaults or parentId if provided.
		 */
		const initialData = React.useMemo(() => {
			return {
				id: 'new',
				name: '',
				barcode: '',
				type: '',
				location: '',
				state: 'DEFAULT',
				properties: [],
			};
		}, []);

		const [data, setData] = React.useState<Partial<InventoryItem>>({
			...initialData,
		});

		// When the drawer is opened, reset data to initialData (for new item)
		React.useEffect(() => {
			setData(() => ({
				...initialData,
				type: params.view === 'type' ? params.id : undefined,
				location: params.view === 'location' ? params.id : undefined,
			}));
			// Only run when drawer is opened (drawerId changes)
		}, [drawerId]);

		/**
		 * Fetches the default properties for a given inventory type id and updates the form state.
		 * Called whenever the type selection changes.
		 * @param typeId The selected inventory type id
		 */
		const fetchTypeProperties = React.useCallback(
			async (typeId: string | null | undefined) => {
				if (!typeId) {
					setDefaultPropertyKeys([]);
					setData((current) => ({ ...current, properties: [] }));
					return;
				}
				try {
					const res = await API.query({
						query: gql(`
							query InventoryItemCreationTypeProperties($id: String!) {
								inventoryType(id: $id) {
									properties
								}
							}
						`),
						variables: { id: typeId },
					});

					const keys = res?.inventoryType?.properties || [];
					setDefaultPropertyKeys(keys);
					// Pre-populate properties with keys and empty values if not already set

					setData((current) => ({
						...current,
						properties: keys.map((key: string) => ({ key, value: '' })),
					}));
				} catch {
					setDefaultPropertyKeys([]);
				}
			},
			[],
		);

		// When the type changes, fetch its default properties
		React.useEffect(() => {
			fetchTypeProperties(data.type);
		}, [data.type, fetchTypeProperties]);

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
				typeId: data.type || undefined,
				locationId: data.location || undefined,
				state: data.state || undefined,
				properties: Array.isArray(data.properties)
					? data.properties
							.filter((p) => p.key && p.key.trim())
							.map((p) => ({ key: p.key, value: p.value }))
					: [],
			}),
		});

		// Helper to determine if a property key is a default (from type)
		const isDefaultPropertyKey = (key: string) =>
			defaultPropertyKeys.includes(key);

		/**
		 * Adds a new custom property row (empty key/value) to the properties array.
		 */
		const handleAddCustomProperty = () => {
			setData((current) => ({
				...current,
				properties: [...(current.properties || []), { key: '', value: '' }],
			}));
		};

		/**
		 * Removes a property row by index. Allows removing both default and custom properties.
		 * @param idx Index of the property to remove
		 */
		const handleRemoveProperty = (idx: number) => {
			setData((current) => {
				const next = [...(current.properties || [])];
				next.splice(idx, 1);
				return { ...current, properties: next };
			});
		};

		/**
		 * Updates a property key or value by index.
		 * Prevents duplicate keys.
		 * @param idx Index of the property
		 * @param field 'key' or 'value'
		 * @param newValue New value for the field
		 */
		const handlePropertyChange = (
			idx: number,
			field: 'key' | 'value',
			newValue: string,
		) => {
			setData((current) => {
				const next = [...(current.properties || [])];
				if (
					field === 'key' && // Prevent duplicate keys
					next.some((p, i) => i !== idx && p.key === newValue)
				) {
					return current;
				}
				next[idx] = { ...next[idx], [field]: newValue };
				return { ...current, properties: next };
			});
		};

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

						{/* Properties section: Render key/value pairs for default and custom properties */}
						<div>
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								Properties
							</label>
							<div className="space-y-2">
								{data.properties?.map((prop, idx) => (
									<div key={idx} className="flex items-center gap-2">
										{/* For default properties, show key as read-only span; for custom, use native input for key */}
										{isDefaultPropertyKey(prop.key) ? (
											<span className="w-32 text-sm text-gray-700">
												{prop.key}
											</span>
										) : (
											<input
												type="text"
												value={prop.key}
												onChange={(e) =>
													handlePropertyChange(idx, 'key', e.target.value)
												}
												placeholder="Property key"
												className="w-32 border rounded px-2 py-1 text-sm"
											/>
										)}
										<Input
											value={prop.value}
											onChange={(value) =>
												handlePropertyChange(idx, 'value', value)
											}
											placeholder={`Enter value for ${prop.key || 'property'}`}
											className="flex-1"
										/>
										<button
											type="button"
											className="text-red-500 hover:text-red-700 px-2"
											onClick={() => handleRemoveProperty(idx)}
											title="Remove property"
										>
											&times;
										</button>
									</div>
								))}
								<button
									type="button"
									className="text-blue-600 hover:text-blue-800 text-sm mt-2"
									onClick={handleAddCustomProperty}
								>
									+ Add property
								</button>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								State
							</label>
							<div
								className="flex space-x-1 bg-gray-100 p-1 rounded-lg"
								role="group"
								aria-label="Item state selector"
							>
								{(
									[
										{ value: 'NEW', label: 'New' },
										{ value: 'DEFAULT', label: 'Active' },
										{ value: 'BROKEN', label: 'Broken' },
										{ value: 'REMOVED', label: 'Retired' },
									] satisfies {
										value: keyof typeof InventoryItemState;
										label: string;
									}[]
								).map((option) => (
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
