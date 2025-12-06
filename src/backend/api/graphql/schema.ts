import 'reflect-metadata';
import { buildSchema, type NonEmptyArray } from 'type-graphql';

import './enums';

import { DefaultContainer } from '@/common/di';
import { authChecker } from './authorizer';
import * as resolvers from './index';

// import { CqrsBus } from '@/backend/services/cqrs.service';

// CqrsBus.forRoot({
// 	handlers: [],
// 	container: Container,
// });

if (process.env.VITEST) {
	console.error('THIS FILE SHOULD NOT BE IMPORTED IN TESTS');
	throw new Error('THIS FILE SHOULD NOT BE IMPORTED IN TESTS');
}

export const globalSchema = buildSchema({
	// eslint-disable-next-line @typescript-eslint/ban-types
	resolvers: Object.values(resolvers) as unknown as NonEmptyArray<Function>,
	emitSchemaFile:
		process.env.NODE_ENV === 'development' ? 'src/schema.gql' : false,
	container: DefaultContainer,
	authChecker,
});
