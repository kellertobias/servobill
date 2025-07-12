// XRechnungInvoiceGenerator: Strategy for generating XRechnung XML invoices.
import { Invoice, InvoiceService } from '@e-invoice-eu/core';
import {
	InvoiceCurrencyCode,
	PaymentMeansTypeCode,
	VATCategoryCode,
} from '@e-invoice-eu/core/dist/invoice/invoice.interface';

import { InvoiceGeneratorStrategy } from './interface';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';

// Helper to determine if all items are 0% tax
function allItemsExempt(items: InvoiceItemEntity[]): boolean {
	return items.length > 0 && items.every((item) => item.taxPercentage === 0);
}

// Helper to determine VAT category code based on tax percentage and exemption
function getVatCategoryCode(
	taxPercentage: number,
	allExempt: boolean,
): VATCategoryCode {
	if (allExempt) {
		return 'E';
	} // All exempt
	if (taxPercentage > 0) {
		return 'S';
	} // Standard rate
	if (taxPercentage === 0) {
		return 'Z';
	} // Zero-rated
	return 'E'; // Fallback
}

function mapInvoiceLineToUbl(
	item: InvoiceItemEntity,
	idx: number,
	currency: string,
	allExempt: boolean,
): Invoice['ubl:Invoice']['cac:InvoiceLine'][number] {
	const vatCode = getVatCategoryCode(item.taxPercentage, allExempt);
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
			// Only include Description if non-empty, else fallback to name
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
 * Now includes correct tax subtotals, payment means, buyer reference, and seller contact details.
 */
function mapInvoiceToUbl(
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
): Invoice['ubl:Invoice'] {
	const seller = companyData.companyData;
	const buyer = invoice.customer;
	const currency = companyData.currency || 'EUR';

	if (!buyer.email) {
		throw new Error('Buyer email is required for XRechnung');
	}

	const items = invoice.items || [];
	const totalNet = ((invoice.totalCents || 0) - (invoice.totalTax || 0)) / 100;
	const grandTotal = (invoice.totalCents || 0) / 100;

	const allExempt = allItemsExempt(items);

	// Group items by VAT rate and code for tax subtotals
	let taxGroups;
	if (allExempt) {
		// All exempt: one group, code 'E', rate 0
		taxGroups = [{ rate: 0, code: 'E', items }];
	} else {
		// Otherwise: group by code/rate, 0% = 'Z', >0 = 'S'
		const groups: Record<
			string,
			{ rate: number; code: string; items: InvoiceItemEntity[] }
		> = {};
		for (const item of items) {
			const code = getVatCategoryCode(item.taxPercentage, false);
			const rate = item.taxPercentage || 0;
			const key = `${code}_${rate}`;
			if (!groups[key]) {
				groups[key] = { rate, code, items: [] };
			}
			groups[key].items.push(item);
		}
		taxGroups = Object.values(groups);
	}

	const taxSubtotals = taxGroups.map((group) => {
		const taxableAmount = group.items.reduce(
			(sum, item) => sum + (item.priceCents * item.quantity) / 100,
			0,
		);
		const percent = group.rate;
		const taxAmount = +(taxableAmount * (percent / 100)).toFixed(2); // round to two decimals
		const vatCode = group.code as VATCategoryCode;
		return {
			'cbc:TaxableAmount': taxableAmount.toFixed(2),
			'cbc:TaxableAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxAmount': taxAmount.toFixed(2),
			'cbc:TaxAmount@currencyID': currency as InvoiceCurrencyCode,
			'cac:TaxCategory': {
				'cbc:ID': vatCode,
				'cbc:Percent': percent.toFixed(2),
				'cac:TaxScheme': { 'cbc:ID': 'VAT' },
			},
		};
	});
	const totalTaxAmount = taxSubtotals.reduce(
		(sum, t) => sum + Number.parseFloat(t['cbc:TaxAmount']),
		0,
	);

	/**
	 * XRechnung/UBL requires IBAN and BIC to be included in the PaymentMeans section for credit transfer (code 31).
	 * Only include these fields if they are real, non-dummy values.
	 */
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

	// Buyer reference (BT-10): use customer number, or fallback to invoice number
	const buyerReference =
		buyer.customerNumber || invoice.invoiceNumber || invoice.id;

	// Seller contact details (BT-41, BT-42): name, telephone (must have at least 3 digits)
	const contactName = seller.name;
	const contactPhone = seller.phone ?? undefined;

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
					// Only include phone if real and not dummy
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
		'cac:InvoiceLine': items.map((item, idx) =>
			mapInvoiceLineToUbl(item, idx, currency, allExempt),
		) as Invoice['ubl:Invoice']['cac:InvoiceLine'],
		'cac:TaxTotal': [
			{
				'cbc:TaxAmount': totalTaxAmount.toFixed(2),
				'cbc:TaxAmount@currencyID': currency as InvoiceCurrencyCode,
				'cac:TaxSubtotal': taxSubtotals,
			},
		],
		'cac:LegalMonetaryTotal': {
			'cbc:LineExtensionAmount': totalNet.toFixed(2),
			'cbc:LineExtensionAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxExclusiveAmount': totalNet.toFixed(2),
			'cbc:TaxExclusiveAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxInclusiveAmount': grandTotal.toFixed(2),
			'cbc:TaxInclusiveAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:PayableAmount': grandTotal.toFixed(2),
			'cbc:PayableAmount@currencyID': currency as InvoiceCurrencyCode,
		},

		// Add payment means if available
		...(paymentMeans ? { 'cac:PaymentMeans': paymentMeans } : {}),
	};
}

/**
 * XRechnungInvoiceGenerator generates an XRechnung XML invoice using @e-invoice-eu/core.
 */
export class XRechnungInvoiceGenerator extends InvoiceGeneratorStrategy {
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
	): Promise<{ content: Buffer; filename: string; mimeType: string }[]> {
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
			{
				content: Buffer.from(xml, 'utf8'),
				filename: 'xrechnung.xml',
				mimeType: 'application/xml',
			},
		];
	}
}
