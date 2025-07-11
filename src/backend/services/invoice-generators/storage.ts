// PDFInvoiceGenerator: Strategy for generating PDF invoices only.
import { FileStorageService } from '../file-storage.service';
import { Logger } from '../logger.service';

import { InvoiceGeneratorStrategy } from './interface';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';

/**
 * PDFInvoiceGenerator generates a PDF invoice using CQRS handlers.
 * This is the default strategy for standard PDF invoices.
 */
export class StorageLoaderStrategy extends InvoiceGeneratorStrategy {
	private readonly logger = new Logger('StorageLoaderStrategy');

	constructor(private fileStorageService: FileStorageService) {
		super();
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
