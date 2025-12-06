import type { InvoiceEntity } from '@/backend/entities/invoice.entity';
import type { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import type { VatStatus } from '@/backend/entities/settings.entity';
import { getVatInfo } from './zugferd-helpers';
import type { Allowance, InvoiceLine, Totals } from './zugferd-types';

const getLine = (
	idx: number,
	item: InvoiceItemEntity,
	isVatDisabled: boolean,
) => {
	const priceCents = item.priceCents ?? 0;
	const quantity = item.quantity ?? 1;
	const totalPriceCents = priceCents * quantity;
	const itemTaxPercentage = item.taxPercentage ?? 0;

	const itemSinglePrice = totalPriceCents / 100;
	const itemTotalPrice = totalPriceCents / 100;
	const itemTaxAmount = (itemTotalPrice * itemTaxPercentage) / 100;

	const vatCategoryCode = isVatDisabled
		? ('E' as const)
		: itemTaxPercentage === 0
			? ('Z' as const)
			: ('S' as const);

	const itemTaxCode = `${vatCategoryCode}_${itemTaxPercentage}`;

	return {
		identifier: `${idx + 1}`,
		itemSinglePrice,
		itemTotalPrice,
		itemTaxAmount,
		itemTaxCode,
		vatCategoryCode,
		itemTaxPercentage,
		totalPriceCents,
		quantity,
		unitMeasureCode: 'C62' as const,
	};
};

const getLineItem = (
	item: InvoiceItemEntity,
	prep: ReturnType<typeof getLine>,
	exemptionReason: ReturnType<typeof getVatInfo>['exemptionReason'],
) => ({
	identifier: prep.identifier,
	note: item.description,
	tradeProduct: {
		name: item.name || `Item ${prep.identifier}`,
	},
	tradeAgreement: {
		netTradePrice: {
			chargeAmount: Number(prep.itemSinglePrice).toFixed(2),
		},
	},
	tradeDelivery: {
		billedQuantity: {
			amount: prep.quantity,
			unitMeasureCode: prep.unitMeasureCode,
		},
	},
	tradeSettlement: {
		tradeTax: {
			typeCode: 'VAT',
			categoryCode: prep.vatCategoryCode,
			...exemptionReason,
			rateApplicablePercent: prep.itemTaxPercentage.toFixed(2),
		},
		monetarySummation: {
			lineTotalAmount: Number(prep.itemTotalPrice).toFixed(2),
		},
	},
});

/**
 * Maps a negative invoice item (discount/credit) to a ZUGFeRD document-level allowance object (BG-20).
 *
 * Per ZUGFeRD Basic WL profile, required fields are:
 * - actualAmount: The allowance amount (positive value)
 * - basisAmount: The base amount the allowance applies to (usually the line's net amount)
 * - calculationPercent: The percentage, if applicable (optional)
 * - reasonCode: Code for the allowance reason (e.g., 'AA' for discount)
 * - reason: Textual reason for the allowance
 * - categoryTradeTax: VAT info (categoryCode, vatRate)
 *
 * @param item The invoice item entity (negative net amount)
 * @param prep The prepared line data (from getLine)
 * @param exemptionReason VAT exemption reason, if any
 * @returns Allowance object for ZUGFeRD
 */
const getAllowanceItem = (
	item: InvoiceItemEntity,
	prep: ReturnType<typeof getLine>,
	exemptionReason: ReturnType<typeof getVatInfo>['exemptionReason'],
): Allowance => {
	const actualAmount = Math.abs(prep.itemTotalPrice).toFixed(2);

	// Per EN16931, reasonCode '95' is used for "Discount" (see https://www.unece.org/trade/untdid/d16b/tred/tred4465.htm)
	const reasonCode = '95';
	const reason = item.name || 'Discount';

	return {
		actualAmount,
		reasonCode,
		reason,
		categoryTradeTax: {
			categoryCode: prep.vatCategoryCode,
			vatRate: prep.itemTaxPercentage.toFixed(2),
			...exemptionReason,
		},
	};
};

/**
 * Maps invoice items to ZUGFeRD ProfileBasic lines and collects allowances (discounts/credits).
 * Negative net amounts are treated as document-level allowances, not as regular lines, per EN16931/ZUGFeRD.
 *
 * For each VAT group, allowances are grouped and subtracted from the VAT breakdown and monetary summation.
 *
 * @param invoice The invoice entity
 * @param vatStatus The VAT/tax status of the company (affects tax category code and exemption reason)
 * @returns Object with mapped lines, allowances, and totals
 */
export function mapInvoiceItemsToProfileBasic(
	invoice: InvoiceEntity,
	vatStatus: VatStatus,
): {
	line: InvoiceLine[];
	allowances: Allowance[];
	totals: Totals;
} {
	const taxTotals: Totals['taxTotals'] = {};

	let lineNetAmount: Totals['lineNetAmount'] = 0;
	let allowanceNetAmount: Totals['allowanceNetAmount'] = 0;

	const { isVatDisabled, exemptionReason } = getVatInfo(vatStatus);

	const lines: InvoiceLine[] = [];
	const allowances: Allowance[] = [];

	(invoice.items || []).forEach((item, idx) => {
		const prep = getLine(idx, item, isVatDisabled);

		if (prep.totalPriceCents < 0) {
			allowanceNetAmount += Math.abs(prep.itemTotalPrice);

			taxTotals[prep.itemTaxCode] = {
				taxAmount:
					(taxTotals[prep.itemTaxCode]?.taxAmount ?? 0) -
					Math.abs(prep.itemTaxAmount),
				netAmount:
					(taxTotals[prep.itemTaxCode]?.netAmount ?? 0) -
					Math.abs(prep.itemTotalPrice),
				vatCategoryCode: prep.vatCategoryCode,
				itemTaxCode: prep.itemTaxCode,
				taxRate: prep.itemTaxPercentage,
			};

			allowances.push(getAllowanceItem(item, prep, exemptionReason));
		} else {
			lines.push(getLineItem(item, prep, exemptionReason));

			lineNetAmount += prep.itemTotalPrice;

			taxTotals[prep.itemTaxCode] = {
				taxAmount:
					(taxTotals[prep.itemTaxCode]?.taxAmount ?? 0) +
					Math.abs(prep.itemTaxAmount),
				netAmount:
					(taxTotals[prep.itemTaxCode]?.netAmount ?? 0) +
					Math.abs(prep.itemTotalPrice),
				vatCategoryCode: prep.vatCategoryCode,
				itemTaxCode: prep.itemTaxCode,
				taxRate: prep.itemTaxPercentage,
			};
		}
	});

	return {
		line: lines,
		allowances,
		totals: {
			taxTotals,
			lineNetAmount,
			allowanceNetAmount,
		},
	};
}
