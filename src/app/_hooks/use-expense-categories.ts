import React from 'react';

import { API, gql } from '@/api/index';

const getSettingsCategories = async () =>
	API.query({
		query: gql(`
		query GetSettingsCategories {
			settings { categories { id name color description } }
		}
	`),
	}).then((res) => res.settings?.categories || []);

export type ExpenseCategory = Awaited<
	ReturnType<typeof getSettingsCategories>
>[number];

/**
 * Custom React hook to fetch expense categories from system settings.
 * Returns an array of categories with id, name, color, and description.
 *
 * The 'categories' field is available on the 'settings' query result as per the schema.
 */
export function useExpenseCategories() {
	// State to hold the fetched categories
	const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);

	React.useEffect(() => {
		(async () => {
			const res = await getSettingsCategories();
			setCategories(res || []);
		})();
	}, []);

	return categories;
}
