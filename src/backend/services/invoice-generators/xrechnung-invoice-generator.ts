// XRechnungInvoiceGenerator: Strategy for generating XRechnung XML invoices.
import { Invoice, InvoiceService } from '@e-invoice-eu/core';
import {
	InvoiceCurrencyCode,
	PaymentMeansTypeCode,
	VATBREAKDOWN,
	VATCategoryCode,
} from '@e-invoice-eu/core/dist/invoice/invoice.interface';

import { InvoiceGeneratorStrategy } from './interface';
import { PDFInvoiceGenerator } from './pdf-invoice-generator';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
	VatStatus,
} from '@/backend/entities/settings.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';

/**
 * Helper to determine VAT category code based on tax percentage, exemption, and company VAT status.
 *
 * @param taxPercentage - The tax percentage for the item
 * @param allExempt - Whether all items are exempt
 * @param vatStatus - The VAT/tax status of the company
 * @returns VATCategoryCode ('E', 'S', or 'Z')
 */
function getVatCategoryCode(
	taxPercentage: number,
	allExempt: boolean,
	vatStatus: string,
): VATCategoryCode {
	if (
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER ||
		vatStatus === VatStatus.VAT_DISABLED_OTHER
	) {
		return 'E';
	}
	if (allExempt) {
		return 'E';
	}
	if (taxPercentage > 0) {
		return 'S';
	}
	if (taxPercentage === 0) {
		return 'Z';
	}
	return 'E'; // Fallback
}

function mapInvoiceLineToUbl(
	item: InvoiceItemEntity,
	idx: number,
	currency: string,
	allExempt: boolean,
	vatStatus: string,
): Invoice['ubl:Invoice']['cac:InvoiceLine'][number] {
	const vatCode = getVatCategoryCode(item.taxPercentage, allExempt, vatStatus);
	return {
		'cbc:ID': String(idx + 1),
		'cbc:InvoicedQuantity': item.quantity.toFixed(2),
		'cbc:InvoicedQuantity@unitCode': 'C62',
		'cbc:LineExtensionAmount': (
			(item.priceCents * item.quantity) /
			100
		).toFixed(2),
		'cbc:LineExtensionAmount@currencyID': currency as InvoiceCurrencyCode,
		'cac:Item': {
			'cbc:Name': item.name,
			...(item.description
				? { 'cbc:Description': item.description }
				: { 'cbc:Description': item.name }),
			'cac:ClassifiedTaxCategory': {
				'cbc:ID': vatCode,
				'cbc:Percent': item.taxPercentage.toFixed(2),
				'cac:TaxScheme': { 'cbc:ID': 'VAT' },
			},
		},
		'cac:Price': {
			'cbc:PriceAmount': (item.priceCents / 100).toFixed(2),
			'cbc:PriceAmount@currencyID': currency as InvoiceCurrencyCode,
		},
	};
}

/**
 * Helper to map InvoiceEntity and settings to a UBL Invoice object for XRechnung.
 * Now includes correct tax subtotals, payment means, buyer reference, seller contact details, and allowance handling.
 * Negative net amount items are mapped as AllowanceCharge, not as InvoiceLine, per EN16931/XRechnung.
 */
