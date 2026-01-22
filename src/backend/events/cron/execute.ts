import dayjs from 'dayjs';
import {
	BackupFrequency,
	BackupSettingsEntity,
} from '@/backend/entities/settings.entity';
import { BackupExecuteEvent } from '@/backend/events/backup/event';
import {
	SETTINGS_REPOSITORY,
	type SettingsRepository,
} from '@/backend/repositories';
import { TIME_BASED_JOB_REPOSITORY } from '@/backend/repositories/time-based-job/di-tokens';
import type { TimeBasedJobRepository } from '@/backend/repositories/time-based-job/interface';
import { EVENTBUS_SERVICE } from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import type { CronEvent } from './event';

import '@/backend/repositories';

/**
 * HandlerExecution for the cron event handler.
 * Fetches due time-based jobs and dispatches their events on the event bus.
 */
@Service()
export class HandlerExecution {
	private readonly logger = new Logger('CronHandler');

	constructor(
		@Inject(TIME_BASED_JOB_REPOSITORY)
		private readonly jobRepository: TimeBasedJobRepository,
		@Inject(EVENTBUS_SERVICE)
		private readonly eventBus: EventBusService,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
	) {}

	/**
	 * Executes the cron event handler logic:
	 * - Fetches all jobs due at or before now
	 * - Sends each job's event on the event bus
	 * - Deletes the job after dispatch
	 *
	 * @param event The CronEvent triggering this execution
	 */
	async execute(event: CronEvent): Promise<void> {
		this.logger.info('Cron handler triggered', {
			eventId: event.id,
			triggeredAt: event.triggeredAt,
		});

		// Check and trigger backup if needed
		try {
			const backupSettings =
				await this.settingsRepository.getSetting(BackupSettingsEntity);

			if (this.shouldTriggerBackup(backupSettings)) {
				this.logger.info('Backup due. Triggering BackupExecuteEvent.');
				await this.eventBus.send('backup.execute', new BackupExecuteEvent());

				backupSettings.lastBackupAt = new Date().toISOString();
				await backupSettings.save();
			}
		} catch (error) {
			this.logger.error('Failed to check backup schedule', { error });
		}

		const now = Date.now();
		let jobs: any;
		try {
			jobs = await this.jobRepository.listDueJobs(now);
			this.logger.info(`Found ${jobs.length} due jobs`, { count: jobs.length });
		} catch (error) {
			this.logger.error('Failed to fetch due jobs', { error: error });
			throw error;
		}

		for (const job of jobs) {
			try {
				// Send the event using the job's eventType and eventPayload
				await this.eventBus.send(job.eventType, job.eventPayload);
				this.logger.info('Dispatched job event', {
					jobId: job.id,
					eventType: job.eventType,
				});
				// Delete the job after successful dispatch
				await this.jobRepository.delete(job.id);
				this.logger.info('Deleted job after dispatch', { jobId: job.id });
			} catch (error) {
				this.logger.error('Failed to dispatch or delete job', {
					jobId: job.id,
					error: error,
				});
				// Continue processing other jobs
			}
		}
	}

	private shouldTriggerBackup(backupSettings: BackupSettingsEntity): boolean {
		if (!backupSettings.backupEnabled) {
			return false;
		}

		const lastBackup = backupSettings.lastBackupAt
			? dayjs(backupSettings.lastBackupAt)
			: null;

		if (!lastBackup) {
			return true;
		}

		const now = dayjs();
		let threshold = now;

		switch (backupSettings.backupFrequency) {
			case BackupFrequency.DAILY:
				threshold = lastBackup.add(1, 'day');
				break;
			case BackupFrequency.WEEKLY:
				threshold = lastBackup.add(1, 'week');
				break;
			case BackupFrequency.MONTHLY:
				threshold = lastBackup.add(1, 'month');
				break;
			default:
				threshold = lastBackup.add(1, 'week');
		}

		return now.isAfter(threshold);
	}
}
