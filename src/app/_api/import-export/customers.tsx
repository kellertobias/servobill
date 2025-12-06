/* eslint-disable @typescript-eslint/no-explicit-any */

import { DeferredPromise } from '@/common/deferred';
import type { Customer } from '@/common/gql/graphql';
import { doToast } from '@/components/toast';
import { API, gql } from '../index';
import { Exporters } from './exporters/exporters';
import { downloadFile, requestFile } from './helper';

export const importSingleCustomer = async (customer: Partial<Customer>) => {
  const customerData = { ...customer };
  delete customerData.id;
  delete customerData.createdAt;
  delete customerData.updatedAt;

  return await API.query({
    query: gql(`
			mutation ImportCustomer($data: CustomerInput!) {
				createCustomer(data: $data) {
					id
					name
					showContact
					contactName
					customerNumber
					email
					street
					zip
					city
					countryCode
					state
				}
			}
		`),
    variables: {
      data: customerData,
    },
  }).then((res) => res?.createCustomer);
};

export const importCustomers = async () => {
  const raw = await requestFile();
  const waitForImport = new DeferredPromise();
  doToast({
    promise: (async () => {
      const data = JSON.parse(raw || '{}') as {
        customers: Partial<Customer>[];
      };
      const customers = data?.customers || [];

      for (const customer of customers) {
        await importSingleCustomer(customer);
      }
      waitForImport.resolve();
    })(),
    loading: 'Importing Customers...',
    success: 'Customers Imported!',
    error: 'Failed to import your Customers.',
  });
  await waitForImport.promise;
};

export const exportCustomers = async () => {
  doToast({
    promise: (async () => {
      const customers = await Exporters.customers();

      const data = {
        customers,
      };

      const dataStr = JSON.stringify(data);
      downloadFile({
        content: dataStr,
        filename: 'customers.json',
      });
    })(),
    loading: 'Exporting Customers...',
    success: 'Customers Exported!',
    error: 'Failed to export your Customers.',
  });
};
