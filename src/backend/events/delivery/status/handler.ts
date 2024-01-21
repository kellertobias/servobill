import 'reflect-metadata';

import { SNSEventHandler } from '../../types';

import { withInstrumentation, withSpan } from '@/backend/instrumentation';
import { DefaultContainer } from '@/common/di';
import { EmailRepository } from '@/backend/repositories/email.repository';
import { InvoiceRepository } from '@/backend/repositories/invoice.repository';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';

type SESDeliveryNote = {
	notificationType: string;
	mail: {
		timestamp: string;
		source: string;
		messageId: string;
		destination: string[];
	};
	delivery: {
		timestamp: string;
		processingTimeMillis: number;
		recipients: string[];
		smtpResponse: string;
		reportingMTA: string;
		remoteMtaIp: string;
	};
};

const handleSingleRecord = withSpan(
	{
		name: 'sns.delivery-status.record',
	},
	async (record: SESDeliveryNote) => {
		const emailRepository = DefaultContainer.get(EmailRepository);

		const messageId = record.mail.messageId;
		const deliveryStatus = record.notificationType;

		const emailState = await emailRepository.getById(messageId);
		if (!emailState) {
			console.log('Email not found', { messageId });
			return;
		}

		switch (emailState.entityType) {
			case 'invoice': {
				const invoiceRepository = DefaultContainer.get(InvoiceRepository);
				const invoice = await invoiceRepository.getById(emailState.entityId);
				if (!invoice) {
					console.log('Invoice not found', { emailState });
					return;
				}
				invoice.addActivity(
					new InvoiceActivityEntity({
						type:
							deliveryStatus === 'Delivery'
								? InvoiceActivityType.EMAIL_DELIVERED
								: InvoiceActivityType.EMAIL_BOUNCED,
					}),
				);
				await invoiceRepository.save(invoice);
				await emailRepository.delete(emailState.id);
				return;
			}
			default: {
				console.log('Unknown entity type', { emailState });
				return;
			}
		}
	},
);

export const handlerName = 'handler';
export const method = 'SNS';
export const handler: SNSEventHandler = withInstrumentation(
	{
		name: 'sns.delivery-status',
	},
	async (event) => {
		const records = event.Records || [];

		for (const record of records) {
			console.log(record.Sns);
			try {
				const message = JSON.parse(record.Sns.Message);
				await handleSingleRecord(message);
			} catch (error) {
				console.error(error);
			}
		}
	},
);
