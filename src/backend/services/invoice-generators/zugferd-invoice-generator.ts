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

// Add a type alias for a single ProfileBasic allowance object for clarity
// This matches the expected structure for node-zugferd ProfileBasic allowances
type ProfileBasicAllowance = NonNullable<
	NonNullable<
		ProfileBasic['transaction']['tradeSettlement']['allowances']
	>[number]
>;

type CurrencyCode =
	ProfileBasic['transaction']['tradeSettlement']['currencyCode'];

type Totals = {
	taxTotals: Record<string, { taxAmount: number; netAmount: number }>;
	totalTaxAmount: number;
	totalNetAmount: number;
};

/**
 * Local type for ZUGFeRD ProfileBasic document-level allowance/charge (BG-20).
 * Structure must match node-zugferd/EN16931: chargeIndicator (required, first), actualAmount, reason, reasonCode, categoryTradeTax (categoryCode, vatRate), calculationPercent, basisAmount.
 * chargeIndicator: false = allowance/discount, true = charge (rare).
 */
type AllowanceReasonCode =
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	| '10'
	| '11'
	| '12'
	| '13'
	| '14'
	| '15'
	| '16'
	| '17'
	| '18'
	| '19'
	| '20'
	| '21'
	| '22'
	| '23'
	| '24'
	| '25'
	| '26'
	| '27'
	| '28'
	| '29'
	| '30'
	| '31'
	| '32'
	| '33'
	| '34'
	| '35'
	| '36'
	| '37'
	| '38'
	| '39'
	| '40'
	| '41'
	| '42'
	| '44'
	| '45'
	| '46'
	| '47'
	| '48'
	| '49'
	| '50'
	| '51'
	| '52'
	| '53'
	| '54'
	| '55'
	| '56'
	| '57'
	| '58'
	| '59'
	| '60'
	| '61'
	| '62'
	| '63'
	| '64'
	| '65'
	| '66'
	| '67'
	| '68'
	| '69'
	| '70'
	| '71'
	| '72'
	| '73'
	| '74'
	| '75'
	| '76'
	| '77'
	| '78'
	| '79'
	| '80'
	| '81'
	| '82'
	| '83'
	| '84'
	| '85'
	| '86'
	| '87'
	| '88'
	| '89'
	| '90'
	| '91'
	| '92'
	| '93'
	| '94'
	| '95'
	| '96'
	| '97'
	| '98'
	| '99'
	| '100'
	| '101'
	| '102'
	| '103'
	| '104'
	| '105'
	| '106';
