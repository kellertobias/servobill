import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema definition for the Settings entity.
 */
export const entitySchema = DynamoDBService.getSchema({
  model: {
    entity: 'settings',
    version: '1',
    service: 'settings',
  },
  attributes: {
    storeId: { type: 'string', required: true },
    settingId: { type: 'string', required: true },
    data: { type: 'string', required: true },
  },
  indexes: {
    byId: {
      pk: { field: 'pk', composite: ['settingId'] },
      sk: { field: 'sk', composite: ['storeId'] },
    },
  },
});

/**
 * Type representing a Settings ORM entity as stored in DynamoDB.
 */
export type SettingsOrmEntity = typeof entitySchema.responseItem;
