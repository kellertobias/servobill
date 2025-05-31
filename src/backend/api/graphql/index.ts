import 'reflect-metadata';
import { buildSchema } from 'type-graphql';

import { CustomerResolver } from './customers/customers.resolver';
import { ExpenseResolver } from './expenses/expenses.resolver';
import { InvoiceResolver } from './invoices/invoice.resolver';
import { InvoiceLifecycleResolver } from './invoices/invoice-liefecycle.resolver';
import { ProductResolver } from './products/product.resolver';
import { ReportsResolver } from './reports/reports.resolver';
import { AuthResolver } from './auth/auth.resolver';
import './enums';
import { authChecker } from './authorizer';
import { SystemResolver } from './system/system.resolver';
import { AttachmentResolver } from './attachments/attachment.resolver';

import { DefaultContainer } from '@/common/di';

// import { CqrsBus } from '@/backend/services/cqrs.service';

// CqrsBus.forRoot({
// 	handlers: [],
// 	container: Container,
// });

export const globalSchema = buildSchema({
	resolvers: [
		CustomerResolver,
		ExpenseResolver,
		InvoiceResolver,
		InvoiceLifecycleResolver,
		ProductResolver,
		ReportsResolver,
		AuthResolver,
		SystemResolver,
		AttachmentResolver,
	],
	emitSchemaFile:
		process.env.NODE_ENV === 'development' ? 'src/schema.gql' : false,
	container: DefaultContainer,
	authChecker,
});
