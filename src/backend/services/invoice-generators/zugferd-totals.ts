import type { ProfileBasic } from 'node-zugferd/profile/basic';
import type { InvoiceEntity } from '@/backend/entities/invoice.entity';
import type {
	CompanyDataSetting,
	VatStatus,
} from '@/backend/entities/settings.entity';
import { getVatInfo } from './zugferd-helpers';
import type { Allowance, CurrencyCode, Totals } from './zugferd-types';

function getPaymentInstruction(
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
): {
	paymentInstruction: ProfileBasic['transaction']['tradeSettlement']['paymentInstruction'];
	paymentTerms: ProfileBasic['transaction']['tradeSettlement']['paymentTerms'];
} {
	return {
		paymentInstruction: {
			typeCode: '30',
			transfers: [
				{
					paymentAccountIdentifier: companyData.companyData.bank.iban,
				},
			],
		},
		paymentTerms: {
			dueDate: invoice.dueAt,
		},
	};
}

function getVatBreakdown(
	totals: Totals,
	vatStatus: VatStatus,
): {
	vatBreakdown: ProfileBasic['transaction']['tradeSettlement']['vatBreakdown'];
	taxTotalAmount: number;
} {
	const { exemptionReason } = getVatInfo(vatStatus);
	let taxTotalAmount = 0;

	const vatBreakdown = Object.entries(totals.taxTotals).map(([, value]) => {
		const basisAmount = Number(value.netAmount);
		taxTotalAmount += Number(value.taxAmount);
		return {
			// Is required (BT-114) and must be "VAT"
			typeCode: 'VAT',

			// VAT category code (BT-115), E = Exempt, S = Standard, Z = Zero-Rated
			// if exempt, the exemption reason text (BT-120) is required
			categoryCode: value.vatCategoryCode as 'E' | 'S' | 'Z',
			...exemptionReason,

			// Values
			// VAT category rate (BT-119) in percent with two decimals
			rateApplicablePercent: Number(value.taxRate).toFixed(2),

			// Sum of all line items (BT-116) + allowances (BT-118)
			// with this tax code
			basisAmount: basisAmount.toFixed(2),

			// VAT category tax amount (BT-117) =
			// VAT category taxable amount (BT-116) x
			// (VAT category rate (BT-119) / 100),
			// rounded to two decimals
			calculatedAmount: Number((basisAmount * value.taxRate) / 100).toFixed(2),
		};
	});

	return {
		vatBreakdown,
		taxTotalAmount,
	};
}

function getMonetarySummation(
	totals: Totals,
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
	allowances: Allowance[] | undefined,
	taxTotalAmount: number,
): ProfileBasic['transaction']['tradeSettlement']['monetarySummation'] {
	// taxBasisTotalAmount (BT-109) = lineTotalAmount - allowanceTotalAmount
	const taxBasisTotalAmount = (
		totals.lineNetAmount - totals.allowanceNetAmount
	).toFixed(2);

	const grandTotalAmount = (
		Number(taxBasisTotalAmount) + Number(taxTotalAmount)
	).toFixed(2);

	const paidAmount = invoice.paidCents
		? Number(invoice.paidCents / 100).toFixed(2)
		: '0.00';

	const roundingAmount = '0.00';

	const duePayableAmount = (
		Number(grandTotalAmount) -
		Number(paidAmount) +
		Number(roundingAmount)
	).toFixed(2);

	return {
		lineTotalAmount: totals.lineNetAmount.toFixed(2),
		taxBasisTotalAmount,
		taxTotal: {
			amount: taxTotalAmount.toFixed(2),
			currencyCode: (companyData.currency || 'EUR') as CurrencyCode,
		},
		paidAmount,
		grandTotalAmount,
		duePayableAmount,
		// Add allowanceTotalAmount if allowances exist (BR-CO-11)
		...(allowances && allowances.length > 0
			? {
					allowanceTotalAmount: allowances
						.reduce((acc, allowance) => acc + Number(allowance.actualAmount), 0)
						.toFixed(2),
				}
			: {}),
	};
}
/**
 * Updates the VAT breakdown and monetary summation to subtract allowances per VAT group.
 * This is required for ZUGFeRD/EN16931 compliance (see BR-S-08, BR-CO-11, BR-CO-13).
 */
export function mapInvoiceTotalsToProfileBasic(
	invoice: InvoiceEntity,
	companyData: CompanyDataSetting,
	totals: Totals,
	vatStatus: VatStatus,
	allowances?: Allowance[],
): {
	tradeSettlement: ProfileBasic['transaction']['tradeSettlement'];
} {
	const { vatBreakdown, taxTotalAmount } = getVatBreakdown(totals, vatStatus);

	return {
		tradeSettlement: {
			currencyCode: (companyData.currency || 'EUR') as CurrencyCode,
			monetarySummation: getMonetarySummation(
				totals,
				invoice,
				companyData,
				allowances,
				taxTotalAmount,
			),
			vatBreakdown,
			allowances,
			...getPaymentInstruction(invoice, companyData),
		},
	};
}
