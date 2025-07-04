import { registerEnumType } from 'type-graphql';

import { InvoiceActivityType } from '@/backend/entities/invoice-activity.entity';
import { InvoiceSubmissionType } from '@/backend/entities/invoice-submission.entity';
import { InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import {
	InventoryItemState,
	InventoryCheckState,
	InventoryHistoryType,
} from '@/backend/entities/inventory-item.entity';

// Register enums for GraphQL
registerEnumType(InventoryItemState, {
	name: 'InventoryItemState',
	description: 'The state of an inventory item',
});

registerEnumType(InventoryCheckState, {
	name: 'InventoryCheckState',
	description: 'The state of a check for an inventory item',
});

registerEnumType(InventoryHistoryType, {
	name: 'InventoryHistoryType',
	description: 'The type of history entry for an inventory item',
});

registerEnumType(InvoiceStatus, {
	name: 'InvoiceStatus', // Mandatory
	description: 'Invoice status', // Optional
});

registerEnumType(InvoiceType, {
	name: 'InvoiceType', // Mandatory
	description: 'Invoice or Offer', // Optional
});

registerEnumType(InvoiceActivityType, {
	name: 'InvoiceActivityType', // Mandatory
	description: 'Type of Activity Log entry', // Optional
});

registerEnumType(InvoiceSubmissionType, {
	name: 'InvoiceSubmissionType',
	description: 'The way(s) the invoice was submitted',
});
