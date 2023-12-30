import { Field, ObjectType, InputType } from 'type-graphql';
import { IsString } from 'class-validator';

import { FilteredObjectProperties } from '../types';

import { CustomerEntity } from '@/backend/entities/customer.entity';

@ObjectType()
export class Customer implements FilteredObjectProperties<CustomerEntity> {
	@Field()
	id!: string;

	@Field()
	customerNumber!: string;

	@Field()
	name!: string;

	@Field({ nullable: true })
	contactName?: string;

	@Field()
	showContact!: boolean;

	@Field({ nullable: true })
	email?: string;

	@Field({ nullable: true })
	street?: string;

	@Field({ nullable: true })
	zip?: string;

	@Field({ nullable: true })
	city?: string;

	@Field({ nullable: true })
	state?: string;

	@Field({ nullable: true })
	country?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field()
	createdAt!: Date;

	@Field()
	updatedAt!: Date;
}

@InputType()
export class CustomerInput
	implements
		Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'customerNumber'>
{
	@IsString()
	@Field()
	name!: string;

	@Field({ nullable: true })
	customerNumber?: string;

	@Field({ nullable: true })
	contactName?: string;

	@Field()
	showContact!: boolean;

	@Field({ nullable: true })
	email?: string;

	@Field({ nullable: true })
	street?: string;

	@Field({ nullable: true })
	zip?: string;

	@Field({ nullable: true })
	city?: string;

	@Field({ nullable: true })
	state?: string;

	@Field({ nullable: true })
	country?: string;

	@Field({ nullable: true })
	notes?: string;
}
