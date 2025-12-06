import { randomUUID } from 'node:crypto';

export class InvoiceItemEntity {
  public id!: string;
  public name!: string;
  public description?: string;
  public quantity!: number;
  public priceCents!: number;
  public taxPercentage!: number;
  public productId?: string;

  /**
   * The list of product expenses linked to this invoice item, with enabled/disabled state.
   */
  public linkedExpenses?: Array<{
    name: string;
    price: number;
    categoryId?: string;
    enabled: boolean;
    expenseId?: string;
  }>;

  constructor(props: Partial<InvoiceItemEntity>) {
    Object.assign(this, props);
    if (!this.id) {
      this.id = randomUUID().toString();
    }
  }

  public getTotalTaxCents(): number {
    return Math.round((this.quantity * this.priceCents * this.taxPercentage) / 100);
  }

  public getTotalCents(): number {
    return this.quantity * this.priceCents;
  }
}
