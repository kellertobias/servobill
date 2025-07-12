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
	VatStatus,
} from '@/backend/entities/settings.entity';

type CurrencyCode =
	ProfileBasic['transaction']['tradeSettlement']['currencyCode'];

type Totals = {
	taxTotals: Record<string, { taxAmount: number; netAmount: number }>;
	totalTaxAmount: number;
	totalNetAmount: number;
};

/**
 * Maps invoice items to ZUGFeRD ProfileBasic lines and collects allowances (discounts/credits).
 * Negative net amounts are treated as allowances, not as regular lines, per EN16931/ZUGFeRD.
 *
 * @param invoice The invoice entity
 * @param vatStatus The VAT/tax status of the company (affects tax category code and exemption reason)
 * @returns Object with mapped lines, allowances, and totals
 */
function mapInvoiceItemsToProfileBasic(
	invoice: InvoiceEntity,
	vatStatus: VatStatus,
): {
	line: ProfileBasic['transaction']['line'];
	totals: Totals;
} {
	const taxTotals: Totals['taxTotals'] = {};
	let totalNetAmount: Totals['totalNetAmount'] = 0;
	let totalTaxAmount: Totals['totalTaxAmount'] = 0;

	const isVatDisabled =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER ||
		vatStatus === VatStatus.VAT_DISABLED_OTHER;
	const exemptionReason =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER
			? 'Kleinunternehmerregelung § 19 UStG'
			: vatStatus === VatStatus.VAT_DISABLED_OTHER
				? 'VAT Exempt (Other Reason)'
				: undefined;

	return {
		line: (invoice.items || []).map((item, idx) => {
			const itemSinglePrice = item.priceCents ?? 0;
			const itemQuantity = item.quantity ?? 1;
			const itemNetAmount = (itemSinglePrice * itemQuantity) / 100;
			totalNetAmount += itemNetAmount;

			const itemTaxAmount = itemNetAmount * (item.taxPercentage / 100);
			totalTaxAmount += itemTaxAmount;

			const itemTaxCode = item.taxPercentage.toString();

			taxTotals[itemTaxCode] = {
				taxAmount: (taxTotals[itemTaxCode]?.taxAmount ?? 0) + itemTaxAmount,
				netAmount: (taxTotals[itemTaxCode]?.netAmount ?? 0) + itemNetAmount,
			};

			return {
				identifier: `${idx + 1}`,
				description: item.description,
				tradeProduct: {
					name: item.name || `Item ${idx + 1}`,
				},
				tradeAgreement: {
					netTradePrice: {
						chargeAmount: Number(itemSinglePrice / 100).toFixed(2),
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
						categoryCode: isVatDisabled
							? 'E'
							: item.taxPercentage.toString() === '0'
								? 'Z'
								: 'S',
						...(isVatDisabled
							? {
									exemptionReasonText: exemptionReason,
								}
							: {}),
						rateApplicablePercent: item.taxPercentage.toFixed(2),
						calculatedAmount: Number(itemTaxAmount).toFixed(2),
						basisAmount: Number(itemNetAmount).toFixed(2),
					},
					monetarySummation: {
						lineTotalAmount: Number(itemNetAmount).toFixed(2),
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
	vatStatus: VatStatus,
): {
	tradeSettlement: ProfileBasic['transaction']['tradeSettlement'];
} {
	// Calculate the sum of all line net amounts for header totals
	const lineTotalAmount = Number(totals.totalNetAmount).toFixed(2);
	const taxBasisTotalAmount = Number(totals.totalNetAmount).toFixed(2);
	const taxTotalAmount = Number(totals.totalTaxAmount).toFixed(2);
	const grandTotalAmount = Number((invoice.totalCents ?? 0) / 100).toFixed(2);
	const duePayableAmount = Number(
		((invoice.totalCents ?? 0) - (invoice.paidCents ?? 0)) / 100,
	).toFixed(2);
	const paidAmount = invoice.paidCents
		? Number(invoice.paidCents / 100).toFixed(2)
		: '0.00';

	const isVatDisabled =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER ||
		vatStatus === VatStatus.VAT_DISABLED_OTHER;
	const exemptionReason =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER
			? 'Kleinunternehmerregelung § 19 UStG'
			: vatStatus === VatStatus.VAT_DISABLED_OTHER
				? 'VAT Exempt (Other Reason)'
				: undefined;

	return {
		tradeSettlement: {
			currencyCode: (companyData.currency ||
				'EUR') as ProfileBasic['transaction']['tradeSettlement']['currencyCode'],
			monetarySummation: {
				lineTotalAmount,
				taxBasisTotalAmount,
				taxTotal: {
					amount: taxTotalAmount,
					currencyCode: (companyData.currency || 'EUR') as CurrencyCode,
				},
				paidAmount,
				grandTotalAmount,
				duePayableAmount,
			},
			vatBreakdown: Object.entries(totals.taxTotals).map(([key, value]) => {
				return {
					categoryCode: isVatDisabled ? 'E' : key === '0' ? 'Z' : 'S',
					rateApplicablePercent: Number(key).toFixed(2),
					calculatedAmount: Number(value.taxAmount).toFixed(2),
					typeCode: 'VAT',
					basisAmount: Number(value.netAmount).toFixed(2),
					// Add VAT exemption reason for exempt lines (BR-E-10)
					...(isVatDisabled
						? {
								exemptionReasonText: exemptionReason,
							}
						: {}),
				};
			}),
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
		},
	};
}

/**
 * Helper to map InvoiceEntity and settings to ProfileBasic for ZUGFeRD.
 * Now supports allowances (discounts/credits) for negative items.
 * @param invoice The invoice entity from the domain
 * @param companyData The seller/company data
 * @returns ProfileBasic-compliant object
 */
function mapInvoiceToProfileBasic(
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
): ProfileBasic {
	// Extract company data from the nested structure
	const sellerData = companyData.companyData;
	const vatStatus = companyData.vatStatus;
	const { line, totals } = mapInvoiceItemsToProfileBasic(invoice, vatStatus);
	const { tradeSettlement } = mapInvoiceTotalsToProfileBasic(
		invoice,
		companyData,
		totals,
		vatStatus,
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
				},
				buyer: {
					identifier: invoice.customer?.customerNumber,
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
			},

			tradeSettlement,
			tradeDelivery: {
				information: {
					deliveryDate: invoice.invoicedAt || invoice.createdAt || new Date(),
				},
			},
		},
	};
}

/**
 * ZugferdInvoiceGenerator generates a ZUGFeRD invoice (PDF + XML attachment).
 * Uses the PDF strategy internally and node-zugferd for XML generation.
 * The combine(pdf, xml) method is stubbed for now.
 */
export class ZugferdInvoiceGenerator extends InvoiceGeneratorStrategy {
	constructor(private readonly pdfStrategy?: PDFInvoiceGenerator) {
		super();
	}

	private async getOptionalPdf(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	) {
		if (this.pdfStrategy) {
			const pdf = await this.pdfStrategy.generate(invoice, options);
			return pdf[0].content;
		}
		return;
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
		const pdfBuffer = await this.getOptionalPdf(invoice, options);

		// Map InvoiceEntity to ProfileBasic (domain-specific mapping)
		const profileData: ProfileBasic = mapInvoiceToProfileBasic(
			invoice,
			options.companyData,
		);

		const invoicer = zugferd({ profile: BASIC, strict: false });
		const zugferdInvoice = invoicer.create(profileData);

		if (!pdfBuffer) {
			const data = await zugferdInvoice.toXML();
			return [
				{
					content: Buffer.from(data, 'utf8'),
					filename: 'zugferd.xml',
					mimeType: 'application/xml',
				},
			];
		}

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