function mapInvoiceToUbl(
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
): Invoice['ubl:Invoice'] {
	const seller = companyData.companyData;
	const buyer = invoice.customer;
	const currency = companyData.currency || 'EUR';
	const vatStatus = companyData.vatStatus;

	if (!buyer.email) {
		throw new Error('Buyer email is required for XRechnung');
	}

	const items = invoice.items || [];
	// Split items into regular lines and allowances (discounts/credits)
	const regularItems: InvoiceItemEntity[] = [];
	const allowances: InvoiceItemEntity[] = [];
	for (const item of items) {
		const netAmount = (item.priceCents * item.quantity) / 100;
		if (netAmount < 0) {
			allowances.push(item);
		} else {
			regularItems.push(item);
		}
	}

	// Group document-level allowances by VAT code/rate
	const allowanceGroups: Record<
		string,
		{ rate: number; code: string; items: InvoiceItemEntity[] }
	> = {};
	for (const item of allowances) {
		const code = getVatCategoryCode(item.taxPercentage, false, vatStatus);
		const rate = item.taxPercentage || 0;
		const key = `${code}_${rate}`;
		if (!allowanceGroups[key]) {
			allowanceGroups[key] = { rate, code, items: [] };
		}
		allowanceGroups[key].items.push(item);
	}

	// Group regular items by VAT rate and code for tax subtotals
	let taxGroups;
	const allExempt =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER ||
		vatStatus === VatStatus.VAT_DISABLED_OTHER
			? true
			: regularItems.length > 0 &&
				regularItems.every((item) => item.taxPercentage === 0);
	if (allExempt) {
		taxGroups = [{ rate: 0, code: 'E', items: regularItems }];
	} else {
		const groups: Record<
			string,
			{ rate: number; code: string; items: InvoiceItemEntity[] }
		> = {};
		for (const item of regularItems) {
			const code = getVatCategoryCode(item.taxPercentage, false, vatStatus);
			const rate = item.taxPercentage || 0;
			const key = `${code}_${rate}`;
			if (!groups[key]) {
				groups[key] = { rate, code, items: [] };
			}
			groups[key].items.push(item);
		}
		taxGroups = Object.values(groups);
	}

	// Calculate document-level allowance sums by VAT group
	const allowanceSumsByKey: Record<string, number> = {};
	Object.entries(allowanceGroups).forEach(([key, group]) => {
		allowanceSumsByKey[key] = group.items.reduce(
			(sum, item) => sum + Math.abs((item.priceCents * item.quantity) / 100),
			0,
		);
	});

	// Calculate tax subtotals, subtracting document-level allowances for each group
	const taxSubtotals = taxGroups.map((group): VATBREAKDOWN => {
		const key = `${group.code}_${group.rate}`;
		const taxableAmountLines = group.items.reduce(
			(sum, item) => sum + (item.priceCents * item.quantity) / 100,
			0,
		);
		const allowanceAmount = allowanceSumsByKey[key] || 0;
		const taxableAmount = taxableAmountLines - allowanceAmount;
		const percent = group.rate;
		const taxAmount = +(taxableAmount * (percent / 100)).toFixed(2);
		const vatCode = group.code as VATCategoryCode;

		let exemptionReason: string | undefined;
		if (vatCode === 'E') {
			if (vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER) {
				exemptionReason = 'Kleinunternehmerregelung § 19 UStG';
			} else if (vatStatus === VatStatus.VAT_DISABLED_OTHER) {
				exemptionReason = 'VAT Exempt (Other Reason)';
			} else {
				exemptionReason = 'VAT Exempt';
			}
		}

		return {
			'cbc:TaxableAmount': taxableAmount.toFixed(2),
			'cbc:TaxableAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxAmount': taxAmount.toFixed(2),
			'cbc:TaxAmount@currencyID': currency as InvoiceCurrencyCode,
			'cac:TaxCategory': {
				'cbc:ID': vatCode,
				'cbc:Percent': percent.toFixed(2),
				'cac:TaxScheme': { 'cbc:ID': 'VAT' },
				...(exemptionReason
					? { 'cbc:TaxExemptionReason': exemptionReason }
					: {}),
			},
		};
	});
	const totalTaxAmount = taxSubtotals.reduce(
		(sum, t) => sum + Number.parseFloat(t['cbc:TaxAmount']),
		0,
	);

	// Calculate monetary totals for XRechnung compliance
	const lineExtensionAmount = regularItems.reduce(
		(sum, item) => sum + (item.priceCents * item.quantity) / 100,
		0,
	);
	const totalAllowances = Object.values(allowanceSumsByKey).reduce(
		(sum, v) => sum + v,
		0,
	);
	const taxExclusiveAmount = lineExtensionAmount - totalAllowances;
	const taxInclusiveAmount = taxExclusiveAmount + totalTaxAmount;
	const payableAmount = taxInclusiveAmount;

	const hasIban = !!seller.bank?.iban;
	const hasBic = !!seller.bank?.bic;
	const paymentMeans = hasIban
		? [
				{
					'cbc:PaymentMeansCode': '30' as PaymentMeansTypeCode,
					'cbc:PaymentID': invoice.invoiceNumber || invoice.id,
					'cac:PayeeFinancialAccount': {
						'cbc:ID': seller.bank.iban,
						'cbc:Name': seller.name,
						...(hasBic
							? {
									'cac:FinancialInstitutionBranch': {
										'cbc:ID': seller.bank.bic,
									},
								}
							: {}),
					},
				},
			]
		: undefined;

	const buyerReference =
		buyer.customerNumber || invoice.invoiceNumber || invoice.id;
	const contactName = seller.name;
	const contactPhone = seller.phone ?? undefined;

	/**
	 * AllowanceCharge type for UBL XRechnung (DOCUMENTLEVELALLOWANCESANDCHARGES).
	 * This matches the expected UBL structure for cac:AllowanceCharge.
	 */
	type UBLAllowanceCharge = {
		'cbc:ChargeIndicator': string;
		'cbc:AllowanceChargeReason': string;
		'cbc:Amount': string;
		'cbc:Amount@currencyID': InvoiceCurrencyCode;
		'cac:TaxCategory': {
			'cbc:ID': VATCategoryCode;
			'cbc:Percent': string;
			'cac:TaxScheme': { 'cbc:ID': 'VAT' };
		};
	};
	const allowanceCharges: UBLAllowanceCharge[] = allowances.map((item) => {
		const netAmount = (item.priceCents * item.quantity) / 100;
		const vatCode = getVatCategoryCode(
			item.taxPercentage,
			allExempt,
			vatStatus,
		);
		return {
			'cbc:ChargeIndicator': 'false',
			'cbc:AllowanceChargeReason': item.name || 'Discount',
			'cbc:Amount': Math.abs(netAmount).toFixed(2),
			'cbc:Amount@currencyID': currency as InvoiceCurrencyCode,
			'cac:TaxCategory': {
				'cbc:ID': vatCode,
				'cbc:Percent': item.taxPercentage.toFixed(2),
				'cac:TaxScheme': { 'cbc:ID': 'VAT' },
			},
		};
	});

	return {
		'cbc:CustomizationID':
			'urn:cen.eu:en16931:2017#compliant#urn:fdc:gov.xrechnung.de:2017',
		'cbc:ProfileID': 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
		'cbc:ID': invoice.invoiceNumber || invoice.id,
		'cbc:IssueDate': (invoice.invoicedAt || invoice.createdAt || new Date())
			.toISOString()
			.slice(0, 10),
		'cbc:DueDate': invoice.dueAt
			? invoice.dueAt.toISOString().slice(0, 10)
			: undefined,
		'cbc:InvoiceTypeCode': '380',
		'cbc:DocumentCurrencyCode': currency as InvoiceCurrencyCode,
		'cbc:Note': invoice.footerText,
		'cbc:BuyerReference': buyerReference,
		'cac:AccountingSupplierParty': {
			'cac:Party': {
				'cbc:EndpointID': seller.email,
				'cbc:EndpointID@schemeID': 'EM',
				'cac:PartyName': { 'cbc:Name': seller.name },
				'cac:PostalAddress': {
					'cbc:StreetName': seller.street,
					'cbc:CityName': seller.city,
					'cbc:PostalZone': seller.zip,
					'cac:Country': {
						'cbc:IdentificationCode': seller.countryCode || 'DE',
					},
				},
				'cac:PartyTaxScheme': [
					{
						'cbc:CompanyID': seller.vatId,
						'cac:TaxScheme': { 'cbc:ID': 'VAT' },
					},
				],
				'cac:PartyLegalEntity': { 'cbc:RegistrationName': seller.name },
				'cac:Contact': {
					'cbc:Name': contactName,
					'cbc:ElectronicMail': seller.email,
					...(contactPhone ? { 'cbc:Telephone': contactPhone } : {}),
				},
			},
		},
		'cac:AccountingCustomerParty': {
			'cac:Party': {
				'cbc:EndpointID': buyer.email,
				'cbc:EndpointID@schemeID': 'EM',
				'cac:PartyName': { 'cbc:Name': buyer.name },
				'cac:PartyLegalEntity': { 'cbc:RegistrationName': buyer.name },
				'cac:PostalAddress': {
					'cbc:StreetName': buyer.street,
					'cbc:CityName': buyer.city,
					'cbc:PostalZone': buyer.zip,
					'cac:Country': {
						'cbc:IdentificationCode': buyer.countryCode || 'DE',
					},
				},
				'cac:Contact': { 'cbc:ElectronicMail': buyer.email },
			},
		},
		'cac:InvoiceLine': regularItems.map((item, idx) =>
			mapInvoiceLineToUbl(item, idx, currency, allExempt, vatStatus),
		) as Invoice['ubl:Invoice']['cac:InvoiceLine'],
		'cac:TaxTotal': [
			{
				'cbc:TaxAmount': totalTaxAmount.toFixed(2),
				'cbc:TaxAmount@currencyID': currency as InvoiceCurrencyCode,
				'cac:TaxSubtotal': taxSubtotals,
			},
		],
		'cac:LegalMonetaryTotal': {
			'cbc:LineExtensionAmount': lineExtensionAmount.toFixed(2),
			'cbc:LineExtensionAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxExclusiveAmount': taxExclusiveAmount.toFixed(2),
			'cbc:TaxExclusiveAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxInclusiveAmount': taxInclusiveAmount.toFixed(2),
			'cbc:TaxInclusiveAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:PayableAmount': payableAmount.toFixed(2),
			'cbc:PayableAmount@currencyID': currency as InvoiceCurrencyCode,
			// Add AllowanceTotalAmount for XRechnung compliance (BR-CO-11, BR-CO-13)
			...(totalAllowances > 0
				? {
						'cbc:AllowanceTotalAmount': totalAllowances.toFixed(2),
						'cbc:AllowanceTotalAmount@currencyID':
							currency as InvoiceCurrencyCode,
					}
				: {}),
		},
		// Add payment means if available
		...(paymentMeans ? { 'cac:PaymentMeans': paymentMeans } : {}),
		// Add AllowanceCharge if any
		...(allowanceCharges.length > 0
			? { 'cac:AllowanceCharge': allowanceCharges }
			: {}),
	};
}

