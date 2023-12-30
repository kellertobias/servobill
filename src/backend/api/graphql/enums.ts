import { registerEnumType } from 'type-graphql';

import { InvoiceActivityType } from '@/backend/entities/invoice-activity.entity';
import { InvoiceSubmissionType } from '@/backend/entities/invoice-submission.entity';
import { InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';

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
