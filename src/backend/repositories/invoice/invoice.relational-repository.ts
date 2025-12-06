import { CustomerEntity } from '@/backend/entities/customer.entity';
import { InvoiceEntity, InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import {
  InvoiceActivityEntity,
  InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { InvoiceSubmissionEntity } from '@/backend/entities/invoice-submission.entity';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import { EVENTBUS_SERVICE, RELATIONALDB_SERVICE } from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { Inject, Service } from '@/common/di';
import { CustomJson } from '@/common/json';
import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';
import { INVOICE_REPO_NAME, INVOICE_REPOSITORY } from './di-tokens';
import type { InvoiceRepository } from './index';
import { InvoiceOrmEntity } from './relational-orm-entity';

/**
 * Unified repository for Invoice using TypeORM (Postgres or SQLite).
 * Handles mapping between InvoiceOrmEntity and InvoiceEntity.
 */
@Service({
  name: INVOICE_REPOSITORY,
  ...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
  addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class InvoiceRelationalRepository
  extends AbstractRelationalRepository<
    InvoiceOrmEntity,
    InvoiceEntity,
    [InvoiceType, CustomerEntity, string]
  >
  implements InvoiceRepository
{
  /** Logger instance for this repository. */
  protected logger = new Logger(INVOICE_REPO_NAME);

  constructor(
    @Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
    @Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService
  ) {
    super({ db, ormEntityClass: InvoiceOrmEntity });
    this.eventBus = eventBus;
  }

  /**
   * Converts a TypeORM InvoiceOrmEntity to a domain InvoiceEntity.
   */
  public ormToDomainEntitySafe(orm: InvoiceOrmEntity): InvoiceEntity {
    return new InvoiceEntity({
      id: orm.id,
      subject: orm.subject,
      offerNumber: orm.offerNumber,
      invoiceNumber: orm.invoiceNumber,
      type: InvoiceType[orm.type as keyof typeof InvoiceType],
      status: orm.status ? InvoiceStatus[orm.status as keyof typeof InvoiceStatus] : undefined,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      offeredAt: orm.offeredAt,
      invoicedAt: orm.invoicedAt,
      dueAt: orm.dueAt,
      paidCents: orm.paidCents,
      paidAt: orm.paidAt,
      paidVia: orm.paidVia,
      footerText: orm.footerText,
      totalCents: orm.totalCents,
      totalTax: orm.totalTax,
      items: orm.items
        ? CustomJson.fromJson<InvoiceItemEntity[]>(orm.items).map(
            (item) => new InvoiceItemEntity(item)
          )
        : [],
      activity: orm.activity
        ? CustomJson.fromJson<InvoiceActivityEntity[]>(orm.activity).map(
            (activity) => new InvoiceActivityEntity(activity)
          )
        : [],
      submissions: orm.submissions
        ? CustomJson.fromJson<InvoiceSubmissionEntity[]>(orm.submissions).map(
            (submission) => new InvoiceSubmissionEntity(submission)
          )
        : [],
      customer: new CustomerEntity({
        ...CustomJson.fromJson<CustomerEntity>(orm.customer),
        id: orm.customerId,
      }),
      links: orm.links ? CustomJson.fromJson(orm.links) : undefined,
      contentHash: orm.contentHash,
      pdf: orm.pdf ? CustomJson.fromJson(orm.pdf) : undefined,
      processedEventIds: orm.processedEventIds
        ? CustomJson.fromJson(orm.processedEventIds)
        : undefined,
      scheduledSendJobId: orm.scheduledSendJobId || undefined,
    });
  }

  /**
   * Converts a domain InvoiceEntity to a TypeORM InvoiceOrmEntity.
   */
  public domainToOrmEntity(domain: InvoiceEntity): InvoiceOrmEntity {
    const { id: customerId, ...customer } = domain.customer;
    return {
      id: domain.id,
      subject: domain.subject,
      offerNumber: domain.offerNumber,
      invoiceNumber: domain.invoiceNumber,
      type: domain.type,
      status: domain.status,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      offeredAt: domain.offeredAt,
      invoicedAt: domain.invoicedAt,
      dueAt: domain.dueAt,
      paidCents: domain.paidCents,
      paidAt: domain.paidAt,
      paidVia: domain.paidVia,
      footerText: domain.footerText,
      totalCents: Math.round(domain.totalCents),
      totalTax: Math.round(domain.totalTax),
      customerId,
      customer: CustomJson.toJson(customer),
      submissions: CustomJson.toJson(domain.submissions) || '[]',
      items: CustomJson.toJson(domain.items) || '[]',
      activity: CustomJson.toJson(domain.activity) || '[]',
      links: CustomJson.toJson(domain.links) || '{}',
      contentHash: domain.contentHash,
      pdf: CustomJson.toJson(domain.pdf) || '',
      processedEventIds: CustomJson.toJson(domain.processedEventIds) || '[]',
      // Ensure undefined is saved if scheduledSendJobId is falsy, to clear the DB column
      scheduledSendJobId: domain.scheduledSendJobId || '',
    };
  }

  /**
   * Generates an empty InvoiceEntity with the given id, type, customer, and user.
   * This method is public to match the interface.
   */
  public generateEmptyItem(
    id: string,
    type: InvoiceType,
    customer: CustomerEntity,
    user: string
  ): InvoiceEntity {
    return new InvoiceEntity({
      id,
      type,
      customer,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: InvoiceStatus.DRAFT,
      items: [],
      activity: [
        new InvoiceActivityEntity({
          type:
            type === InvoiceType.INVOICE
              ? InvoiceActivityType.CREATED_INVOICE
              : InvoiceActivityType.CREATED_OFFER,
          user,
        }),
      ],
      submissions: [],
      totalCents: 0,
      totalTax: 0,
    });
  }

  /**
   * Lists invoices by query (type, status, year, skip, limit).
   * @param query Query object with optional type, status, year, skip, limit, cursor
   * @returns Array of InvoiceEntity
   */
  public async listByQuery(query: {
    where?: { type?: InvoiceType; status?: InvoiceStatus; year?: number };
    skip?: number;
    limit?: number;
    cursor?: string;
  }): Promise<InvoiceEntity[]> {
    await this.initialized.promise;
    const qb = this.repository!.createQueryBuilder('invoice');
    if (query.where?.type) {
      qb.andWhere('invoice.type = :type', { type: query.where.type });
    }
    if (query.where?.status) {
      qb.andWhere('invoice.status = :status', { status: query.where.status });
    }
    if (query.where?.year) {
      const yearStart = new Date(`${query.where.year}-01-01`);
      qb.andWhere('invoice.createdAt >= :yearStart', { yearStart });
    }
    if (query.skip) {
      qb.skip(query.skip);
    }
    if (query.limit) {
      qb.take(query.limit);
    }
    const results = await qb.getMany();
    return results.map((orm) => this.ormToDomainEntitySafe(orm));
  }
}