/**
 * XRechnungInvoiceGenerator generates an XRechnung XML invoice using @e-invoice-eu/core.
 */
export class XRechnungInvoiceGenerator extends InvoiceGeneratorStrategy {
	constructor(private readonly pdfStrategy?: PDFInvoiceGenerator) {
		super();
	}

	/**
	 * Generates a PDF invoice using the CQRS bus and returns it as a single attachment.
	 */
	private async getOptionalPdf(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	) {
		if (this.pdfStrategy) {
			return await this.pdfStrategy.generate(invoice, options);
		}
		return [];
	}
	/**
	 * Generates XRechnung XML using @e-invoice-eu/core (format: xrechnung-ubl).
	 * @param invoice The invoice entity to export
	 * @param _options Context options (company data, settings, template)
	 * @returns Array with one XML attachment (Buffer, filename, mimeType)
	 */
	async generate(
		invoice: InvoiceEntity,
		options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string; mimeType?: string }[]> {
		const pdf = await this.getOptionalPdf(invoice, options);

		// Map InvoiceEntity to UBL invoice object and wrap as { 'ubl:Invoice': ... }
		const ublInvoice = {
			'ubl:Invoice': mapInvoiceToUbl(invoice, options.companyData),
		};

		// Use InvoiceService to generate XRechnung XML (format: xrechnung-ubl)
		// Pass a logger (console) as required by the library
		const service = new InvoiceService(console);

		const result = await service.generate(ublInvoice, {
			format: 'xrechnung-ubl',
			lang: 'en',
		});
		const xml = typeof result === 'string' ? result : result.toString();

		return [
			...pdf,
			{
				content: Buffer.from(xml, 'utf8'),
				filename: 'xrechnung.xml',
				mimeType: 'application/xml',
			},
		];
	}
}
