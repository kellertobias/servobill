import React from 'react';

import SelectInput from '@/components/select-input';
import { API, gql } from '@/api/index';

import { InventoryLocationDetail } from '../types';

/**
 * Flattens a tree of inventory locations into a flat array with depth for indentation.
 * @param nodes - The tree nodes (locations)
 * @param depth - Current depth (for indentation)
 * @param excludeId - Optional id to exclude (e.g., current location)
 * @returns Array of { value, label, depth }
 */
function flattenLocationTree(
	nodes: InventoryLocationDetail[],
	depth = 0,
	excludeId?: string,
): Array<{ value: string; label: string; depth: number }> {
	let result: Array<{ value: string; label: string; depth: number }> = [];
	nodes.forEach((node) => {
		if (excludeId && node.id === excludeId) {
			return;
		}
		result.push({ value: node.id, label: node.name, depth });
		if (node.children && node.children.length > 0) {
			result = result.concat(
				flattenLocationTree(
					node.children as InventoryLocationDetail[],
					depth + 1,
					excludeId,
				),
			);
		}
	});
	return result;
}

/**
 * InventoryLocationSelect component for selecting a location from the hierarchy.
 * Indents options according to their depth in the tree.
 *
 * @param value - The selected location id
 * @param onChange - Callback when selection changes
 * @param excludeId - Optional id to exclude (e.g., current location)
 * @param label - Optional label for the select
 * @param placeholder - Optional placeholder
 */
export function InventoryLocationSelect({
	value,
	onChange,
	excludeId,
	label,
	placeholder = 'Select parent location (optional)',
}: {
	value: string | null | undefined;
	onChange: (value: string | null) => void;
	excludeId?: string;
	label?: string;
	placeholder?: string;
}) {
	const [options, setOptions] = React.useState<
		Array<{ value: string; label: string; depth: number }>
	>([]);

	React.useEffect(() => {
		API.query({
			query: gql(`
				query InventoryLocationsTree {
					inventoryLocations(where: { rootOnly: true }) {
						id
						name
						children {
							id
							name
							children {
								id
								name
							}
						}
					}
				}
			`) as unknown as import('@graphql-typed-document-node/core').TypedDocumentNode<
				unknown,
				unknown
			>,
		})
			.then((res) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const tree = ((res as any).inventoryLocations ||
					[]) as unknown as InventoryLocationDetail[];
				const flat = flattenLocationTree(tree, 0, excludeId);
				setOptions(flat);
				return null;
			})
			.catch(() => null);
	}, [excludeId]);

	return (
		<SelectInput
			label={label}
			value={value || ''}
			onChange={onChange}
			options={[
				{ value: '', label: 'No parent (root)' },
				...options.map((opt) => ({
					value: opt.value,
					label: `${'\u00A0'.repeat(opt.depth * 4)}${opt.label}`,
				})),
			]}
			placeholder={placeholder}
			className="mb-2"
		/>
	);
}
