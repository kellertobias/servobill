import dayjs from 'dayjs';
import {
	BackupFrequency,
	BackupSettingsEntity,
	CompanyDataSetting,
	ExpenseSettingsEntity,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import {
	CUSTOMER_REPOSITORY,
	type CustomerRepository,
	EXPENSE_REPOSITORY,
	type ExpenseRepository,
	INVENTORY_ITEM_REPOSITORY,
	INVENTORY_LOCATION_REPOSITORY,
	INVENTORY_TYPE_REPOSITORY,
	INVOICE_REPOSITORY,
	type InventoryItemRepository,
	type InventoryLocationRepository,
	type InventoryTypeRepository,
	type InvoiceRepository,
	PRODUCT_REPOSITORY,
	type ProductRepository,
	SETTINGS_REPOSITORY,
	type SettingsRepository,
} from '@/backend/repositories';
import { Logger } from '@/backend/services/logger.service';
import { SESService } from '@/backend/services/ses.service';
import { Inject, Service } from '@/common/di';

import '@/backend/repositories';

@Service()
export class BackupHandler {
	private readonly logger = new Logger('BackupHandler');

	constructor(
		@Inject(INVOICE_REPOSITORY) private invoiceRepository: InvoiceRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
		@Inject(CUSTOMER_REPOSITORY) private customerRepository: CustomerRepository,
		@Inject(PRODUCT_REPOSITORY) private productRepository: ProductRepository,
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private inventoryItemRepository: InventoryItemRepository,
		@Inject(INVENTORY_TYPE_REPOSITORY)
		private inventoryTypeRepository: InventoryTypeRepository,
		@Inject(INVENTORY_LOCATION_REPOSITORY)
		private inventoryLocationRepository: InventoryLocationRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(SESService) private sesService: SESService,
	) {}

	public async handle() {
		this.logger.info('Starting backup...');

		const backupSettings =
			await this.settingsRepository.getSetting(BackupSettingsEntity);
		if (!backupSettings.backupEnabled || !backupSettings.backupEmail) {
			this.logger.info('Backup disabled or email not set. Skipping.');
			return;
		}

		// Fetch all data
		const invoices = await this.invoiceRepository.listByQuery({});
		const expenses = await this.expenseRepository.listByQuery({});
		const customers = await this.customerRepository.listByQuery({});
		const products = await this.productRepository.listByQuery({});
		const inventoryItems = await this.inventoryItemRepository.listByQuery({});
		const inventoryTypes = await this.inventoryTypeRepository.listByQuery({});
		const inventoryLocations =
			await this.inventoryLocationRepository.listByQuery({});

		const companyData =
			await this.settingsRepository.getSetting(CompanyDataSetting);
		const invoiceSettings = await this.settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);
		const expenseSettings = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);
		const pdfSettings =
			await this.settingsRepository.getSetting(PdfTemplateSetting);

		const settingsData = {
			companyData: companyData.serializable(),
			invoiceSettings: invoiceSettings.serializable(),
			expenseSettings: expenseSettings.serializable(),
			pdfSettings: pdfSettings.serializable(),
			backupSettings: backupSettings.serializable(),
		};

		const files = [
			{ filename: 'invoices.json', content: JSON.stringify(invoices, null, 2) },
			{ filename: 'expenses.json', content: JSON.stringify(expenses, null, 2) },
			{
				filename: 'customers.json',
				content: JSON.stringify(customers, null, 2),
			},
			{ filename: 'products.json', content: JSON.stringify(products, null, 2) },
			{
				filename: 'inventory.json',
				content: JSON.stringify(
					{
						items: inventoryItems,
						types: inventoryTypes,
						locations: inventoryLocations,
					},
					null,
					2,
				),
			},
			{
				filename: 'settings.json',
				content: JSON.stringify(settingsData, null, 2),
			},
		];

		const MAX_SIZE = 15 * 1024 * 1024; // 15MB
		const totalSize = files.reduce(
			(acc, file) => acc + Buffer.byteLength(file.content),
			0,
		);

		const subject = `Your Data Backup - ${dayjs().format('YYYY-MM-DD')}`;
		const html = `Here is your requested data backup from ${dayjs().format('YYYY-MM-DD HH:mm')}.`;
		const from = companyData.sendFrom || 'noreply@example.com';

		if (totalSize > MAX_SIZE) {
			this.logger.info(
				'Total backup size exceeds limit. Sending multiple emails.',
			);
			for (const file of files) {
				await this.sesService.sendEmail({
					from,
					to: backupSettings.backupEmail,
					subject: `${subject} - ${file.filename}`,
					html: `${html}<br><br>File: ${file.filename}`,
					attachments: [file],
				});
			}
		} else {
			this.logger.info('Sending single email backup.');
			await this.sesService.sendEmail({
				from,
				to: backupSettings.backupEmail,
				subject,
				html,
				attachments: files,
			});
		}

		backupSettings.lastBackupAt = new Date().toISOString();
		await backupSettings.save();

		this.logger.info('Backup completed.');
	}
}
