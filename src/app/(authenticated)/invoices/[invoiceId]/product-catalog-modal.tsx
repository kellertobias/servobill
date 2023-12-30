import { useState } from 'react';

import CommandPallette from '@/components/command-pallette';
import { useLoadData } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';

import { InvoiceData } from './data';

export function ProductCatalogModal({
	onClose,
	onSelect,
}: {
	onClose: () => void;
	onSelect: (productId: string, product: InvoiceData['items'][number]) => void;
}) {
	const [search, setSearch] = useState('');
	const { data } = useLoadData(
		async ({ search }) =>
			API.query({
				query: gql(`
                    query SearchProducts($search: String!) {
                        products(where: {search: $search}, limit: 10) {
                            id
							category
							name
							description
							notes
							unit
							priceCents
							taxPercentage
                        }
                    }
                `),
				variables: {
					search,
				},
			}).then((res) => res.products),
		{ search },
	);
	return (
		<CommandPallette
			onClose={onClose}
			data={data || []}
			onSearch={setSearch}
			renderItem={(item) => (
				<>
					<div className="flex-none p-3 text-center">
						<h2 className="font-semibold text-gray-900">{item.name}</h2>
						<p className="text-sm leading-6 text-gray-500">{item.category}</p>
					</div>
					<div className="flex flex-auto flex-col justify-between p-6">
						{item.description && (
							<p className="text-sm leading-6 text-gray-500">
								{item.description}
							</p>
						)}
						<dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm text-gray-700">
							<dt className="col-end-1 font-semibold text-gray-900">Price</dt>
							<dd className="truncate">
								{API.centsToPrice(item.priceCents)} €{' '}
								{item.unit && `/${item.unit}`}
							</dd>
							<dt className="col-end-1 font-semibold text-gray-900">Tax</dt>
							<dd className="truncate">{item.taxPercentage}%</dd>
							<dt className="col-end-1 font-semibold text-gray-900">Notes</dt>
							<dd className="truncate">{item.notes}</dd>
						</dl>
						<div className="mt-6 w-full flex-col flex">
							<Button
								primary
								onClick={() => {
									onSelect(item.id, {
										...item,
										__typename: undefined,
										productId: item.id,
										price: API.centsToPrice(item.priceCents),
										quantity: 1,
									});
									onClose();
								}}
							>
								Select Product
							</Button>
						</div>
					</div>
				</>
			)}
		/>
	);
}
