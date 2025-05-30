import 'reflect-metadata';

import { SNSEventHandler } from '../../types';

import { withInstrumentation, withSpan } from '@/backend/instrumentation';
import { DefaultContainer } from '@/common/di';
import { EMAIL_REPOSITORY, INVOICE_REPOSITORY } from '@/backend/repositories';
import type {
	EmailRepository,
	InvoiceRepository,
} from '@/backend/repositories';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { Logger } from '@/backend/services/logger.service';

const logger = new Logger('sns.delivery-status');

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
		const emailRepository = DefaultContainer.get(
			EMAIL_REPOSITORY,
		) as EmailRepository;

		const messageId = record.mail.messageId;
		const deliveryStatus = record.notificationType;

		const emailState = await emailRepository.getById(messageId);
		if (!emailState) {
			logger.info('Email not found', { messageId });
			return;
		}

		switch (emailState.entityType) {
			case 'invoice': {
				const invoiceRepository = DefaultContainer.get(
					INVOICE_REPOSITORY,
				) as InvoiceRepository;
				const invoice = await invoiceRepository.getById(emailState.entityId);
				if (!invoice) {
					logger.info('Invoice not found', {
						entityType: emailState.entityType,
						entityId: emailState.entityId,
					});
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
				logger.info('Unknown entity type', {
					entityType: emailState.entityType,
					entityId: emailState.entityId,
				});
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
			try {
				const message = JSON.parse(record.Sns.Message);
				await handleSingleRecord(message);
			} catch {
				// Pass
			}
		}
	},
);
