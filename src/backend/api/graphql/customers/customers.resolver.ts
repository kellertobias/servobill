/* eslint-disable @typescript-eslint/no-unused-vars */
// users.resolvers.ts

import { randomUUID } from 'crypto';

import { Query, Resolver, Mutation, Arg, Int, Authorized } from 'type-graphql';

import { Customer, CustomerInput } from './customers.schema';

import { CustomerRepository } from '@/backend/repositories/customer.repository';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { SettingsRepository } from '@/backend/repositories/settings.repository';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import { Inject, Service } from '@/common/di';

@Service()
@Resolver(() => Customer)
export class CustomerResolver {
	constructor(
		@Inject(CustomerRepository) private repository: CustomerRepository,
		@Inject(SettingsRepository) private settingsRepository: SettingsRepository,
	) {}

	@Authorized()
	@Query(() => [Customer])
	async customers(
		@Arg('where', { nullable: true }) where?: string,
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
	async customer(@Arg('id') id: string): Promise<Customer | null> {
		const data = await this.repository.getById(id);
		return data;
	}

	@Authorized()
	@Mutation(() => Customer)
	async createCustomer(@Arg('data') data: CustomerInput): Promise<Customer> {
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

	@Authorized()
	@Mutation(() => Customer)
	async updateCustomer(
		@Arg('id') id: string,
		@Arg('data') data: CustomerInput,
	): Promise<Customer> {
		const customer = await this.repository.getById(id);
		if (!customer) {
			throw new Error('Customer not found');
		}
		customer.update(data);
		await this.repository.save(customer);
		return customer;
	}

	@Authorized()
	@Mutation(() => Customer)
	async deleteCustomer(@Arg('id') id: string): Promise<Customer> {
		const customer = await this.repository.getById(id);
		if (!customer) {
			throw new Error('Customer not found');
		}
		await this.repository.delete(id);
		return customer;
	}
}
