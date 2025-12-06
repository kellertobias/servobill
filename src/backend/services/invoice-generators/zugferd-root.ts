import type { ProfileBasic } from 'node-zugferd/profile/basic';
import type { InvoiceEntity } from '@/backend/entities/invoice.entity';
import type { CompanyDataSetting } from '@/backend/entities/settings.entity';
import { mapInvoiceItemsToProfileBasic } from './zugferd-line';
import { mapInvoiceTotalsToProfileBasic } from './zugferd-totals';

/**
 * Helper to map InvoiceEntity and settings to ProfileBasic for ZUGFeRD.
 * Now supports allowances (discounts/credits) for negative items.
 * Ensures ChargeIndicator is the first property in SpecifiedTradeAllowanceCharge for XML schema compliance.
 * Subtracts allowances from VAT breakdown and monetary summation per VAT group.
 * @param invoice The invoice entity from the domain
 * @param companyData The seller/company data
 * @returns ProfileBasic-compliant object
 */
export function mapInvoiceToProfileBasic(
  invoice: InvoiceEntity,
  companyData: CompanyDataSetting
): ProfileBasic {
  const sellerData = companyData.companyData;
  const vatStatus = companyData.vatStatus;
  const { line, allowances, totals } = mapInvoiceItemsToProfileBasic(invoice, vatStatus);

  const { tradeSettlement } = mapInvoiceTotalsToProfileBasic(
    invoice,
    companyData,
    totals,
    vatStatus,
    allowances
  );

  return {
    number: invoice.invoiceNumber || invoice.id,
    typeCode: '380',
    issueDate: invoice.invoicedAt || invoice.createdAt || new Date(),
    ...(invoice.footerText ? { includedNote: [{ content: invoice.footerText }] } : {}),
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
