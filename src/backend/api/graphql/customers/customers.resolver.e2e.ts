import { beforeEach, describe, expect, it } from 'vitest';
import { InvoiceSettingsEntity, SettingsEntity } from '@/backend/entities/settings.entity';
import { CUSTOMER_REPOSITORY } from '@/backend/repositories/customer/di-tokens';
import type { CustomerRepository } from '@/backend/repositories/customer/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import { type ExecuteTestFunction, prepareGraphqlTest } from '@/test/graphql-test';

/**
 * Helper to create a minimal InvoiceSettingsEntity for predictable customer number generation.
 * Ensures deterministic tests for customer number assignment logic.
 */
function sampleInvoiceSettings(overrides: Partial<InvoiceSettingsEntity> = {}) {
  return new InvoiceSettingsEntity(
    {
      invoiceNumbers: { template: '', incrementTemplate: '', lastNumber: '0' },
      offerNumbers: { template: '', incrementTemplate: '', lastNumber: '0' },
      customerNumbers: {
        template: 'CUST-###',
        incrementTemplate: 'CUST-###',
        lastNumber: 'CUST-000',
      },
      defaultInvoiceDueDays: 14,
      offerValidityDays: 7,
      defaultInvoiceFooterText: '',
      ...overrides,
    },
    async () => {}
  );
}

/**
 * Helper to create a valid CustomerInput for GraphQL mutations.
 */
function sampleCustomerInput(overrides = {}) {
  return {
    name: 'Test Customer',
    showContact: false,
    ...overrides,
  };
}

