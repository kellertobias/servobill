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

	return {
		number: invoice.invoiceNumber || invoice.id, // Required: Invoice number
		typeCode: '380', // Required: '380' = Commercial invoice (default for most B2B invoices)
		issueDate: invoice.createdAt || new Date(), // Required: Issue date
		transaction: {
			tradeAgreement: {
				seller: {
					name: sellerData.name,
					postalAddress: {
						countryCode: sellerData.countryCode || 'DE',
						city: sellerData.city || '',
						postCode: sellerData.zip || '',
						line1: sellerData.street || '',
					},
					taxRegistration: {
						localIdentifier: sellerData.taxId,
						vatIdentifier: sellerData.vatId,
					},
				},
				buyer: {
					name: invoice.customer?.name || 'Unknown',
					postalAddress: {
						countryCode: invoice.customer?.countryCode || 'DE',
						city: invoice.customer?.city || '',
						postCode: invoice.customer?.zip || '',
						line1: invoice.customer?.street || '',
					},
				},
			},
			// Required: line items for the invoice
			line: (invoice.items || []).map((item, idx) => ({
				identifier: item.id || `ITEM${idx + 1}`,
				description: item.description,
				tradeProduct: {
					name: item.name || `Item ${idx + 1}`,
				},
				tradeAgreement: {
					netTradePrice: {
						chargeAmount: (item.priceCents ?? 0) / 100,
					},
				},
				tradeDelivery: {
					billedQuantity: {
						amount: item.quantity || 1,
						unitMeasureCode: 'H87', // Default to 'H87' (piece)
					},
				},
			})),
			// Required: minimal tradeSettlement
			tradeSettlement: {
				currencyCode: (companyData.currency ||
					'EUR') as ProfileBasic['transaction']['tradeSettlement']['currencyCode'],
				monetarySummation: {
					lineTotalAmount: (invoice.totalCents ?? 0) / 100, // Required by schema
					taxBasisTotalAmount: (invoice.totalCents ?? 0) / 100,
					taxTotal: {
						amount: (invoice.totalTax ?? 0) / 100,
						currencyCode: ((invoice as unknown as { currency?: string })
							.currency ||
							companyData.currency ||
							'EUR') as ProfileBasic['transaction']['tradeSettlement']['currencyCode'],
					},
					grandTotalAmount: (invoice.totalCents ?? 0) / 100,
					duePayableAmount: (invoice.totalCents ?? 0) / 100,
				},
			},
			// Required: minimal tradeDelivery (empty object, as allowed by schema)
			tradeDelivery: {},
		},
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
