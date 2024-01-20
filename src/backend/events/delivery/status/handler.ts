import 'reflect-metadata';

import { EventHandler } from '../../types';

export const handlerName = 'handler';
export const handler: EventHandler = async (event) => {
	// const invoiceRepository = DefaultContainer.get(InvoiceRepository);
	// const emailRepository = DefaultContainer.get(EmailRepository);

	console.log(event);

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
};
