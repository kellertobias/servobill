'use client';

import { PlusIcon } from '@heroicons/react/20/solid';
import React from 'react';
import { exportProducts, importProducts } from '@/api/import-export/products';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { PageContent } from '@/components/page';
import { Table } from '@/components/table';
import { useLoadData } from '@/hooks/load-data';

import ProductOverlay from './product-overlay';

export default function ProductsHomePage() {
  const [selectedProductId, setSelectedProductId] = React.useState<null | string>(null);

  const { data, loading, reload } = useLoadData(async () => {
    const data = await API.query({
      query: gql(`
				query ProductsHomePageListData {
					products {
						id
						name
						category
						description
						notes
						unit
						priceCents
						createdAt
						updatedAt
					}
				}
			`),
    }).then((res) => res.products);
    return data;
  });

  return (
    <>
      {selectedProductId && (
        <ProductOverlay
          productId={selectedProductId}
          onClose={(reloadData?: boolean) => {
            setSelectedProductId(null);
            if (reloadData) {
              reload();
            }
          }}
          openCreated={(id) => {
            setSelectedProductId(id);
          }}
        />
      )}
      <PageContent
        title="Products"
        noPadding
        contentClassName="overflow-hidden pt-6"
        right={
          <>
            <Button icon={PlusIcon} header onClick={() => setSelectedProductId('new')}>
              New Product
            </Button>
          </>
        }
        footer={
          <>
            <div className="flex justify-center mt-6 gap-1 text-gray-500 text-xs">
              <a
                className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                onClick={async () => {
                  await importProducts();

                  reload();
                }}
              >
                Import from JSON
              </a>{' '}
              &bull;{' '}
              <a
                className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                onClick={async () => {
                  await exportProducts();
                }}
              >
                Export to JSON
              </a>
            </div>
          </>
        }
      >
        <Table
          title="Products"
          data={data}
          loading={loading}
          keyField="id"
          getCategory={(data) => data.category}
          getLineLink={(data) => () => setSelectedProductId(data.id)}
          columns={[
            {
              key: 'name',
              title: 'Name',
              className: 'py-5',
              render: (product) => (
                <>
                  <div className="text-sm font-medium leading-6 text-gray-900">{product.name}</div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    <span className="text-gray-900 text-ellipsis">
                      {product.description?.slice(0, 70)}…
                    </span>
                  </div>
                </>
              ),
            },
            {
              key: 'action',
              title: 'Action',
              className: 'py-5 text-right',
              render: (product) => (
                <>
                  <div className="flex justify-end">
                    <a
                      onClick={() => setSelectedProductId(product.id)}
                      className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500"
                    >
                      View <span className="hidden sm:inline">Product</span>
                    </a>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    <span className="text-gray-900">
                      {API.centsToPrice(product.priceCents)} €/ {product.unit}
                    </span>
                  </div>
                </>
              ),
            },
          ]}
        />
      </PageContent>
    </>
  );
}
