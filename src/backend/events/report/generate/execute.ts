import dayjs from 'dayjs';
import type { PDFOptions } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import { type InvoiceEntity, InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import { ExpenseSettingsEntity } from '@/backend/entities/settings.entity';
import { Span } from '@/backend/instrumentation';
import {
  EXPENSE_REPOSITORY,
  type ExpenseRepository,
  INVOICE_REPOSITORY,
  type InvoiceRepository,
  SETTINGS_REPOSITORY,
  type SettingsRepository,
} from '@/backend/repositories';
import type { ConfigService } from '@/backend/services/config.service';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { Logger } from '@/backend/services/logger.service';
import {
  ReportHtmlGenerator,
  type ReportItem,
} from '@/backend/services/report-generator/report-html-generator';
import { SESService } from '@/backend/services/ses.service';
import { DefaultContainer, Inject, Service } from '@/common/di';
import { ReportGenerateEvent } from './event';

@Service()
export class ReportGenerateHandlerExecution {
  private readonly logger = new Logger('ReportGenerateHandlerExecution');
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: InvoiceRepository,
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: ExpenseRepository,
    @Inject(SETTINGS_REPOSITORY)
    private readonly settingsRepository: SettingsRepository,
    @Inject(CONFIG_SERVICE)
    private readonly config: ConfigService,
    @Inject(SESService)
    private readonly sesService: SESService,
    private readonly htmlGenerator: ReportHtmlGenerator
  ) {
    // If ReportHtmlGenerator is not automatically injected (it is @Service),
    // we might need to rely on DI or instantiate it.
    // Assuming DI works since it's @Service.
    if (!this.htmlGenerator) {
        this.htmlGenerator = DefaultContainer.get(ReportHtmlGenerator);
    }
  }

  // --- Data Fetching Logic (Replicated from ReportsResolver) ---
  private async getRelevantData(
    startDate: Date,
    endDate: Date
  ): Promise<{ invoices: InvoiceEntity[]; expenses: any[] }> { // Using any for expenses as Entity import might be tricky if not exported or different file
    // Need to verify ExpenseEntity import or just use what repositories return
    const startYear = dayjs(startDate).year();
    const invoices = await this.invoiceRepository
      .listByQuery({
        where: { year: startYear },
      })
      .then((results) =>
        results.filter(
          (invoice) =>
            invoice.type === InvoiceType.INVOICE &&
            dayjs(invoice.invoicedAt).isAfter(startDate) &&
            dayjs(invoice.invoicedAt).isBefore(endDate) &&
            [InvoiceStatus.PAID, InvoiceStatus.PAID_PARTIALLY, InvoiceStatus.SENT].includes(
              invoice.status
            )
        )
      );

    const expenses = await this.expenseRepository
      .listByQuery({
        where: { year: startYear },
      })
      .then((results) =>
        results.filter(
          (expense) =>
            dayjs(expense.expendedAt).isAfter(startDate) &&
            dayjs(expense.expendedAt).isBefore(endDate)
        )
      );

    return { invoices, expenses };
  }

  private async getReportData(startDate: Date, endDate: Date) {
      const { invoices, expenses } = await this.getRelevantData(startDate, endDate);
      const bookings: ReportItem[] = [];

      invoices.forEach((invoice) => {
        if (!invoice.invoicedAt) {
          return;
        }
        bookings.push({
          id: invoice.id,
          type: 'invoice',
          name: `${invoice.invoiceNumber}`,
          valutaDate: invoice.invoicedAt,
          surplusCents: invoice.totalCents,
          taxCents: invoice.totalTax,
          category: {
            id: 'invoice',
            name: 'Income',
            color: '#000',
            description: 'Income',
          },
        });
      });

      const settings = await this.settingsRepository.getSetting(ExpenseSettingsEntity);

      expenses.forEach((expense) => {
        const category = settings.categories.find((cat) => cat.id === expense.categoryId);
        bookings.push({
          id: expense.id,
          type: 'expense',
          name: `${expense.name}`,
          description: expense.description,
          valutaDate: expense.expendedAt,
          surplusCents: -1 * expense.expendedCents,
          taxCents: -1 * (expense.taxCents || 0),
          category: category ? { ...category } : undefined,
        });
      });

      // Calculate totals
      let incomeCents = 0;
      let expensesCents = 0;
      let surplusCents = 0;
      let expensesTaxCents = 0;

      for (const booking of bookings) {
         if (booking.type === 'invoice') {
            surplusCents += booking.surplusCents;
            incomeCents += booking.surplusCents;
         } else if (booking.type === 'expense') {
            surplusCents += booking.surplusCents;
            expensesCents -= booking.surplusCents; // expensesCents should be positive representation of expense
            expensesTaxCents -= booking.taxCents || 0;
         }
      }

      return {
          incomeCents,
          expensesCents,
          surplusCents,
          expensesTaxCents,
          items: bookings
      };
  }

  @Span('ReportGenerateHandlerExecution.generatePdf')
  private async generatePdf(html: string): Promise<Buffer> {
    // Reusing logic from CreateInvoicePdfHandler
    let chromium: {
      executablePath: () => Promise<string>;
      args: string[];
    } | null = null;
    let chromiumArgs: string[] = [];
    let chromiumViewport: { width: number; height: number } | null = null;

    if (process.env.NOT_SERVERLESS) {
      chromium = null;
      chromiumArgs = [];
      chromiumViewport = null;
    } else {
      const { default: sparticuzChromium } = await import('@sparticuz/chromium');
      chromium = sparticuzChromium;
      chromiumArgs = sparticuzChromium.args;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chromiumViewport = (sparticuzChromium as any).defaultViewport;
    }

    let browser = null;
    try {
      browser = await puppeteer.launch({
        executablePath:
          process.env.CHROME_PATH ?? (chromium ? await chromium.executablePath() : undefined),
        headless: true,
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
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const options: PDFOptions = {
        format: 'a4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      };

      return (await page.pdf(options)) as unknown as Buffer;
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  }


  async execute(event: ReportGenerateEvent) {
    this.logger.info('Starting report generation', { ...event });

    const startDate = dayjs(event.start).toDate();
    const endDate = dayjs(event.end).toDate();

    // 1. Fetch Data
    const reportData = await this.getReportData(startDate, endDate);

    // 2. Generate HTML
    const html = this.htmlGenerator.generateReportHtml(reportData, event.format, { start: startDate, end: endDate });

    // 3. Generate PDF
    const pdfBuffer = await this.generatePdf(html);

    // 4. Send Email
    // Retrieve company settings for 'from' address
    // We don't have company settings in event, so fetch them
    const companyData = await this.settingsRepository.getSetting('companyData' as any); // Assuming 'companyData' key or similar, need to check SettingsRepository usage
    // Actually SettingsRepository.getSetting takes a class constructor usually.
    // Let's check how it's used elsewhere.
    // `await this.settingsRepository.getSetting(CompanyDataSetting)`

    // Dynamic import to avoid circular dependency if any, or just import at top if safe.
    // Imported CompanyDataSetting at top.

    const { CompanyDataSetting } = await import('@/backend/entities/settings.entity');
    const companySettings = await this.settingsRepository.getSetting(CompanyDataSetting);

    await this.sesService.sendEmail({
        to: event.recipientEmail,
        from: companySettings.sendFrom, // or companySettings.companyData.email
        subject: `Your Financial Report (${dayjs(startDate).format('YYYY-MM-DD')} - ${dayjs(endDate).format('YYYY-MM-DD')})`,
        html: `
            <p>Hello,</p>
            <p>Please find attached your requested financial report.</p>
            <p>Format: ${event.format}</p>
            <p>Period: ${dayjs(startDate).format('DD.MM.YYYY')} - ${dayjs(endDate).format('DD.MM.YYYY')}</p>
        `,
        attachments: [
            {
                filename: `Report_${dayjs(startDate).format('YYYYMMDD')}-${dayjs(endDate).format('YYYYMMDD')}.pdf`,
                content: pdfBuffer
            }
        ]
    });

    this.logger.info('Report sent successfully', { email: event.recipientEmail });
  }
}
