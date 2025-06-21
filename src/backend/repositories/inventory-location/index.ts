import '@/backend/services/config.service';
// InventoryLocation repository exports: interface, DI tokens, and implementations
export * from './interface';
export * from './di-tokens';

export * from './inventory-location.dynamodb-repository';
export * from './inventory-location.relational-repository';
