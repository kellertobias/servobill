import dayjs from 'dayjs';
import type { PDFOptions } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import { Span } from '@/backend/instrumentation';
import type { ConfigService } from '@/backend/services/config.service';
import {
	CqrsHandler,
	type ICqrsHandler,
} from '@/backend/services/cqrs.service';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject } from '@/common/di';
import { CreateInvoicePdfCommand } from './create-invoice-pdf.command';

// const executablePath = process.env.IS_OFFLINE
// 	? // eslint-disable-next-line unicorn/no-useless-undefined
// 		Promise.resolve<undefined>(undefined)
// 	: chromium.executablePath;

@CqrsHandler(CreateInvoicePdfCommand)
export class CreateInvoicePdfHandler
	implements ICqrsHandler<CreateInvoicePdfCommand>
{
	private logger = new Logger(CreateInvoicePdfHandler.name);
	constructor(
		@Inject(FILE_STORAGE_SERVICE)
		private readonly fileStorageService: FileStorageService,
		@Inject(CONFIG_SERVICE) private readonly config: ConfigService,
	) {}

	@Span('CreateInvoicePdfHandler.generatePdf')
	private async generatePdf(html: string, options: PDFOptions) {
		// Conditionally import chromium based on environment
		// Use @sparticuz/chromium for serverless environments (when NOT_SERVERLESS is not set)
		// Use default puppeteer chromium for non-serverless environments
		let chromium: {
			executablePath: () => Promise<string>;
			args: string[];
		} | null = null;
		let chromiumArgs: string[] = [];
		let chromiumViewport: { width: number; height: number } | null = null;

		if (process.env.NOT_SERVERLESS) {
			// For non-serverless environments, use default puppeteer
			// Note: puppeteer-core doesn't include chromium by default
			// We'll use the system's default chrome or the CHROME_PATH
			chromium = null;
			chromiumArgs = [];
			chromiumViewport = null;
		} else {
			// For serverless environments, use @sparticuz/chromium
			const { default: sparticuzChromium } = await import(
				'@sparticuz/chromium'
			);
			chromium = sparticuzChromium;
			chromiumArgs = sparticuzChromium.args;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			chromiumViewport = (sparticuzChromium as any).defaultViewport;
		}

		let browser = null;
		try {
			browser = await puppeteer.launch({
				executablePath:
					process.env.CHROME_PATH ??
					(chromium ? await chromium.executablePath() : undefined),
				headless: true,
				// ignoreHTTPSErrors: true,
				defaultViewport: chromiumViewport,
				args: [
					...chromiumArgs,
					'--headless',
					'--disable-gpu',
					'--full-memory-crash-report',
					'--unlimited-storage',
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-extensions',
				],
			});

			const page = await browser.newPage();
			const loaded = page.waitForNavigation({
				waitUntil: 'load',
			});

			await page.setContent(html);
			await loaded;

			return (await page.pdf(options)) as unknown as Buffer;
		} catch (error) {
			this.logger.warn('Failed to generate pdf', { error });
			throw error;
		} finally {
			if (browser !== null) {
				await browser.close();
			}
		}
	}

	async execute(command: CreateInvoicePdfCommand['request']) {
		const { html } = command;

		const options: PDFOptions = {
			format: 'a4',
			printBackground: true,
			margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
		};

		this.logger.info('Generating pdf');
		const pdf = await this.generatePdf(html, options);

		// Upload to S3
		const bucket = this.config.buckets.files;
		const key =
			command.key ||
			`invoices/${dayjs(command.invoice.createdAt).format('YYYY/MM')}/${command.invoice.id}.pdf`;

		this.logger.info('Uploading pdf to S3', {
			bucket,
			key,
			length: pdf.length,
		});

		await this.fileStorageService.saveFile(key, pdf, { bucket });

		return {
			success: true,
			bucket,
			region: this.config.region,
			key,
			pdf,
		};
	}
}
