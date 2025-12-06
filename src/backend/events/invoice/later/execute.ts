import {
	InvoiceSubmissionEntity,
	InvoiceSubmissionType,
} from '@/backend/entities/invoice-submission.entity';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import {
	EXPENSE_REPOSITORY,
	type ExpenseRepository,
} from '@/backend/repositories';
import { INVOICE_REPOSITORY } from '@/backend/repositories/invoice/di-tokens';
import type { InvoiceRepository } from '@/backend/repositories/invoice/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import type { InvoiceSendLaterEvent } from './event';

/**
 * HandlerExecution for the 'send later' invoice event.
 *
 * This handler is triggered when a scheduled invoice send is due. It:
 * 1. Loads the invoice and settings.
 * 2. Triggers addSubmission (as EMAIL, now).
 * 3. Cancels the original scheduled submission and deletes the scheduled job.
 * 4. Saves the invoice.
 *
 * This ensures the invoice is sent as if the user clicked 'send now', and cleans up the schedule.
 */
@Service()
export class HandlerExecution {
	private readonly logger = new Logger('InvoiceSendLaterHandler');

	constructor(
		@Inject(INVOICE_REPOSITORY)
		private readonly invoiceRepository: InvoiceRepository,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
	) {}

	async execute(event: InvoiceSendLaterEvent) {
		// this.logger.info('Triggered send-later handler', { event });

		// 1. Load the invoice
		const invoice = await this.invoiceRepository.getById(event.invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}

		// 2. Find the original scheduled submission (by scheduledSendJobId)
		const scheduledJobId = invoice.scheduledSendJobId;
		if (!scheduledJobId) {
			throw new Error('No scheduled job found for this invoice');
		}
		const originalSubmission = invoice.submissions.find(
			(sub) => sub.scheduledSendJobId === scheduledJobId && sub.isScheduled,
		);
		if (!originalSubmission) {
			throw new Error('Original scheduled submission not found');
		}
		if (originalSubmission.isCancelled) {
			throw new Error('Original scheduled submission is already cancelled');
		}

		// remove the original submission (the job is already gone)
		// we will create a new submission right after
		invoice.submissions = invoice.submissions.filter(
			(sub) => sub.scheduledSendJobId !== scheduledJobId,
		);

		// now we add the submission and by this trigger the
		// sending of the email
		await invoice.addSubmission(
			new InvoiceSubmissionEntity({
				type: InvoiceSubmissionType.EMAIL,
				submittedAt: new Date(),
			}),
			event.userName,
			async () => {
				const setting = await this.settingsRepository.getSetting(
					InvoiceSettingsEntity,
				);
				if (!setting) {
					throw new Error('Invoice Settings not found');
				}
				return setting;
			},
		);

		await this.invoiceRepository.save(invoice);

		await invoice.createAndLinkExpensesForInvoice(async (data) => {
			const expense = await this.expenseRepository.create();
			expense.update(data);
			await this.expenseRepository.save(expense);
			return expense;
		});
		await this.invoiceRepository.save(invoice);

		this.logger.info('Invoice sent and schedule cleaned up', {
			invoiceId: invoice.id,
		});
	}
}
