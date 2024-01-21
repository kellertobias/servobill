import 'reflect-metadata';

import { SNSEventHandler } from '../../types';

import { withInstrumentation } from '@/backend/instrumentation';

export const handlerName = 'handler';
export const method = 'SNS';
export const handler: SNSEventHandler = withInstrumentation(
	{
		name: 'sns.delivery-status',
	},
	async (event) => {
		const records = event.Records || [];
		// const invoiceRepository = DefaultContainer.get(InvoiceRepository);
		// const emailRepository = DefaultContainer.get(EmailRepository);

		for (const record of records) {
			console.log(record.Sns);
			const message = JSON.parse(record.Sns.Message);
			console.log(message);
		}

		// const invoice = await invoiceRepository.getById(event.invoiceId);

		// if (!invoice) {
		// 	console.log('Invoice not found', { event });
		// 	return;
		// }

		// invoice.addActivity(
		// 	new InvoiceActivityEntity({
		// 		type: InvoiceActivityType.EMAIL_SENT,
		// 	}),
		// );

		// await invoiceRepository.save(invoice);
	},
);
