// XRechnungInvoiceGenerator: Strategy for generating XRechnung XML invoices.
import { Invoice, InvoiceService } from '@e-invoice-eu/core';
import { InvoiceCurrencyCode } from '@e-invoice-eu/core/dist/invoice/invoice.interface';

import { InvoiceGeneratorStrategy } from './interface';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';

function mapInvoiceLineToUbl(
	item: InvoiceItemEntity,
	idx: number,
	currency: string,
): Invoice['ubl:Invoice']['cac:InvoiceLine'][number] {
	return {
		'cbc:ID': String(idx + 1),
		// UBL expects InvoicedQuantity as a string, with unit code as sibling
		'cbc:InvoicedQuantity': item.quantity.toFixed(2),
		'cbc:InvoicedQuantity@unitCode': 'C62',
		// UBL expects LineExtensionAmount as a string, with currency as sibling
		'cbc:LineExtensionAmount': (
			(item.priceCents * item.quantity) /
			100
		).toFixed(2),
		'cbc:LineExtensionAmount@currencyID': currency as InvoiceCurrencyCode,
		'cac:Item': {
			'cbc:Name': item.name,
			'cbc:Description': item.description,
			'cac:ClassifiedTaxCategory': {
				'cbc:ID': 'S', // Standard rate
				'cbc:Percent': item.taxPercentage.toFixed(2),
				'cac:TaxScheme': { 'cbc:ID': 'VAT' },
			},
		},
		'cac:Price': {
			// UBL expects PriceAmount as a string, with currency as sibling
			'cbc:PriceAmount': (item.priceCents / 100).toFixed(2),
			'cbc:PriceAmount@currencyID': currency as InvoiceCurrencyCode,
		},
	};
}

/**
 * Helper to map InvoiceEntity and settings to a UBL Invoice object for XRechnung.
 * Only minimal required fields are mapped for now; extend as needed.
 * @param invoice The invoice entity from the domain
 * @param companyData The seller/company data
 * @returns UBL-compliant invoice object
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

	// Calculate totals for required fields
	const totalNet = ((invoice.totalCents || 0) - (invoice.totalTax || 0)) / 100;
	const totalTax = (invoice.totalTax || 0) / 100;
	const grandTotal = (invoice.totalCents || 0) / 100;

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
		'cbc:InvoiceTypeCode': '380', // 380 = Commercial invoice
		'cbc:DocumentCurrencyCode': currency as InvoiceCurrencyCode, // Required by UBL
		'cbc:Note': invoice.footerText,
		'cac:AccountingSupplierParty': {
			'cac:Party': {
				// UBL expects EndpointID as a string, with schemeID as sibling
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
				'cac:Contact': { 'cbc:ElectronicMail': seller.email },
			},
		},
		'cac:AccountingCustomerParty': {
			'cac:Party': {
				// UBL expects EndpointID as a string, with schemeID as sibling
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
		'cac:InvoiceLine': (invoice.items || []).map((item, idx) =>
			mapInvoiceLineToUbl(item, idx, currency),
		) as Invoice['ubl:Invoice']['cac:InvoiceLine'],
		// Add required totals for UBL compliance
		'cac:TaxTotal': [
			{
				// UBL expects TaxAmount as a string, with currency as sibling
				'cbc:TaxAmount': totalTax.toFixed(2),
				'cbc:TaxAmount@currencyID': currency as InvoiceCurrencyCode,
				'cac:TaxSubtotal': [
					{
						// UBL expects TaxableAmount and TaxAmount as strings, with currency as sibling
						'cbc:TaxableAmount': totalNet.toFixed(2),
						'cbc:TaxableAmount@currencyID': currency as InvoiceCurrencyCode,
						'cbc:TaxAmount': totalTax.toFixed(2),
						'cbc:TaxAmount@currencyID': currency as InvoiceCurrencyCode,
						'cac:TaxCategory': {
							'cbc:ID': 'S',
							'cbc:Percent':
								invoice.items[0]?.taxPercentage?.toFixed(2) || '0.00',
							'cac:TaxScheme': { 'cbc:ID': 'VAT' },
						},
					},
				],
			},
		],
		'cac:LegalMonetaryTotal': {
			// UBL expects all monetary fields as strings, with currency as sibling
			'cbc:LineExtensionAmount': totalNet.toFixed(2),
			'cbc:LineExtensionAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxExclusiveAmount': totalNet.toFixed(2),
			'cbc:TaxExclusiveAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:TaxInclusiveAmount': grandTotal.toFixed(2),
			'cbc:TaxInclusiveAmount@currencyID': currency as InvoiceCurrencyCode,
			'cbc:PayableAmount': grandTotal.toFixed(2),
			'cbc:PayableAmount@currencyID': currency as InvoiceCurrencyCode,
		},
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
		_options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string; mimeType: string }[]> {
		// Map InvoiceEntity to UBL invoice object and wrap as { 'ubl:Invoice': ... }
		const ublInvoice = {
			'ubl:Invoice': mapInvoiceToUbl(invoice, _options.companyData),
		};

		// Use InvoiceService to generate XRechnung XML (format: xrechnung-ubl)
		// Pass a logger (console) as required by the library
		const service = new InvoiceService(console);
		// Type assertion to 'unknown as any' is safe here because the library expects a plain JS object and is not fully typed
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
