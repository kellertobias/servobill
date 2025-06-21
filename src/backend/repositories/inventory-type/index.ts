import '@/backend/services/config.service';
// InventoryType repository exports: interface, DI tokens, and implementations
export * from './interface';
export * from './di-tokens';

export * from './inventory-type.dynamodb-repository';
export * from './inventory-type.relational-repository';
