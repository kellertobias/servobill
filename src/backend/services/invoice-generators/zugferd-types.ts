// Add a type alias for a single ProfileBasic allowance object for clarity

import type { ProfileBasic } from 'node-zugferd/profile/basic';

// This matches the expected structure for node-zugferd ProfileBasic allowances
export type ProfileBasicAllowance = NonNullable<
  NonNullable<ProfileBasic['transaction']['tradeSettlement']['allowances']>[number]
>;

export type CurrencyCode = ProfileBasic['transaction']['tradeSettlement']['currencyCode'];

export type TaxTotal = {
  taxAmount: number;
  netAmount: number;
  taxRate: number;
  vatCategoryCode: string;
  itemTaxCode: string;
};

export type Totals = {
  taxTotals: Record<string, TaxTotal>;
  lineNetAmount: number;
  allowanceNetAmount: number;
  // totalNetAmount: number;
};

export type Allowance = NonNullable<
  ProfileBasic['transaction']['tradeSettlement']['allowances']
>[number];

export type InvoiceLine = ProfileBasic['transaction']['line'][number];
