/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseStringPromise } from 'xml2js';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import {
	EXPENSE_REPOSITORY,
	type ExpenseRepository,
} from '@/backend/repositories';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { extractEmbeddedXmlWithPdfLib } from './extract-pdf-xml';
import type {
	ReceiptExtractorService,
	ReceiptResult,
} from './receipt-interface';
import type {
	ExtractedInvoiceStructure,
	InvoiceXml,
	ReceiptStructuredStrategy,
} from './receipt-structured-strategy-interface';
import { XRechnungExtractorStrategy } from './receipt-structured-xrechnung';
import { ZugferdExtractorStrategy } from './receipt-structured-zugferd';

/**
 * Type alias for the expected parsed XML structure (partial, for demo purposes)
 */

export enum InvoiceFormat {
	ZUGFeRD = 'zugferd',
	XRechnung = 'xrechnung',
	Unknown = 'unknown',
}

/**
 * Service for extracting expense information from structured e-invoices (ZUGFeRD/XRechnung)
 *
 * This service extracts embedded XML from PDF attachments using pdf-lib, parses the XML,
 * and maps invoice data to the internal expense structure.
 *
 * - ZUGFeRD: Looks for CrossIndustryInvoice namespace
 * - XRechnung: Looks for XRechnung namespace
 */
@Service()
export class ReceiptStructuredExtractionService
	implements ReceiptExtractorService
{
	private readonly logger = new Logger('ReceiptExtractionService');

	constructor(
		@Inject(EXPENSE_REPOSITORY)
		private readonly expenseRepository: ExpenseRepository,
	) {}

	/**
	 * Extracts invoice data from XML or PDF attachments, detects format, extracts structure, and categorizes via LLM.
	 *
	 * @param source Attachments, text, and context for extraction
	 * @returns ReceiptResult with extracted expenses
	 */
	public async extract(source: {
		text: string;
		attachments: {
			content: Buffer;
			name: string;
			mimeType: string;
			id: string;
		}[];
		currency: string;
	}): Promise<ReceiptResult> {
		const structure = await this.extractData(source);

		// 5. Pass structured data to LLM for categorization (stubbed)
		const expenses = await this.categorizeWithLLM(structure, source.currency);
		for (const expense of expenses) {
			await this.expenseRepository.createWithId(expense.id);
			await this.expenseRepository.save(expense);
		}

		return { expenses };
	}

	private async extractData(source: {
		text: string;
		attachments: {
			content: Buffer;
			name: string;
			mimeType: string;
			id: string;
		}[];
		currency: string;
	}): Promise<ExtractedInvoiceStructure> {
		const xml = await this.findXmlInAttachments(source.attachments);

		// 1. If there is no XML, throw an error
		if (!xml) {
			this.logger.error('No XML data found in attachments or input.');
			throw new Error('No XML data found in attachments or input.');
		}

		// 2. Parse XML to JSON
		let parsed: InvoiceXml;
		try {
			parsed = await parseStringPromise(xml);
		} catch (error) {
			this.logger.error('Failed to parse XML', { error });
			throw new Error('Failed to parse XML');
		}

		// 3. Detect format (ZUGFeRD or XRechnung)
		const format = this.detectInvoiceFormat(parsed);

		const strategy = this.getStrategy(format);
		return await strategy.extract({
			xml: parsed,
			currency: source.currency,
		});
	}

	private getStrategy(format: InvoiceFormat): ReceiptStructuredStrategy {
		if (format === InvoiceFormat.ZUGFeRD) {
			return new ZugferdExtractorStrategy();
		}
		if (format === InvoiceFormat.XRechnung) {
			return new XRechnungExtractorStrategy();
		}
		throw new Error('Unknown invoice format, cannot extract structure.');
	}

	private async findXmlInAttachments(
		attachments: {
			content: Buffer;
			name: string;
			mimeType: string;
			id: string;
		}[],
	): Promise<string | undefined> {
		for (const attachment of attachments) {
			if (
				attachment.mimeType === 'application/pdf' ||
				attachment.name.endsWith('.pdf')
			) {
				const xml = await extractEmbeddedXmlWithPdfLib(attachment.content);
				if (xml) {
					return xml;
				}
			}
			if (
				attachment.mimeType === 'application/xml' ||
				attachment.mimeType === 'text/xml' ||
				attachment.name.endsWith('.xml')
			) {
				return attachment.content.toString('utf8');
			}
		}
		return undefined;
	}

	/**
	 * Detects if the parsed XML is ZUGFeRD or XRechnung format.
	 * @param parsedXml Parsed XML object
	 */
	private detectInvoiceFormat(parsedXml: InvoiceXml): InvoiceFormat {
		// Log root keys for debugging
		this.logger.info('Parsed XML root keys', { keys: Object.keys(parsedXml) });
		const rootKeys = Object.keys(parsedXml);
		// Try to match actual root element names from real generators
		if (
			rootKeys.some((k) => k.toLowerCase().includes('crossindustryinvoice'))
		) {
			return InvoiceFormat.ZUGFeRD;
		}
		// Recognize 'Invoice' as XRechnung if not ZUGFeRD
		if (rootKeys.length === 1 && rootKeys[0] === 'Invoice') {
			return InvoiceFormat.XRechnung;
		}
		if (rootKeys.some((k) => k.toLowerCase().includes('invoice'))) {
			// XRechnung UBL root is often 'ubl:Invoice' or similar
			const invoiceKey = rootKeys.find((k) =>
				k.toLowerCase().includes('invoice'),
			)!;
			if (invoiceKey?.toLowerCase().includes('ubl:invoice')) {
				return InvoiceFormat.XRechnung;
			}
			// If not, fallback to previous logic
			const invoice = parsedXml[invoiceKey];
			if (invoice && typeof invoice === 'object') {
				if (
					'ram:IncludedSupplyChainTradeLineItem' in invoice ||
					'IncludedSupplyChainTradeLineItem' in invoice
				) {
					return InvoiceFormat.ZUGFeRD;
				}
				if ('InvoiceLine' in invoice) {
					return InvoiceFormat.XRechnung;
				}
			}
		}
		return InvoiceFormat.Unknown;
	}

	/**
	 * Stub for LLM categorization. For now we just join all
	 * line items into a single expense.
	 * Later we could pass this through an llm to split it up
	 * into multiple expenses with proper categorization.
	 * 
	 * TODO Integrate with LLM service for categorization
	 * 
	 * @param structure Extracted invoice structure

	 */
	private async categorizeWithLLM(
		structure: ExtractedInvoiceStructure,
		currency: string,
	): Promise<ExpenseEntity[]> {
		const expenses: ExpenseEntity[] = [];

		const expense = new ExpenseEntity({
			name: structure.lineItems.map((item) => item.name).join(', '),
			expendedCents: structure.lineItems.reduce(
				(acc, item) => acc + item.totalCents,
				0,
			),
			expendedAt: structure.invoiceDate,
			description: `E-Invoice: ${structure.invoiceNumber} from ${structure.from}`,
			notes: `Items: ${structure.lineItems
				.map(
					(item) =>
						` - ${item.name} (${item.amount} units, total ${item.totalCents / 100}${currency})`,
				)
				.join('\n')}\nSource Format: ${structure.format}`,
			taxCents: structure.lineItems.reduce(
				(acc, item) => acc + item.taxCents,
				0,
			),
		});

		expenses.push(expense);

		return expenses;
	}
}
