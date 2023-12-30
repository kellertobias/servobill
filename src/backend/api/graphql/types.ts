import { LambdaContextSession } from '../session';

export class GqlHttpContext {
	domainName!: string;
	headers!: Record<string, string | number | undefined>;
	cookies!: Record<string, string>;
	path!: string;
	sourceIp!: string;
	userAgent!: string;
}

export class GqlContext {
	http!: GqlHttpContext;
	accountId!: string;
	requestId!: string;
	session?: LambdaContextSession;
	functionName!: string;
	functionVersion!: string;
	getRemainingTimeInMillis!: () => number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type FilteredObjectProperties<T> = Omit<
	{
		[K in keyof T as T[K] extends (...args: any[]) => any
			? never
			: K]: T[K] extends object
			? T[K] extends any[]
				? FilteredObjectProperties<T[K][number]>[]
				: FilteredObjectProperties<T[K]>
			: T[K];
	},
	'events'
>;
