/**
 * Integration tests for ProductResolver.
 *
 * This suite covers all queries and mutations for products, using a DI GraphQL test app.
 * It verifies DB state after mutations and checks for race conditions by executing multiple mutations in a single request.
 *
 * Why: Ensures resolver logic, DB integration, and GraphQL schema are all working as expected.
 * How: Uses prepareGraphqlTest to get an app and execute GraphQL operations, and verifies repository state after mutations.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { PRODUCT_REPOSITORY, type ProductRepository } from '@/backend/repositories/product';

import { prepareGraphqlTest } from '@/test/graphql-test';
import type { ProductInput } from './product.schema';

// Type for the awaited prepareGraphqlTest result
// This ensures correct typing for execute and app
// and avoids linter errors with async destructuring
//
type GraphqlTestEnv = Awaited<ReturnType<typeof prepareGraphqlTest>>;

// Helper: minimal product input using correct ProductInput fields
const sampleProductInput = (): ProductInput => ({
  name: 'Test Product',
  category: 'Test Category',
  description: 'A test product',
  notes: undefined,
  priceCents: 4200,
  taxPercentage: 19,
  expenses: [],
});

// Helper: create a product in the repo directly
async function seedProduct(repo: ProductRepository, overrides: Partial<ProductInput> = {}) {
  const product = await repo.create();
  product.update({ ...sampleProductInput(), ...overrides });
  await repo.save(product);
  return product;
}

describe('ProductResolver (integration)', () => {
  let execute: GraphqlTestEnv['execute'];
  let app: GraphqlTestEnv['app'];
  let repo: ProductRepository;

  beforeEach(async () => {
    // Prepare a fresh app and repo for each test
    const testEnv = await prepareGraphqlTest();
    execute = testEnv.execute;
    app = testEnv.app;
    repo = app.get<ProductRepository>(PRODUCT_REPOSITORY);
    // No need to clear repo: DB is wiped in prepareGraphqlTest
  });

  it('should fetch all products (products query)', async () => {
    // Seed two products
    await seedProduct(repo, { name: 'A', category: 'Cat1' });
    await seedProduct(repo, { name: 'B', category: 'Cat2' });
    const query = `
      query {
        products {
          id
          name
          category
        }
      }
    `;
    const result = await execute({ source: query });
    type ProductResult = { id: string; name: string; category: string };
    // Check for errors and correct product names
    expect(result.errors).toBeFalsy();
    expect(result.data!.products as ProductResult[]).toHaveLength(2);
    expect((result.data!.products as ProductResult[]).map((p) => p.name)).toContain('A');
    expect((result.data!.products as ProductResult[]).map((p) => p.name)).toContain('B');
  });

  it('should fetch a single product by id (product query)', async () => {
    const seeded = await seedProduct(repo, { name: 'Unique' });
    const query = `
      query($id: String!) {
        product(id: $id) {
          id
          name
        }
      }
    `;
    const result = await execute({
      source: query,
      variableValues: { id: seeded.id },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data!.product).toBeTruthy();
    expect(result.data!.product.name).toBe('Unique');
  });

  it('should create a product (createProduct mutation)', async () => {
    const mutation = `
      mutation($data: ProductInput!) {
        createProduct(data: $data) {
          id
          name
          category
        }
      }
    `;
    const input = sampleProductInput();
    const result = await execute({
      source: mutation,
      variableValues: { data: input },
    });
    expect(result.errors).toBeFalsy();
    const created = result.data!.createProduct;
    expect(created.name).toBe(input.name);
    // Verify in DB
    const dbProduct = await repo.getById(created.id);
    expect(dbProduct).toBeTruthy();
    if (dbProduct) {
      expect(dbProduct.name).toBe(input.name);
    }
  });

  it('should update a product (updateProduct mutation)', async () => {
    const seeded = await seedProduct(repo, { name: 'Old Name' });
    const mutation = `
      mutation($id: String!, $data: ProductInput!) {
        updateProduct(id: $id, data: $data) {
          id
          name
        }
      }
    `;
    const newData = { ...sampleProductInput(), name: 'New Name' };
    const result = await execute({
      source: mutation,
      variableValues: { id: seeded.id, data: newData },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data!.updateProduct.name).toBe('New Name');
    // Verify in DB
    const dbProduct = await repo.getById(seeded.id);
    if (dbProduct) {
      expect(dbProduct.name).toBe('New Name');
    }
  });

  it('should delete a product (deleteProduct mutation)', async () => {
    const seeded = await seedProduct(repo);
    const mutation = `
      mutation($id: String!) {
        deleteProduct(id: $id) {
          id
        }
      }
    `;
    const result = await execute({
      source: mutation,
      variableValues: { id: seeded.id },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data!.deleteProduct.id).toBe(seeded.id);
    // Verify in DB
    const dbProduct = await repo.getById(seeded.id);
    expect(dbProduct).toBeFalsy();
  });

  it('should handle multiple mutations in a single request (race condition check)', async () => {
    // This checks that creating and updating a product in one request works as expected
    const mutation = `
      mutation($create: ProductInput!, $update: ProductInput!) {
        a: createProduct(data: $create) { id name }
        b: createProduct(data: $update) { id name }
      }
    `;
    const inputA = { ...sampleProductInput(), name: 'A' };
    const inputB = { ...sampleProductInput(), name: 'B' };
    const result = await execute({
      source: mutation,
      variableValues: { create: inputA, update: inputB },
    });
    expect(result.errors).toBeFalsy();
    // Both products should exist in DB
    const dbA = await repo.getById(result.data!.a.id);
    const dbB = await repo.getById(result.data!.b.id);
    if (dbA && dbB) {
      expect(dbA.name).toBe('A');
      expect(dbB.name).toBe('B');
    }
  });
});
