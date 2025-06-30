import React from 'react';

import SelectInput from '@/components/select-input';
import { API, gql } from '@/api/index';

import { InventoryTypeDetail } from '../types';

/**
 * Flattens a tree of inventory types into a flat array with depth for indentation.
 * @param nodes - The tree nodes (types)
 * @param depth - Current depth (for indentation)
 * @param excludeId - Optional id to exclude (e.g., current type)
 * @returns Array of { value, label, depth }
 */
function flattenTypeTree(
	nodes: InventoryTypeDetail[],
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
				flattenTypeTree(
					node.children as InventoryTypeDetail[],
					depth + 1,
					excludeId,
				),
			);
		}
	});
	return result;
}

/**
 * InventoryTypeSelect component for selecting a type from the hierarchy.
 * Indents options according to their depth in the tree.
 *
 * @param value - The selected type id
 * @param onChange - Callback when selection changes
 * @param excludeId - Optional id to exclude (e.g., current type)
 * @param label - Optional label for the select
 * @param placeholder - Optional placeholder
 */
export function InventoryTypeSelect({
	value,
	onChange,
	excludeId,
	label = 'Parent Type',
	placeholder = 'Select parent type (optional)',
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
				query InventoryTypesTree {
					inventoryTypes(where: { rootOnly: true }) {
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
			`),
		})
			.then((res) => {
				// The API returns a partial tree, but we only need id, name, children for the dropdown
				const tree = (res.inventoryTypes ||
					[]) as unknown as InventoryTypeDetail[];
				const flat = flattenTypeTree(tree, 0, excludeId);
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
