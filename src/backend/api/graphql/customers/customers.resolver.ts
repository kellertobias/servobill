/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arg, Authorized, Int, Mutation, Query, Resolver } from 'type-graphql';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import { CUSTOMER_REPOSITORY } from '@/backend/repositories/customer/di-tokens';
import type { CustomerRepository } from '@/backend/repositories/customer/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import { Customer, CustomerInput } from './customers.schema';

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => Customer)
export class CustomerResolver {
	constructor(
		@Inject(CUSTOMER_REPOSITORY) private repository: CustomerRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
	) {}

	@Authorized()
	@Query(() => [Customer])
	async customers(
		@Arg('where', () => String, { nullable: true }) where?: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
	): Promise<Customer[]> {
		return this.repository.listByQuery({
			where: { search: where },
			skip,
			limit,
		});
	}

	@Authorized()
	@Query(() => Customer, { nullable: true })
	async customer(
		@Arg('id', () => String) id: string,
	): Promise<Customer | null> {
		const data = await this.repository.getById(id);
		return data;
	}

	@Authorized()
	@Mutation(() => Customer)
	async createCustomer(
		@Arg('data', () => CustomerInput) data: CustomerInput,
	): Promise<Customer> {
		const customer = await this.repository.create();

		if (!data.customerNumber) {
			const settings = await this.settingsRepository.getSetting(
				InvoiceSettingsEntity,
			);
			if (!settings) {
				throw new Error('Settings not found');
			}
			const customerNumber = await settings.customerNumbers.getNextNumber();
			data.customerNumber = customerNumber;
		}

		customer.update(data);
		await this.repository.save(customer);
		return customer;
	}

	/**
	 * Updates a customer. Ensures customerNumber is always preserved unless explicitly updated.
	 * This is necessary because the GraphQL schema requires customerNumber to be non-null,
	 * and the update input may omit it. We must not accidentally clear it.
	 */
	@Authorized()
	@Mutation(() => Customer)
	async updateCustomer(
		@Arg('id', () => String) id: string,
		@Arg('data', () => CustomerInput) data: CustomerInput,
	): Promise<Customer> {
		const customer = await this.repository.getById(id);
		if (!customer) {
			throw new Error('Customer not found');
		}
		// Explicitly preserve customerNumber if not provided in input
		const updateData = { ...data };
		if (data.customerNumber === undefined) {
			updateData.customerNumber = customer.customerNumber;
		}
		customer.update(updateData);
		await this.repository.save(customer);

		return customer;
	}

	@Authorized()
	@Mutation(() => Customer)
	async deleteCustomer(@Arg('id', () => String) id: string): Promise<Customer> {
		const customer = await this.repository.getById(id);
		if (!customer) {
			throw new Error('Customer not found');
		}
		await this.repository.delete(id);
		return customer;
	}
}
