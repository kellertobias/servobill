// XRechnungInvoiceGenerator: Strategy for generating XRechnung XML invoices.
// import einvoice from '@e-invoice-eu/core';
import { MethodNotImplementedError } from 'pdf-lib';

import { InvoiceGeneratorStrategy } from './interface';

import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';

/**
 * XRechnungInvoiceGenerator generates an XRechnung XML invoice using @e-invoice-eu/core.
 */
export class XRechnungInvoiceGenerator extends InvoiceGeneratorStrategy {
	/**
	 * Generates XRechnung XML using @e-invoice-eu/core (profile XRECHNUNG_2_2).
	 */
	async generate(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		invoice: InvoiceEntity,
		// options is intentionally unused for now
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_options: {
			companyData: CompanyDataSetting;
			invoiceSettings: InvoiceSettingsEntity;
			template: PdfTemplateSetting;
		},
	): Promise<{ content: Buffer; filename: string; mimeType: string }[]> {
		throw new MethodNotImplementedError(
			'XRechnungInvoiceGenerator',
			'generate',
		);
		// // Map InvoiceEntity to UblInvoice (domain-specific, may need adjustment)
		// // For now, assume invoice is already in the correct format
		// // eslint-disable-next-line @typescript-eslint/no-explicit-any
		// const descriptor = InvoiceDescriptor.fromUblInvoice(
		// 	invoice as any, // TODO: Replace with correct mapping if needed
		// 	Profiles.XRECHNUNG_2_2,
		// );
		// const xml = await descriptor.toXml();
		// return [
		// 	{
		// 		content: Buffer.from(xml, 'utf8'),
		// 		filename: 'xrechnung.xml',
		// 		mimeType: 'application/xml',
		// 	},
		// ];
	}
}
