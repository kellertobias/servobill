export type InvoiceTotalsRequriedFields = {
	items: { priceCents: number; quantity: number; taxPercentage?: number }[];
};

export const getInvoiceTotal = (invoice: InvoiceTotalsRequriedFields) =>
	(invoice.items || []).reduce(
		(acc, item) =>
			acc +
			(Number(item.priceCents) *
				Number(item.quantity) *
				(100 + Number(item.taxPercentage))) /
				100,
		0,
	);

export const getInvoiceSubTotal = (invoice: InvoiceTotalsRequriedFields) =>
	(invoice.items || []).reduce(
		(acc, item) => acc + Number(item.priceCents) * Number(item.quantity),
		0,
	);

export const getInvoiceTaxTotal = (invoice: InvoiceTotalsRequriedFields) =>
	(invoice.items || []).reduce(
		(acc, item) =>
			acc +
			(Number(item.priceCents) *
				Number(item.quantity) *
				Number(item.taxPercentage)) /
				100,
		0,
	);
