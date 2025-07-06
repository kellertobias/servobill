import React, { forwardRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { CheckCircleIcon } from '@heroicons/react/20/solid';

import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { useSaveCallback } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { doToast } from '@/components/toast';
import { Button } from '@/components/button';

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

const INITIAL_DATA = {
	id: 'new',
	name: '',
	barcode: '',
	type: '',
	location: '',
	state: 'DEFAULT',
	properties: [],
};

const useTypeProperties = (
	typeId: string | undefined,
	setProperties: (properties: { key: string; value: string }[]) => void,
) => {
	const [defaultPropertyKeys, setDefaultPropertyKeys] = React.useState<
		string[]
	>([]);

	/**
	 * Fetches the default properties for a given inventory type id and updates the form state.
	 * Called whenever the type selection changes.
	 * @param typeId The selected inventory type id
	 */
	const fetchTypeProperties = React.useCallback(
		async (typeId: string | null | undefined) => {
			if (!typeId) {
				setDefaultPropertyKeys([]);
				setProperties([]);
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

				setProperties(keys.map((key: string) => ({ key, value: '' })));
			} catch {
				setDefaultPropertyKeys([]);
			}
		},
		[],
	);

	// When the type changes, fetch its default properties
	React.useEffect(() => {
		fetchTypeProperties(typeId);
	}, [typeId, fetchTypeProperties]);

	return {
		defaultPropertyKeys,
	};
};

const useInventoryItemDrawer = ({
	ref,
	onReload,
}: {
	ref: React.Ref<{ openDrawer: (id: string) => void }>;
	onReload: () => void;
}) => {
	const params = useParams() as { view?: string; id?: string };

	const { drawerId, handleClose } = useInventoryDrawer({
		ref,
		onReload,
	});

	const [data, setData] = React.useState<Partial<InventoryItem>>({
		...INITIAL_DATA,
	});

	// When the drawer is opened, reset data to initialData (for new item)
	React.useEffect(() => {
		setData(() => ({
			...INITIAL_DATA,
			type: params.view === 'type' ? params.id : undefined,
			location: params.view === 'location' ? params.id : undefined,
		}));
		// Only run when drawer is opened (drawerId changes)
	}, [drawerId]);

	const { defaultPropertyKeys } = useTypeProperties(
		data.type,
		(nextProperties) => {
			setData((current) => ({
				...current,
				properties: nextProperties,
			}));
		},
	);

	// Ref to hold the latest onCreated callback for create actions
	const onCreatedRef = React.useRef<((id: string) => void) | null>(null);

	// useSaveCallback must be called at the top level, not inside a callback
	const { onSave } = useSaveCallback({
		id: 'new',
		entityName: 'InventoryItem',
		data,
		initialData: INITIAL_DATA,
		reload: () => onReload?.(),
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
		onSaved: () => {
			doToast({
				message: 'Item created!',
				type: 'success',
				icon: CheckCircleIcon,
			});
			setData((current) => ({
				...current,
				barcode: '',
				id: 'new',
				state: INITIAL_DATA.state,
			}));
		},
		openCreated: (id) => {
			if (onCreatedRef.current) {
				onCreatedRef.current(id);
			}
		},
	});

	return {
		drawerId,
		data,
		setData,
		defaultPropertyKeys,
		onSave,
		onCreatedRef,
		handleClose,
	};
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
		/**
		 * Get current route params using Next.js app router.
		 * - 'view' is the inventory type (e.g., electronics, furniture, etc.)
		 * - 'id' is the location or type id, depending on the route
		 *
		 * This allows us to pre-select type/location when creating a new item.
		 */

		const router = useRouter();
		const {
			drawerId,
			data,
			setData,
			defaultPropertyKeys,
			onSave,
			onCreatedRef,
			handleClose,
		} = useInventoryItemDrawer({ ref, onReload });

		// Helper to determine if a property key is a default (from type)
		const isDefaultPropertyKey = useCallback(
			(key: string) => defaultPropertyKeys.includes(key),
			[defaultPropertyKeys],
		);

		/**
		 * Adds a new custom property row (empty key/value) to the properties array.
		 */
		const handleAddCustomProperty = useCallback(() => {
			setData((current) => ({
				...current,
				properties: [...(current.properties || []), { key: '', value: '' }],
			}));
		}, [setData]);

		/**
		 * Removes a property row by index. Allows removing both default and custom properties.
		 * @param idx Index of the property to remove
		 */
		const handleRemoveProperty = useCallback(
			(idx: number) => {
				setData((current) => {
					const next = [...(current.properties || [])];
					next.splice(idx, 1);
					return { ...current, properties: next };
				});
			},
			[setData],
		);

		/**
		 * Updates a property key or value by index.
		 * Prevents duplicate keys.
		 * @param idx Index of the property
		 * @param field 'key' or 'value'
		 * @param newValue New value for the field
		 */
		const handlePropertyChange = useCallback(
			(idx: number, field: 'key' | 'value', newValue: string) => {
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
			},
			[setData],
		);

		// State for loading status of create actions
		const [creating, setCreating] = React.useState<'next' | 'open' | null>(
			null,
		);

		/**
		 * Handler for creating an item and then resetting the form (Create & Next).
		 * Shows a success toast and resets the form for a new item.
		 */
		const handleCreateAndNext = useCallback(async () => {
			setCreating('next');
			onCreatedRef.current = () => {
				setCreating(null);
				onCreatedRef.current = null;
			};
			await onSave?.();
		}, [onSave, onCreatedRef]);

		/**
		 * Handler for creating an item and navigating to its detail page (Create & Open).
		 * Navigates to the new item's page on success.
		 */
		const handleCreateAndOpen = useCallback(async () => {
			setCreating('open');
			onCreatedRef.current = (createdId) => {
				if (createdId) {
					router.push(`/inventory/item/${createdId}`);
				}
				setCreating(null);
				onCreatedRef.current = null;
			};
			await onSave?.();
		}, [onSave, onCreatedRef, router]);

		if (!data) {
			return null;
		}

		return (
			<Drawer
				id={drawerId}
				title={'New Item'}
				subtitle={data.name}
				onClose={handleClose}
				onCancel={handleClose}
				cancelText="Cancel"
				customButtons={
					<div className="flex gap-2 justify-end">
						<Button
							onClick={handleCreateAndNext}
							primary
							loading={creating === 'next'}
							disabled={creating !== null}
						>
							Create & Next
						</Button>
						<Button
							onClick={handleCreateAndOpen}
							success
							loading={creating === 'open'}
							disabled={creating !== null}
						>
							Create & Open
						</Button>
					</div>
				}
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
					</div>
				</div>
			</Drawer>
		);
	},
);

export { EditInventoryItemDrawer };
