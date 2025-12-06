// PDFInvoiceGenerator: Strategy for generating PDF invoices only.

import type { InvoiceEntity } from '@/backend/entities/invoice.entity';
import type {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import type { ConfigService } from '../config.service';
import type { FileStorageService } from '../file-storage.service';
import { Logger } from '../logger.service';
import { InvoiceGeneratorStrategy } from './interface';

/**
 * PDFInvoiceGenerator generates a PDF invoice using CQRS handlers.
 * This is the default strategy for standard PDF invoices.
 */
export class StorageLoaderStrategy extends InvoiceGeneratorStrategy {
	private readonly logger = new Logger('StorageLoaderStrategy');

	constructor(
		private fileStorageService: FileStorageService,
		private config: ConfigService,
	) {
		super();
	}

	async store(invoice: InvoiceEntity, file: Buffer, filename: string) {
		const key = `${invoice.id}/${Date.now()}_${filename}`;
		await this.fileStorageService.saveFile(key, file, {
			bucket: this.config.buckets.files,
		});

		invoice.updatePdf({
			bucket: this.config.buckets.files,
			key,
			region: this.config.region,
		});
	}

	/**
	 * Generates a PDF invoice using the CQRS bus and returns it as a single attachment.
	 */
	async generate(
		invoice: InvoiceEntity,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string }[]> {
		if (!invoice.pdf?.key) {
			throw new Error('PDF key missing');
		}

		this.logger.info('PDF exists. Downloading', {
			invoiceId: invoice.id,
			key: invoice.pdf.key,
		});
		// Get pdf from storage abstraction
		if (!invoice.pdf.key) {
			throw new Error('PDF bucket or key missing');
		}
		const file = await this.fileStorageService.getFile(invoice.pdf.key, {
			bucket: invoice.pdf.bucket,
		});
		return [
			{
				content: file,
				filename: 'invoice.pdf',
			},
		];
	}
}
