import React, { useState } from 'react';

import { API, gql } from '@/api/index';

export const useLocations = (drawerId: string | null) => {
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    if (!drawerId) {
      return;
    }
    API.query({
      query: gql(`
                query AllInventoryLocationsForParent {
                    inventoryLocations { id name }
                }
            `),
    })
      .then((res) => {
        let nextLocations = (res.inventoryLocations || []) as Array<{
          id: string;
          name: string;
        }>;
        if (drawerId !== 'new') {
          nextLocations = nextLocations.filter((loc) => loc.id !== drawerId);
        }
        setLocations(nextLocations);
        return;
      })
      .catch(() => {});
  }, [drawerId]);

  return {
    locations,
  };
};
