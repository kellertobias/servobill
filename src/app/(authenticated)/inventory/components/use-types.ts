import React, { useState } from 'react';

import { API, gql } from '@/api/index';

/**
 * Custom hook to fetch all inventory types for use as parent options in the type drawer.
 * Excludes the current type (by id) if editing, to prevent circular parenting.
 *
 * @param drawerId - The id of the currently edited type, or 'new' for creation.
 * @returns { types } - Array of { id, name } for all types except the current one.
 */
export const useTypes = (drawerId: string | null) => {
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    if (!drawerId) {
      return;
    }
    API.query({
      query: gql(`
                query AllInventoryTypesForParent {
                    inventoryTypes { id name }
                }
            `),
    })
      .then((res) => {
        let nextTypes = (res.inventoryTypes || []) as Array<{
          id: string;
          name: string;
        }>;
        if (drawerId !== 'new') {
          nextTypes = nextTypes.filter((type) => type.id !== drawerId);
        }
        setTypes(nextTypes);
        return;
      })
      .catch(() => {});
  }, [drawerId]);

  return {
    types,
  };
};
