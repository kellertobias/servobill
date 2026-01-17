
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BackupHandler } from './execute';
import {
    BackupFrequency,
    BackupSettingsEntity,
    CompanyDataSetting,
    ExpenseSettingsEntity,
    InvoiceSettingsEntity,
    PdfTemplateSetting,
    SettingsEntity
} from '@/backend/entities/settings.entity';
import {
  type InvoiceRepository,
  type ExpenseRepository,
  type CustomerRepository,
  type ProductRepository,
  type InventoryItemRepository,
  type InventoryTypeRepository,
  type InventoryLocationRepository,
  type SettingsRepository,
  type TimeBasedJobRepository
} from '@/backend/repositories';
import { SESService } from '@/backend/services/ses.service';

describe('BackupHandler', () => {
    let handler: BackupHandler;
    let invoiceRepo: InvoiceRepository;
    let expenseRepo: ExpenseRepository;
    let customerRepo: CustomerRepository;
    let productRepo: ProductRepository;
    let inventoryItemRepo: InventoryItemRepository;
    let inventoryTypeRepo: InventoryTypeRepository;
    let inventoryLocationRepo: InventoryLocationRepository;
    let settingsRepo: SettingsRepository;
    let sesService: SESService;
    let timeBasedJobRepo: TimeBasedJobRepository;

    const mockBackupSettings = new BackupSettingsEntity({
        backupEnabled: true,
        backupEmail: 'test@example.com',
        backupFrequency: BackupFrequency.WEEKLY,
    }, async () => {});

    const mockCompanyData = new CompanyDataSetting({
        sendFrom: 'sender@example.com'
    }, async () => {});

    beforeEach(() => {
        invoiceRepo = { listByQuery: vi.fn().mockResolvedValue([]) } as any;
        expenseRepo = { listByQuery: vi.fn().mockResolvedValue([]) } as any;
        customerRepo = { listByQuery: vi.fn().mockResolvedValue([]) } as any;
        productRepo = { listByQuery: vi.fn().mockResolvedValue([]) } as any;
        inventoryItemRepo = { listByQuery: vi.fn().mockResolvedValue([]) } as any;
        inventoryTypeRepo = { listByQuery: vi.fn().mockResolvedValue([]) } as any;
        inventoryLocationRepo = { listByQuery: vi.fn().mockResolvedValue([]) } as any;
        settingsRepo = {
            getSetting: vi.fn((entityClass) => {
                if (entityClass === BackupSettingsEntity) return Promise.resolve(mockBackupSettings);
                if (entityClass === CompanyDataSetting) return Promise.resolve(mockCompanyData);
                if (entityClass === InvoiceSettingsEntity) return Promise.resolve(new InvoiceSettingsEntity({}, async () => {}));
                if (entityClass === ExpenseSettingsEntity) return Promise.resolve(new ExpenseSettingsEntity({}, async () => {}));
                if (entityClass === PdfTemplateSetting) return Promise.resolve(new PdfTemplateSetting({}, async () => {}));
                return Promise.resolve(null);
            })
        } as any;
        sesService = { sendEmail: vi.fn().mockResolvedValue({}) } as any;
        timeBasedJobRepo = { create: vi.fn().mockResolvedValue({ id: 'job-1' }) } as any;

        handler = new BackupHandler(
            invoiceRepo,
            expenseRepo,
            customerRepo,
            productRepo,
            inventoryItemRepo,
            inventoryTypeRepo,
            inventoryLocationRepo,
            settingsRepo,
            sesService,
            timeBasedJobRepo
        );
    });

    it('should skip backup if disabled', async () => {
        mockBackupSettings.backupEnabled = false;
        await handler.handle();
        expect(invoiceRepo.listByQuery).not.toHaveBeenCalled();
    });

    it('should skip backup if no email set', async () => {
        mockBackupSettings.backupEnabled = true;
        mockBackupSettings.backupEmail = '';
        await handler.handle();
        expect(invoiceRepo.listByQuery).not.toHaveBeenCalled();
    });

    it('should execute backup and send email', async () => {
        mockBackupSettings.backupEnabled = true;
        mockBackupSettings.backupEmail = 'test@example.com';

        await handler.handle();

        expect(invoiceRepo.listByQuery).toHaveBeenCalled();
        expect(sesService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@example.com',
            subject: expect.stringContaining('Your Data Backup'),
            attachments: expect.arrayContaining([
                expect.objectContaining({ filename: 'invoices.json' }),
                expect.objectContaining({ filename: 'expenses.json' }),
            ])
        }));
    });

    it('should reschedule after execution', async () => {
        mockBackupSettings.backupEnabled = true;
        mockBackupSettings.backupEmail = 'test@example.com';
        mockBackupSettings.backupFrequency = BackupFrequency.WEEKLY;

        await handler.handle();

        expect(timeBasedJobRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'backup.execute',
        }));
    });
});
