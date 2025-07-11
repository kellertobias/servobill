// ZugferdInvoiceGenerator: Strategy for generating ZUGFeRD (PDF + XML) invoices.
import { zugferd } from 'node-zugferd';
import { BASIC, ProfileBasic } from 'node-zugferd/profile/basic';

import { InvoiceGeneratorStrategy } from './interface';
import { PDFInvoiceGenerator } from './pdf-invoice-generator';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';

type CurrencyCode =
	ProfileBasic['transaction']['tradeSettlement']['currencyCode'];

type Totals = {
	taxTotals: Record<string, { taxAmount: number; netAmount: number }>;
	totalTaxAmount: number;
	totalNetAmount: number;
};

function mapInvoiceItemsToProfileBasic(invoice: InvoiceEntity): {
	line: ProfileBasic['transaction']['line'];
	totals: Totals;
} {
	const taxTotals: Totals['taxTotals'] = {};
	let totalNetAmount: Totals['totalNetAmount'] = 0;
	let totalTaxAmount: Totals['totalTaxAmount'] = 0;

	return {
		line: (invoice.items || []).map((item, idx) => {
			const itemNetAmount =
				((item.priceCents ?? 0) * (item.quantity ?? 1)) / 100;
			totalNetAmount += itemNetAmount;

			const itemTaxAmount = itemNetAmount * (item.taxPercentage / 100);
			totalTaxAmount += itemTaxAmount;

			const itemTaxCode = item.taxPercentage.toString();

			taxTotals[itemTaxCode] = {
				taxAmount: (taxTotals[itemTaxCode]?.taxAmount ?? 0) + itemTaxAmount,
				netAmount: (taxTotals[itemTaxCode]?.netAmount ?? 0) + itemNetAmount,
			};

			return {
				identifier: item.id || `ITEM${idx + 1}`,
				description: item.description,
				tradeProduct: {
					name: item.name || `Item ${idx + 1}`,
				},
				tradeAgreement: {
					netTradePrice: {
						chargeAmount: Number((item.priceCents ?? 0) / 100).toFixed(2),
					},
				},
				tradeDelivery: {
					billedQuantity: {
						amount: item.quantity || 1,
						unitMeasureCode: 'C62', // Default to 'C62' (unit)
					},
				},
				tradeSettlement: {
					tradeTax: {
						typeCode: 'VAT',
						categoryCode: item.taxPercentage.toString() === '0' ? 'E' : 'S',
						rateApplicablePercent: item.taxPercentage.toFixed(2),
						calculatedAmount: Number(
							item.priceCents * (item.taxPercentage / 100),
						).toFixed(2),
						basisAmount: Number(item.priceCents / 100).toFixed(2),
					},
				},
			};
		}),
		totals: {
			taxTotals,
			totalNetAmount,
			totalTaxAmount,
		},
	};
}

function mapInvoiceTotalsToProfileBasic(
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
	totals: Totals,
): {
	tradeSettlement: ProfileBasic['transaction']['tradeSettlement'];
} {
	return {
		tradeSettlement: {
			currencyCode: (companyData.currency ||
				'EUR') as ProfileBasic['transaction']['tradeSettlement']['currencyCode'],
			monetarySummation: {
				lineTotalAmount: Number((totals.totalNetAmount ?? 0) / 100).toFixed(2), // Required by schema
				taxBasisTotalAmount: Number(totals.totalNetAmount).toFixed(2),
				taxTotal: {
					amount: Number(totals.totalTaxAmount).toFixed(2),
					currencyCode: (companyData.currency || 'EUR') as CurrencyCode,
				},
				paidAmount: invoice.paidCents
					? Number(invoice.paidCents / 100).toFixed(2)
					: 0,
				grandTotalAmount: Number((invoice.totalCents ?? 0) / 100).toFixed(2),
				duePayableAmount: Number(
					((invoice.totalCents ?? 0) - (invoice.paidCents ?? 0)) / 100,
				).toFixed(2),
			},
			vatBreakdown: Object.entries(totals.taxTotals).map(([key, value]) => ({
				categoryCode: key === '0' ? 'E' : 'S',
				rateApplicablePercent: Number(key).toFixed(2),
				calculatedAmount: value.taxAmount,
				typeCode: 'VAT',
				basisAmount: value.netAmount,
			})),
			paymentInstruction: {
				typeCode: '30', // 30 = Payment due by bank transfer
				transfers: [
					{
						paymentAccountIdentifier: companyData.companyData.bank.iban,
					},
				],
			},
			paymentTerms: {
				dueDate: invoice.dueAt,
			},
			// TODO: [ERROR: BR-CO-25] If duePayableAmount > 0, must provide payment terms: either payment due date or payment terms description (ram:SpecifiedTradePaymentTerms)
			// Add specifiedTradePaymentTerms with due date or description if invoice is payable.
		},
	};
}

/**
 * Helper to map InvoiceEntity and settings to ProfileBasic for ZUGFeRD.
 * Only minimal required fields are mapped for now; extend as needed.
 * @param invoice The invoice entity from the domain
 * @param companyData The seller/company data
 * @param invoiceSettings Invoice settings entity
 * @returns ProfileBasic-compliant object
 */
