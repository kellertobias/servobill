/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseStringPromise } from 'xml2js';
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from 'pdf-lib';

import { ReceiptExtractorService, ReceiptResult } from './receipt-interface';

import {
	SETTINGS_REPOSITORY,
	EXPENSE_REPOSITORY,
	type SettingsRepository,
	type ExpenseRepository,
} from '@/backend/repositories';
import { Service, Inject } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';

/**
 * Type alias for the expected parsed XML structure (partial, for demo purposes)
 */
type InvoiceXml = Record<string, unknown>;

/**
 * Extracted expense item from receipt
 */
export interface ExtractedExpenseItem {
	name: string;
	expendedCents: number;
	taxCents: number;
	expendedAt: Date;
	description?: string;
	categoryId?: string;
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
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY)
		private readonly expenseRepository: ExpenseRepository,
	) {}

	/**
	 * Extracts invoice data from ZUGFeRD or XRechnung PDF attachments.
	 *
	 * @param source Attachments and context for extraction
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
		const expenses = [];
		for (const attachment of source.attachments) {
			if (attachment.mimeType === 'application/pdf') {
				const xml = await this.extractEmbeddedXmlWithPdfLib(attachment.content);
				if (xml) {
					try {
						const parsed = await parseStringPromise(xml);
						const items = this.mapInvoiceXmlToExpenses(parsed, source.currency);
						for (const item of items) {
							const expenseEntity = await this.expenseRepository.create();
							expenseEntity.name = item.name;
							expenseEntity.expendedCents = item.expendedCents;
							expenseEntity.taxCents = item.taxCents;
							expenseEntity.expendedAt = item.expendedAt;
							expenseEntity.description = item.description;
							expenseEntity.categoryId = item.categoryId;
							await this.expenseRepository.save(expenseEntity);
							expenses.push(expenseEntity);
						}
					} catch (error) {
						this.logger.error('Failed to parse embedded XML', { error });
					}
				}
			}
		}
		return { expenses };
	}

	/**
	 * Extracts the first embedded XML file from a PDF using pdf-lib's low-level API.
	 *
	 * @param pdfBuffer PDF file content
	 * @returns XML string or undefined
	 */
	private async extractEmbeddedXmlWithPdfLib(
		pdfBuffer: Buffer,
	): Promise<string | undefined> {
		try {
			const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
			const catalog = pdfDoc.catalog as PDFDict;
			const names = catalog.lookupMaybe(PDFName.of('Names'), PDFDict) as
				| PDFDict
				| undefined;
			if (!names) {
				return undefined;
			}
			const embeddedFiles = names.lookupMaybe(
				PDFName.of('EmbeddedFiles'),
				PDFDict,
			) as PDFDict | undefined;
			if (!embeddedFiles) {
				return undefined;
			}
			const namesArray = embeddedFiles.lookup(PDFName.of('Names'));
			if (!Array.isArray(namesArray)) {
				return undefined;
			}
			for (let i = 0; i < namesArray.length; i += 2) {
				const fileSpec = namesArray[i + 1] as PDFDict;
				const ef = fileSpec.lookupMaybe(PDFName.of('EF'), PDFDict) as
					| PDFDict
					| undefined;
				if (ef) {
					const fileStreamObj = ef.lookup(PDFName.of('F'));
					if (fileStreamObj instanceof PDFRawStream) {
						const xmlBuffer = fileStreamObj.getContents();
						const xmlString = Buffer.from(xmlBuffer).toString('utf8');
						if (xmlString.trim().startsWith('<?xml')) {
							return xmlString;
						}
					}
				}
			}
			return undefined;
		} catch (error) {
			this.logger.error('Failed to extract embedded XML with pdf-lib', {
				error: error,
			});
			return undefined;
		}
	}

	/**
	 * Maps parsed invoice XML to internal expense items.
	 *
	 * @param parsedXml Parsed XML object
	 * @param currency Currency code for the invoice (currently unused)
	 * @returns Array of ExtractedExpenseItem
	 */
	private mapInvoiceXmlToExpenses(
		parsedXml: InvoiceXml,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		currency: string,
	): ExtractedExpenseItem[] {
		// currency is currently unused, but may be used for currency conversion in the future
		const items: ExtractedExpenseItem[] = [];
		// ZUGFeRD: Look for CrossIndustryInvoice
		const invoice =
			parsedXml['rsm:CrossIndustryInvoice'] ||
			parsedXml['CrossIndustryInvoice'] ||
			parsedXml['Invoice'] ||
			parsedXml['xrechnung:Invoice'];
		if (!invoice) {
			return items;
		}
		const lineItems =
			(invoice as Record<string, unknown>)[
				'ram:IncludedSupplyChainTradeLineItem'
			] ||
			(invoice as Record<string, unknown>)[
				'IncludedSupplyChainTradeLineItem'
			] ||
			(invoice as Record<string, unknown>)['InvoiceLine'] ||
			[];
		for (const line of Array.isArray(lineItems) ? lineItems : [lineItems]) {
			const name =
				(line as Record<string, any>)['ram:SpecifiedTradeProduct']?.[0]?.[
					'ram:Name'
				]?.[0] ||
				(line as Record<string, any>)['SpecifiedTradeProduct']?.[0]?.[
					'Name'
				]?.[0] ||
				(line as Record<string, any>)['Item']?.[0]?.['Name']?.[0] ||
				'Item';
			const expendedCents = Math.round(
				Number.parseFloat(
					(line as Record<string, any>)[
						'ram:SpecifiedLineTradeAgreement'
					]?.[0]?.['ram:NetPriceProductTradePrice']?.[0]?.[
						'ram:ChargeAmount'
					]?.[0] ||
						(line as Record<string, any>)['SpecifiedLineTradeAgreement']?.[0]?.[
							'NetPriceProductTradePrice'
						]?.[0]?.['ChargeAmount']?.[0] ||
						'0',
				) * 100,
			);
			const taxCents = 0; // TODO: Extract tax from XML if available
			const expendedAt = new Date(); // TODO: Extract invoice date from XML if available
			items.push({ name, expendedCents, taxCents, expendedAt });
		}
		return items;
	}
}
