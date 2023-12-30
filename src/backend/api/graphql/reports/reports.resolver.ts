/* eslint-disable @typescript-eslint/no-unused-vars */

import { Query, Resolver, Arg, Authorized } from 'type-graphql';

import {
	IncomeSurplusReport,
	IncomeSurplusReportExport,
	IncomeSurplusReportWhereInput,
} from './reports.schema';

import { Service } from '@/common/di';

@Service()
@Resolver()
export class ReportsResolver {
	constructor() {}

	@Authorized()
	@Query(() => IncomeSurplusReport)
	async generateReport(
		@Arg('where', { nullable: true })
		where: IncomeSurplusReportWhereInput,
	): Promise<IncomeSurplusReport | undefined> {
		// TODO
		return {
			startDate: new Date(),
			endDate: new Date(),
			incomeCents: 250000,
			expensesCents: 53845,
			surplusCents: 196155,
			overdueCents: 45000,
			overdueInvoices: 1,
			openCents: 70000,
			openInvoices: 2,
			invoiceTaxCents: 0,
			expensesTaxCents: 0,
			items: [],
		};
	}

	@Authorized()
	@Query(() => IncomeSurplusReport)
	async generateReportExport(
		@Arg('where')
		where: IncomeSurplusReportWhereInput,
	): Promise<IncomeSurplusReportExport | undefined> {
		// TODO
		return undefined;
	}
}