function mapInvoiceToProfileBasic(
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
): ProfileBasic {
	// Extract company data from the nested structure
	const sellerData = companyData.companyData;

	const { line, totals } = mapInvoiceItemsToProfileBasic(invoice);
	const { tradeSettlement } = mapInvoiceTotalsToProfileBasic(
		invoice,
		companyData,
		totals,
	);

	return {
		number: invoice.invoiceNumber || invoice.id, // Required: Invoice number
		typeCode: '380', // Required: '380' = Commercial invoice (default for most B2B invoices)
		/* 
		From the docs:
		380: Commercial Invoice
		381: Credit note
		384: Corrected invoice
		389: Self-billied invoice (created by the buyer on behalf of the supplier)
		261: Self billed credit note (not accepted by CHORUSPRO)
		386: Prepayment invoice
		751: Invoice information for accounting purposes (not accepted by CHORUSPRO)
		*/
		issueDate: invoice.invoicedAt || invoice.createdAt || new Date(), // Required: Issue date
		includedNote: invoice.footerText ? [{ content: invoice.footerText }] : [],
		transaction: {
			line,
			tradeAgreement: {
				seller: {
					name: sellerData.name,
					postalAddress: {
						countryCode: sellerData.countryCode || 'DE',
						city: sellerData.city || '',
						postCode: sellerData.zip || '',
						line1: sellerData.street || '',
					},
					taxRegistration:
						sellerData.taxId || sellerData.vatId
							? {
									localIdentifier: sellerData.taxId,
									vatIdentifier: sellerData.vatId,
								}
							: undefined,
					electronicAddress: {
						value: sellerData.email,
						schemeIdentifier: 'EM',
					},
					// TODO: [NOTICE: BR-DE-2] Seller contact (BG-6) must be provided (ram:DefinedTradeContact)
					// Add seller contact details if available
				},
				buyer: {
					name: invoice.customer?.name || 'Unknown',
					postalAddress: {
						countryCode: invoice.customer?.countryCode || 'DE',
						city: invoice.customer?.city || '',
						postCode: invoice.customer?.zip || '',
						line1: invoice.customer?.street || '',
					},
					electronicAddress: {
						value: invoice.customer?.email,
						schemeIdentifier: 'EM',
					},
				},
				// TODO: [NOTICE: BR-DE-15] Buyer reference (BT-10) must be provided (ram:BuyerReference)
				// Add buyer reference if available
			},

			// Required: minimal tradeSettlement
			tradeSettlement,
			// Required: minimal tradeDelivery (empty object, as allowed by schema)
			tradeDelivery: {
				information: {
					deliveryDate: invoice.invoicedAt || invoice.createdAt || new Date(),
				},
			},
		},
		// TODO: [NOTICE: PEPPOL-EN16931-R001, BR-DE-21] Business process and specification identifier should be provided in ExchangedDocumentContext (ram:BusinessProcessSpecifiedDocumentContextParameter/ram:ID, ram:GuidelineSpecifiedDocumentContextParameter/ram:ID)
		// TODO: [NOTICE: BR-DE-1] Payment instructions (BG-16) should be included (ram:SpecifiedTradeSettlementPaymentMeans)
		// Add payment means (e.g., bank transfer details) if available
		// Add more top-level fields as needed (e.g., specificationIdentifier, businessProcessType)
	};
}

/**
 * ZugferdInvoiceGenerator generates a ZUGFeRD invoice (PDF + XML attachment).
 * Uses the PDF strategy internally and node-zugferd for XML generation.
 * The combine(pdf, xml) method is stubbed for now.
 */
export class ZugferdInvoiceGenerator extends InvoiceGeneratorStrategy {
	private readonly pdfStrategy: PDFInvoiceGenerator;

	constructor() {
		super();
		this.pdfStrategy = new PDFInvoiceGenerator();
	}

	/**
	 * Generates a ZUGFeRD invoice: PDF and ZUGFeRD XML (BASIC profile).
	 * Returns both as separate attachments for now.
	 * Note: The invoice data must be mapped to the ProfileBasic type expected by node-zugferd.
	 */
	async generate(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string; mimeType: string }[]> {
		// Generate PDF using the PDF strategy
		const pdfResult = await this.pdfStrategy.generate(invoice, options);
		const pdfBuffer = pdfResult[0].content;

		// Map InvoiceEntity to ProfileBasic (domain-specific mapping)
		const profileData: ProfileBasic = mapInvoiceToProfileBasic(
			invoice,
			options.companyData,
		);

		const invoicer = zugferd({ profile: BASIC, strict: false });
		const zugferdInvoice = invoicer.create(profileData);

		// Convert Node.js Buffer to Uint8Array for compatibility
		const pdfUint8 = new Uint8Array(
			pdfBuffer.buffer,
			pdfBuffer.byteOffset,
			pdfBuffer.byteLength,
		);

		// Embed ZUGFeRD XML into PDF/A-3
		const pdfAUint8 = await zugferdInvoice.embedInPdf(pdfUint8, {
			metadata: {
				title: `INVOICE_${invoice.invoiceNumber}.pdf`,
				createDate: new Date(),
				modifyDate: new Date(),
				author: options.companyData.companyData.name,
			},
		});

		// Convert Uint8Array result back to Buffer for return
		const pdfA = Buffer.from(pdfAUint8);

		// For now, return only the PDF/A-3 as attachment (extend to add XML if needed)
		return [
			{
				content: pdfA,
				filename: 'invoice.pdf',
				mimeType: 'application/pdf',
			},
		];
	}
}
