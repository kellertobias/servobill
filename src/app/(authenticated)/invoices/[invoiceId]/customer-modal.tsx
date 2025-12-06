import { UserCircleIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import CommandPallette from '@/components/command-pallette';
import { useLoadData } from '@/hooks/load-data';

import type { InvoiceData } from './data';

export function SelectCustomerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (customerId: string, customer: InvoiceData['customer']) => void;
}) {
  const [search, setSearch] = useState('');
  const { data } = useLoadData(
    async ({ search }) =>
      API.query({
        query: gql(`
                    query SearchCustomers($search: String!) {
                        customers(where: $search, limit: 10) {
                            id
                            name
                            contactName
                            showContact
                            street
                            zip
                            city
                            countryCode
                            state
                            email
                        }
                    }
                `),
        variables: {
          search,
        },
      }).then((res) => res.customers),
    { search }
  );
  return (
    <CommandPallette
      onClose={onClose}
      data={data || []}
      onSearch={setSearch}
      getCategory={(item) => item.name.slice(0, 1).toUpperCase()}
      renderItem={(item) => (
        <>
          <div className="flex-none p-6 text-center">
            <UserCircleIcon className="mx-auto h-16 w-16 rounded-full text-gray-300" />
            <h2 className="mt-3 font-semibold text-gray-900">{item.name}</h2>
            <p className="text-sm leading-6 text-gray-500">
              {item.contactName}{' '}
              {item.showContact ? <span className="opacity-30">(Visible on Invoice)</span> : ''}
            </p>
          </div>
          <div className="flex flex-auto flex-col justify-between p-6">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm text-gray-700">
              <dt className="col-end-1 font-semibold text-gray-900">Address</dt>
              <dd className="truncate">
                {item.street}
                <br />
                {item.countryCode}-{item.zip} {item.city}, {item.state}
              </dd>
              <dt className="col-end-1 font-semibold text-gray-900">Email</dt>
              <dd className="truncate">{item.email}</dd>
            </dl>
            <div className="mt-6 w-full flex-col flex">
              <Button
                primary
                onClick={() => {
                  onSelect(item.id, item);
                  onClose();
                }}
              >
                Select Customer
              </Button>
            </div>
          </div>
        </>
      )}
    />
  );
}
