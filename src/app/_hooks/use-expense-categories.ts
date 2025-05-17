import React from 'react';
import { API, gql } from '@/api/index';

/**
 * Custom React hook to fetch expense categories from system settings.
 * Returns an array of categories with id, name, color, and description.
 */
export function useExpenseCategories() {
	const [categories, setCategories] = React.useState<any[]>([]);

	React.useEffect(() => {
		API.query({
			query: gql(`
				query GetSettingsCategories {
					settings { categories { id name color description } }
				}
			`) as any,
		}).then((res) => setCategories((res as any).settings.categories || []));
	}, []);

	return categories;
}
