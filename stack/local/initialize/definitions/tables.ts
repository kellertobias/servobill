export const tableDefinitions = {
  electrodb: {
    fields: {
      pk: 'string' as const,
      sk: 'string' as const,
      gsi1pk: 'string' as const,
      gsi1sk: 'string' as const,
    },
    primaryIndex: {
      partitionKey: 'pk' as const,
      sortKey: 'sk' as const,
    },
    globalIndexes: {
      'gsi1pk-gsi1sk-index': {
        partitionKey: 'gsi1pk',
        sortKey: 'gsi1sk',
        projection: 'all',
      },
    },
  },
} as const;