describe('CustomerResolver (integration)', () => {
  /** GraphQL execute function and DI app for each test. */
  let execute: ExecuteTestFunction;
  let app: Awaited<ReturnType<typeof prepareGraphqlTest>>['app'];
  let customerRepo: CustomerRepository;
  let settingsRepo: SettingsRepository;

  beforeEach(async () => {
    // Prepare a fresh app and repo for each test
    const testEnv = await prepareGraphqlTest();
    execute = testEnv.execute;
    app = testEnv.app;
    customerRepo = app.get(CUSTOMER_REPOSITORY);
    settingsRepo = app.get(SETTINGS_REPOSITORY);
    // Seed settings for customer number generation
    await settingsRepo.save(
      new SettingsEntity({
        settingId: 'invoice-numbers',
        data: JSON.stringify(sampleInvoiceSettings().serializable()),
      })
    );
  });

  it('should list all customers (customers query)', async () => {
    // Seed two customers
    const c1 = await customerRepo.create();
    c1.update({ name: 'Alpha', showContact: false });
    await customerRepo.save(c1);
    const c2 = await customerRepo.create();
    c2.update({ name: 'Beta', showContact: false });
    await customerRepo.save(c2);
    // Query all customers
    const query = `
      query {
        customers { id name customerNumber }
      }
    `;
    const result = await execute({ source: query });
    expect(result.errors).toBeFalsy();
    expect(result.data!.customers.length).toBeGreaterThanOrEqual(2);
    const names = result.data!.customers.map(
      (c: { id: string; name: string; customerNumber: string }) => c.name
    );
    expect(names).toContain('Alpha');
    expect(names).toContain('Beta');
  });

  it('should fetch a single customer by id (customer query)', async () => {
    const c = await customerRepo.create();
    c.update({ name: 'Gamma', showContact: false });
    await customerRepo.save(c);
    const query = `
      query($id: String!) {
        customer(id: $id) { id name customerNumber }
      }
    `;
    const result = await execute({
      source: query,
      variableValues: { id: c.id },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data!.customer).toBeTruthy();
    expect(result.data!.customer.name).toBe('Gamma');
  });

  it('should create a customer and assign a customer number (createCustomer mutation)', async () => {
    const mutation = `
      mutation($data: CustomerInput!) {
        createCustomer(data: $data) { id name customerNumber }
      }
    `;
    const input = sampleCustomerInput();
    const result = await execute({
      source: mutation,
      variableValues: { data: input },
    });
    expect(result.errors).toBeFalsy();
    const created = result.data!.createCustomer;
    expect(created.name).toBe(input.name);
    expect(created.customerNumber).toMatch(/^CUST-\d{3}$/);
    // Verify in DB
    const dbCustomer = await customerRepo.getById(created.id);
    expect(dbCustomer).toBeTruthy();
    expect(dbCustomer?.name).toBe(input.name);
    expect(dbCustomer?.customerNumber).toBe(created.customerNumber);
  });

  it('should create a customer with a provided customerNumber (createCustomer mutation)', async () => {
    const mutation = `
      mutation($data: CustomerInput!) {
        createCustomer(data: $data) { id name customerNumber }
      }
    `;
    const input = sampleCustomerInput({ customerNumber: 'CUSTOM-999' });
    const result = await execute({
      source: mutation,
      variableValues: { data: input },
    });
    expect(result.errors).toBeFalsy();
    const created = result.data!.createCustomer;
    expect(created.customerNumber).toBe('CUSTOM-999');
    // Verify in DB
    const dbCustomer = await customerRepo.getById(created.id);
    expect(dbCustomer?.customerNumber).toBe('CUSTOM-999');
  });

  it('should update a customer (updateCustomer mutation)', async () => {
    /**
     * The updateCustomer mutation requires the customer to have a non-null customerNumber.
     * We explicitly assign a customerNumber to the test customer after creation to ensure the resolver
     * always returns a valid value, preventing GraphQL non-null errors.
     */
    const c = await customerRepo.create();
    c.customerNumber = 'CUST-123';
    c.update({ name: 'Delta', showContact: false });
    await customerRepo.save(c);
    // Debug: Assert customerNumber is present before update
    const preUpdate = await customerRepo.getById(c.id);
    expect(preUpdate?.customerNumber).toBe('CUST-123');
    const mutation = `
      mutation($id: String!, $data: CustomerInput!) {
        updateCustomer(id: $id, data: $data) { id name customerNumber }
      }
    `;
    const newName = 'Delta Updated';
    const result = await execute({
      source: mutation,
      variableValues: { id: c.id, data: { name: newName, showContact: false } },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data!.updateCustomer.name).toBe(newName);
    // Verify in DB
    const dbCustomer = await customerRepo.getById(c.id);
    expect(dbCustomer?.name).toBe(newName);
  });

  it('should delete a customer (deleteCustomer mutation)', async () => {
    const c = await customerRepo.create();
    c.update({ name: 'Epsilon', showContact: false });
    await customerRepo.save(c);
    const mutation = `
      mutation($id: String!) {
        deleteCustomer(id: $id) { id name }
      }
    `;
    const result = await execute({
      source: mutation,
      variableValues: { id: c.id },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data!.deleteCustomer.id).toBe(c.id);
    // Verify in DB
    const dbCustomer = await customerRepo.getById(c.id);
    expect(dbCustomer).toBeNull();
  });

  it('should assign unique customer numbers when creating two customers in a single request (race condition)', async () => {
    // This test ensures that customer number generation is safe under concurrent mutations.
    const mutation = `
      mutation($a: CustomerInput!, $b: CustomerInput!) {
        a: createCustomer(data: $a) { id customerNumber }
        b: createCustomer(data: $b) { id customerNumber }
      }
    `;
    const inputA = sampleCustomerInput({ name: 'RaceA' });
    const inputB = sampleCustomerInput({ name: 'RaceB' });
    const result = await execute({
      source: mutation,
      variableValues: { a: inputA, b: inputB },
    });
    expect(result.errors).toBeFalsy();
    const numA = result.data!.a.customerNumber;
    const numB = result.data!.b.customerNumber;
    expect(numA).not.toBe(numB);
    // Both should be persisted
    const dbA = await customerRepo.getById(result.data!.a.id);
    const dbB = await customerRepo.getById(result.data!.b.id);
    expect(dbA?.customerNumber).toBe(numA);
    expect(dbB?.customerNumber).toBe(numB);
  });
});