type AllowanceCharge = {
	chargeIndicator: boolean; // Required by schema: false = allowance, true = charge
	actualAmount: string;
	reason?: string;
	reasonCode?: AllowanceReasonCode;
	categoryTradeTax?: {
		categoryCode: 'E' | 'Z' | 'S';
		vatRate: string;
	};
	calculationPercent?: string;
	basisAmount?: string;
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
	allowances: AllowanceCharge[];
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

	const lines: ProfileBasic['transaction']['line'] = [];
	const allowances: AllowanceCharge[] = [];

	(invoice.items || []).forEach((item, idx) => {
		const itemSinglePrice = item.priceCents ?? 0;
		const itemQuantity = item.quantity ?? 1;
		const itemNetAmount = (itemSinglePrice * itemQuantity) / 100;
		const itemTaxAmount = itemNetAmount * (item.taxPercentage / 100);
		const itemTaxCode = item.taxPercentage.toString();

		if (itemNetAmount < 0) {
			// Treat as document-level allowance (discount/credit)
			allowances.push({
				chargeIndicator: false, // Always false for allowances/discounts
				actualAmount: Math.abs(itemNetAmount).toFixed(2),
				reason: item.name || 'Discount',
				// reasonCode: undefined, // Optionally map a reason code if available
				categoryTradeTax: {
					categoryCode: isVatDisabled
						? 'E'
						: item.taxPercentage.toString() === '0'
							? 'Z'
							: 'S',
					vatRate: item.taxPercentage.toFixed(2),
				},
				// calculationPercent: undefined, // Optionally set if available
				// basisAmount: undefined, // Optionally set if available
			});
		} else {
			lines.push({
				identifier: `${idx + 1}`,
				note: item.description,
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
						unitMeasureCode: 'C62',
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
					},
					monetarySummation: {
						lineTotalAmount: Number(itemNetAmount).toFixed(2),
					},
				},
			});
			totalNetAmount += itemNetAmount;
			totalTaxAmount += itemTaxAmount;
			taxTotals[itemTaxCode] = {
				taxAmount: (taxTotals[itemTaxCode]?.taxAmount ?? 0) + itemTaxAmount,
				netAmount: (taxTotals[itemTaxCode]?.netAmount ?? 0) + itemNetAmount,
			};
		}
	});

	return {
		line: lines,
		allowances,
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
	allowances?: AllowanceCharge[], // Pass allowances for header sum
): {
	tradeSettlement: ProfileBasic['transaction']['tradeSettlement'];
} {
	// Calculate the sum of all line net amounts for header totals
	const lineTotalAmount = Number(totals.totalNetAmount).toFixed(2);
	const taxBasisTotalAmount = Number(totals.totalNetAmount).toFixed(2);
	const taxTotalAmount = Number(totals.totalTaxAmount).toFixed(2);
	// grandTotalAmount must be taxBasisTotalAmount + taxTotalAmount (BR-CO-15)
	const grandTotalAmount = (
		Number(taxBasisTotalAmount) + Number(taxTotalAmount)
	).toFixed(2);
	const paidAmount = invoice.paidCents
		? Number(invoice.paidCents / 100).toFixed(2)
		: '0.00';
	const roundingAmount = '0.00'; // Set to 0 unless you have explicit rounding
	// duePayableAmount must be grandTotalAmount - paidAmount + roundingAmount (BR-CO-16)
	const duePayableAmount = (
		Number(grandTotalAmount) -
		Number(paidAmount) +
		Number(roundingAmount)
	).toFixed(2);

	const isVatDisabled =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER ||
		vatStatus === VatStatus.VAT_DISABLED_OTHER;
	const exemptionReason =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER
			? 'Kleinunternehmerregelung § 19 UStG'
			: vatStatus === VatStatus.VAT_DISABLED_OTHER
				? 'VAT Exempt (Other Reason)'
				: undefined;

	// Calculate allowance total for header if any allowances exist
	const allowanceTotalAmount =
		allowances && allowances.length > 0
			? allowances
					.map((a) => Number(a.actualAmount))
					.reduce((sum, v) => sum + v, 0)
					.toFixed(2)
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
				// Add allowanceTotalAmount if allowances exist (BR-CO-11)
				...(allowanceTotalAmount ? { allowanceTotalAmount } : {}),
				// roundingAmount, // Do not output if not supported by ProfileBasic
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
	const sellerData = companyData.companyData;
	const vatStatus = companyData.vatStatus;
	const { line, allowances, totals } = mapInvoiceItemsToProfileBasic(
		invoice,
		vatStatus,
	);
	const { tradeSettlement } = mapInvoiceTotalsToProfileBasic(
		invoice,
		companyData,
		totals,
		vatStatus,
		allowances, // Pass allowances for header sum
	);

	return {
		number: invoice.invoiceNumber || invoice.id,
		typeCode: '380',
		issueDate: invoice.invoicedAt || invoice.createdAt || new Date(),
		// Only include includedNote if footerText is non-empty
		...(invoice.footerText
			? { includedNote: [{ content: invoice.footerText }] }
			: {}),
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
			tradeSettlement: {
				...tradeSettlement,
				// Map allowances to correct ZUGFeRD structure if present
				...(allowances.length > 0
					? {
							allowances: allowances.map((a): ProfileBasicAllowance => {
								// ZUGFeRD/EN16931 schema requires ChargeIndicator as the first child element
								const result: ProfileBasicAllowance = {
									chargeIndicator: a.chargeIndicator, // must be first
									actualAmount: a.actualAmount,
								} as ProfileBasicAllowance;
								if (a.reason) {
									result.reason = a.reason;
								}
								if (a.reasonCode) {
									result.reasonCode = a.reasonCode;
								}
								if (a.calculationPercent) {
									result.calculationPercent = a.calculationPercent;
								}
								if (a.basisAmount) {
									result.basisAmount = a.basisAmount;
								}
								if (a.categoryTradeTax) {
									result.categoryTradeTax = {
										categoryCode: a.categoryTradeTax.categoryCode,
										vatRate: a.categoryTradeTax.vatRate,
									};
								}
								return result;
							}),
						}
					: {}),
			},
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
