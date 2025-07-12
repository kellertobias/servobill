import { registerEnumType } from 'type-graphql';

import { InvoiceActivityType } from '@/backend/entities/invoice-activity.entity';
import { InvoiceSubmissionType } from '@/backend/entities/invoice-submission.entity';
import { InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import {
	InventoryItemState,
	InventoryCheckState,
	InventoryHistoryType,
} from '@/backend/entities/inventory-item.entity';
import {
	InvoiceOutputFormat,
	VatStatus,
} from '@/backend/entities/settings.entity';

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

registerEnumType(InvoiceOutputFormat, {
	name: 'InvoiceOutputFormat',
	description: 'Supported output formats for digital invoices',
});

/**
 * Enum representing the VAT/tax status of the company.
 *
 * - VAT_ENABLED: VAT is enabled and invoices include VAT.
 * - VAT_DISABLED_KLEINUNTERNEHMER: VAT is disabled due to Kleinunternehmerregelung (§ 19 UStG, Germany).
 * - VAT_DISABLED_OTHER: VAT is disabled for other reasons (e.g., non-profit, foreign entity, etc).
 */
registerEnumType(VatStatus, {
	name: 'VatStatus',
	description:
		'VAT/tax status of the company (affects invoice tax display and legal compliance)',
});
