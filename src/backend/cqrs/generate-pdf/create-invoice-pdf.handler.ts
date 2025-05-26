import puppeteer from 'puppeteer-core';
import type { PDFOptions } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import dayjs from 'dayjs';

import { CreateInvoicePdfCommand } from './create-invoice-pdf.command';

import { Inject } from '@/common/di';
import { CqrsHandler, ICqrsHandler } from '@/backend/services/cqrs.service';
import { Logger } from '@/backend/services/logger.service';
import type { ConfigService } from '@/backend/services/config.service';
import { S3Service } from '@/backend/services/s3.service';
import { Span } from '@/backend/instrumentation';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';

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
		@Inject(S3Service) private readonly s3: S3Service,
		@Inject(CONFIG_SERVICE) private readonly config: ConfigService,
	) {}

	@Span('CreateInvoicePdfHandler.generatePdf')
	private async generatePdf(html: string, options: PDFOptions) {
		let browser = null;
		try {
			browser = await puppeteer.launch({
				executablePath:
					process.env.CHROME_PATH ?? (await chromium.executablePath()),
				headless: true,
				ignoreHTTPSErrors: true,
				defaultViewport: chromium.defaultViewport,
				args: [
					...chromium.args,
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

			return await page.pdf(options);
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
			`invoices/${dayjs(command.invoice.createdAt).format('YYYY/MM')}/${
				command.invoice.id
			}.pdf`;

		this.logger.info('Uploading pdf to S3', {
			bucket,
			key,
			length: pdf.length,
		});

		await this.s3.putObject({
			bucket,
			key,
			body: pdf,
		});

		return {
			success: true,
			bucket,
			region: this.config.region,
			key,
			pdf,
		};
	}
}
