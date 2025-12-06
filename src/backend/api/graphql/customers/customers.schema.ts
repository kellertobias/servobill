import { IsString } from 'class-validator';
import { Field, InputType, ObjectType } from 'type-graphql';
import type { CustomerEntity } from '@/backend/entities/customer.entity';
import type { CompanyDataSetting } from '@/backend/entities/settings.entity';
import type { FilteredObjectProperties } from '../types';

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

  /**
   * The ISO 3166-1 alpha-2 country code (e.g. 'DE', 'US') representing the customer's country.
   * Used for address formatting, tax calculations, and compliance.
   * Should match the type used in CompanyDataSetting.companyData.countryCode.
   */
  @Field(() => String, { nullable: true })
  countryCode?: CompanyDataSetting['companyData']['countryCode'];

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@InputType('CustomerInput')
export class CustomerInput
  implements Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'customerNumber'>
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

  /**
   * The ISO 3166-1 alpha-2 country code (e.g. 'DE', 'US') representing the customer's country.
   * Used for address formatting, tax calculations, and compliance.
   * Should match the type used in CompanyDataSetting.companyData.countryCode.
   */
  @Field(() => String, { nullable: true })
  countryCode?: CompanyDataSetting['companyData']['countryCode'];

  @Field(() => String, { nullable: true })
  notes?: string;
}
