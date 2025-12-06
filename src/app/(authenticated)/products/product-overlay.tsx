import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { API, gql } from '@/api/index';
import { useExpenseCategories } from '@/app/_hooks/use-expense-categories';
import type { ProductExpense } from '@/common/gql/graphql';
import { Button } from '@/components/button';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { LoadingSkeleton } from '@/components/loading';
import SelectInput from '@/components/select-input';
import { useLoadData, useSaveCallback } from '@/hooks/load-data';

const createId = () => Math.random().toString(36).slice(2, 15);

export default function ProductOverlay({
  productId,
  onClose,
  openCreated,
}: {
  productId: string;
  onClose: (reloadData?: boolean) => void;
  openCreated: (id: string) => void;
}) {
  const { data, setData, initialData, reload } = useLoadData(
    async ({ productId }: { productId: string }) =>
      productId === 'new'
        ? {
            id: 'new',
            name: '',
            category: '',
            description: '',
            notes: '',
            price: '',
            taxPercentage: '0',
            createdAt: null,
            updatedAt: null,
            expenses: [] as (Omit<ProductExpense, 'price'> & {
              price: string;
              id: string;
              categoryId?: string;
            })[],
          }
        : API.query({
            query: gql(`
						query ProductsDetailPageData($id: String!) {
							product(id: $id) {
								id
								name
								category
								description
								notes
								priceCents
								taxPercentage
								createdAt
								updatedAt
								expenses {
									name
									price
									categoryId
								}
							}
						}
					`),
            variables: {
              id: productId,
            },
          }).then((res) =>
            res.product
              ? {
                  ...res.product,
                  price: API.centsToPrice(res.product.priceCents),
                  taxPercentage: `${res.product.taxPercentage || 0}`,
                  expenses: (res.product.expenses || []).map((e) => ({
                    ...e,
                    price: API.centsToPrice(e.price),
                    id: createId(),
                  })),
                }
              : null
          ),
    { productId }
  );

  const { onSave } = useSaveCallback({
    id: productId,
    entityName: 'Product',
    data,
    initialData,
    openCreated,
    reload,
    mapper: (data) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { price, createdAt, updatedAt, expenses, ...rest } = data;
      return {
        ...rest,
        priceCents: API.priceToCents(price),
        taxPercentage: Number.parseInt(data.taxPercentage || '0'),
        expenses: data.expenses.map((e) => ({
          name: e.name,
          categoryId: e.categoryId || null,
          price: API.priceToCents(e.price) || 0,
        })),
      };
    },
  });

  const categories = useExpenseCategories();

  const handleAddExpense = () => {
    setData((prev) => ({
      ...prev,
      expenses: [
        ...(prev?.expenses || []),
        {
          name: '',
          price: '0',
          categoryId: null,
          id: createId(),
        },
      ],
    }));
  };

  const handleRemoveExpense = (id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: (prev?.expenses || []).filter((e) => e.id !== id),
    }));
  };

  const handleExpenseChange = (id: string, field: string, value: unknown) => {
    setData((prev) => ({
      ...prev,
      expenses: (prev?.expenses || []).map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  };

  return (
    <Drawer
      id={productId}
      title={productId === 'new' ? 'New Product' : 'Edit Product'}
      subtitle={initialData?.name}
      onClose={onClose}
      onSave={
        onSave
          ? async () => {
              await onSave?.();
              onClose(true);
            }
          : undefined
      }
      deleteText={{
        title: 'Delete Product',
        content: (
          <>
            Are you sure you want to delete the product <b>{data?.name}</b>? This action cannot be
            undone.
            <br />
            Invoices and Offers containing this product will not be deleted.
          </>
        ),
      }}
      onDelete={
        productId === 'new'
          ? undefined
          : async () => {
              await API.query({
                query: gql(`
						mutation DeleteProduct($id: String!) {
							deleteProduct(id: $id) {id}
						}
					`),
                variables: {
                  id: productId,
                },
              });
              onClose(true);
            }
      }
    >
      {data ? (
        <>
          <div className="divide-y divide-gray-200 px-4 sm:px-6">
            <div className="space-y-6 pb-5 pt-6">
              <Input
                className="col-span-full"
                label="Product Name"
                value={data.name}
                onChange={(name) => {
                  setData((prev) => ({ ...prev, name }));
                }}
                displayFirst
              />

              <Input
                className="col-span-full"
                label="Price"
                value={data.price}
                onChange={(price) => {
                  setData((prev) => ({ ...prev, price }));
                }}
                displayFirst
              />

              <Input
                className="col-span-full"
                label="Tax Percentage"
                value={data.taxPercentage}
                onChange={(taxPercentage) => {
                  setData((prev) => ({ ...prev, taxPercentage }));
                }}
                displayFirst
              />

              <Input
                className="col-span-full"
                label="Category"
                value={data.category}
                onChange={(category) => {
                  setData((prev) => ({ ...prev, category }));
                }}
                displayFirst
              />

              <Input
                className="col-span-full"
                label="Description (On Bills)"
                value={data.description}
                onChange={(description) => {
                  setData((prev) => ({ ...prev, description }));
                }}
                displayFirst
                textarea
              />

              <Input
                className="col-span-full"
                label="Notes (Private)"
                value={data.notes}
                onChange={(notes) => {
                  setData((prev) => ({ ...prev, notes }));
                }}
                displayFirst
                textarea
              />

              {/* Expenses Section */}
              <div className="col-span-full">
                <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                  Product Expenses (optional)
                </label>
                {data.expenses.map((expense: (typeof data.expenses)[number]) => (
                  <div
                    key={expense.id}
                    className="grid grid-cols-12 gap-x-2 gap-y-1 mb-2 p-2 border rounded-md bg-gray-50"
                  >
                    {/* First row: Name (span 11 cols) and Delete button (span 1 col) */}
                    <div className="col-span-12 flex items-center">
                      <Input
                        label="Name"
                        value={expense.name}
                        onChange={(val) => handleExpenseChange(expense.id, 'name', val)}
                        className="w-full"
                      />
                    </div>
                    {/* Third row: Category selector */}
                    <div className="col-span-12">
                      <SelectInput
                        label="Category"
                        value={expense.categoryId || ''}
                        onChange={(val) => handleExpenseChange(expense.id, 'categoryId', val)}
                        options={[
                          { value: '', label: 'No Category' },
                          ...categories.map((cat) => ({
                            value: cat.id,
                            label: cat.name,
                            description: cat.description || '',
                          })),
                        ]}
                        className="w-full"
                      />
                    </div>
                    {/* Second row: Price */}
                    <div className="col-span-4">
                      <Input
                        label="Price"
                        value={expense.price}
                        onChange={(val) => handleExpenseChange(expense.id, 'price', val)}
                        type="text"
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-4 pt-8 flex items-center justify-end">
                      <Button
                        icon={TrashIcon}
                        danger
                        onClick={() => handleRemoveExpense(expense.id)}
                        aria-label="Remove expense"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={handleAddExpense} icon={PlusIcon}>
                  Add Expense
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <LoadingSkeleton />
      )}
    </Drawer>
  );
}
