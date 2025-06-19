import { Field, ObjectType, InputType } from 'type-graphql';
import { IsString } from 'class-validator';

import { FilteredObjectProperties } from '../types';

import { CustomerEntity } from '@/backend/entities/customer.entity';

@ObjectType('Customer')
export class Customer implements FilteredObjectProperties<CustomerEntity> {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	customerNumber!: string;

	@Field(() => String)
	name!: string;

	@Field(() => String, { nullable: true })
	contactName?: string;

	@Field(() => Boolean)
	showContact!: boolean;

	@Field(() => String, { nullable: true })
	email?: string;

	@Field(() => String, { nullable: true })
	street?: string;

	@Field(() => String, { nullable: true })
	zip?: string;

	@Field(() => String, { nullable: true })
	city?: string;

	@Field(() => String, { nullable: true })
	state?: string;

	@Field(() => String, { nullable: true })
	country?: string;

	@Field(() => String, { nullable: true })
	notes?: string;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

@InputType('CustomerInput')
export class CustomerInput
	implements
		Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'customerNumber'>
{
	@IsString()
	@Field(() => String)
	name!: string;

	@Field(() => String, { nullable: true })
	customerNumber?: string;

	@Field(() => String, { nullable: true })
	contactName?: string;

	@Field(() => Boolean)
	showContact!: boolean;

	@Field(() => String, { nullable: true })
	email?: string;

	@Field(() => String, { nullable: true })
	street?: string;

	@Field(() => String, { nullable: true })
	zip?: string;

	@Field(() => String, { nullable: true })
	city?: string;

	@Field(() => String, { nullable: true })
	state?: string;

	@Field(() => String, { nullable: true })
	country?: string;

	@Field(() => String, { nullable: true })
	notes?: string;
}
