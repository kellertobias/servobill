/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DomainEntity } from '@/backend/entities/abstract.entity';
import type { AttachmentEntity } from '@/backend/entities/attachment.entity';
import {
	AttachmentDynamoDBRepository,
	AttachmentRelationalRepository,
} from '@/backend/repositories/attachment';
import {
	CustomerDynamodbRepository,
	CustomerRelationalRepository,
} from '@/backend/repositories/customer';
import {
	EmailDynamodbRepository,
	EmailRelationalRepository,
} from '@/backend/repositories/email';
import {
	ExpenseDynamodbRepository,
	ExpenseRelationalRepository,
} from '@/backend/repositories/expense';
import {
	InventoryItemDynamoDBRepository,
	InventoryItemRelationalRepository,
} from '@/backend/repositories/inventory-item';
import {
	InventoryLocationDynamoDBRepository,
	InventoryLocationRelationalRepository,
} from '@/backend/repositories/inventory-location';
import {
	InventoryTypeDynamoDBRepository,
	InventoryTypeRelationalRepository,
} from '@/backend/repositories/inventory-type';
import {
	InvoiceDynamodbRepository,
	InvoiceRelationalRepository,
} from '@/backend/repositories/invoice';
import {
	ProductDynamodbRepository,
	ProductRelationalRepository,
} from '@/backend/repositories/product';
import {
	SettingsDynamodbRepository,
	SettingsRelationalRepository,
} from '@/backend/repositories/settings';
import {
	TimeBasedJobDynamodbRepository,
	TimeBasedJobRelationalRepository,
} from '@/backend/repositories/time-based-job';
import {
	UserDynamodbRepository,
	UserRelationalRepository,
} from '@/backend/repositories/user';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import type { App } from '@/common/di';

type Container = ReturnType<typeof App.forRoot>;
type RepoClass = new (...args: any[]) => unknown;

/**
 * Everything that is copied, in this order. Sessions and the audit log are
 * not copied: sessions are short lived (everyone signs in again) and the
 * audit log starts with the new installation.
 */
export const MIGRATED_ENTITIES: {
	name: string;
	dynamodb: RepoClass;
	relational: RepoClass;
}[] = [
	{
		name: 'settings',
		dynamodb: SettingsDynamodbRepository,
		relational: SettingsRelationalRepository,
	},
	{
		name: 'user',
		dynamodb: UserDynamodbRepository,
		relational: UserRelationalRepository,
	},
	{
		name: 'customer',
		dynamodb: CustomerDynamodbRepository,
		relational: CustomerRelationalRepository,
	},
	{
		name: 'product',
		dynamodb: ProductDynamodbRepository,
		relational: ProductRelationalRepository,
	},
	{
		name: 'invoice',
		dynamodb: InvoiceDynamodbRepository,
		relational: InvoiceRelationalRepository,
	},
	{
		name: 'expense',
		dynamodb: ExpenseDynamodbRepository,
		relational: ExpenseRelationalRepository,
	},
	{
		name: 'attachment',
		dynamodb: AttachmentDynamoDBRepository,
		relational: AttachmentRelationalRepository,
	},
	{
		name: 'inventory-type',
		dynamodb: InventoryTypeDynamoDBRepository,
		relational: InventoryTypeRelationalRepository,
	},
	{
		name: 'inventory-location',
		dynamodb: InventoryLocationDynamoDBRepository,
		relational: InventoryLocationRelationalRepository,
	},
	{
		name: 'inventory-item',
		dynamodb: InventoryItemDynamoDBRepository,
		relational: InventoryItemRelationalRepository,
	},
	{
		name: 'email',
		dynamodb: EmailDynamodbRepository,
		relational: EmailRelationalRepository,
	},
	{
		name: 'time-based-job',
		dynamodb: TimeBasedJobDynamodbRepository,
		relational: TimeBasedJobRelationalRepository,
	},
];

export type MigrationResult = {
	entity: string;
	read: number;
	written: number;
	inTarget: number;
}[];

/** Reads every item of one electrodb entity (all pages). */
const scanAll = async (store: any): Promise<any[]> => {
	const result = await store.scan.go({ pages: 'all' });
	return result.data ?? [];
};

/**
 * Attachments keep their expense links in a separate DynamoDB entity, while
 * the relational schema stores them as a list on the attachment.
 */
const loadExpenseLinks = async (
	source: AttachmentDynamoDBRepository,
): Promise<Map<string, Set<string>>> => {
	const links = new Map<string, Set<string>>();
	for (const link of await scanAll((source as any).linkStore)) {
		const ids = links.get(link.attachmentId) ?? new Set<string>();
		ids.add(link.expenseId);
		links.set(link.attachmentId, ids);
	}
	return links;
};

const toDomain = (repo: any, item: any): DomainEntity => {
	const { storeId: _storeId, ...data } = item;
	// Older attachments store a single expense id instead of a JSON list
	if (
		data.linkType === 'expense' &&
		typeof data.linkedId === 'string' &&
		!data.linkedId.trim().startsWith('[')
	) {
		data.linkedId = JSON.stringify([data.linkedId]);
	}
	// The direct converter: ormToDomainEntity() treats any record with a
	// `data` field as a wrapper, which breaks settings records.
	return repo.ormToDomainEntitySafe(data);
};

/**
 * Copies all data from the DynamoDB repositories of `source` into the
 * relational repositories of `target`.
 *
 * The source is only read. Writing uses the normal repository `save`
 * (insert or update by id), so running it again updates the copy. Both
 * containers must use an event bus that does not deliver events, otherwise
 * saving invoices could trigger PDFs or emails.
 *
 * With `reset`, all tables of the target are emptied first, so the target
 * becomes an exact copy (for the final switch-over after test runs).
 */
export async function migrateDynamodbToRelational({
	source,
	target,
	reset = false,
	dryRun = false,
	log = () => {},
}: {
	source: Container;
	target: Container;
	reset?: boolean;
	dryRun?: boolean;
	log?: (message: string) => void;
}): Promise<MigrationResult> {
	const result: MigrationResult = [];
	const targetDb = target.get<RelationalDbService>(
		(await import('@/backend/services/di-tokens')).RELATIONALDB_SERVICE,
	);
	await targetDb.initialize();

	if (reset && !dryRun) {
		log('Emptying all tables of the target database');
		for (const meta of targetDb.dataSource.entityMetadatas) {
			await targetDb.dataSource.getRepository(meta.target).clear();
		}
	}

	for (const entity of MIGRATED_ENTITIES) {
		const sourceRepo = source.create<any>(entity.dynamodb);
		const targetRepo = target.create<any>(entity.relational);

		const items = await scanAll(sourceRepo.store);
		const expenseLinks =
			entity.dynamodb === AttachmentDynamoDBRepository
				? await loadExpenseLinks(sourceRepo)
				: undefined;

		let written = 0;
		for (const item of items) {
			const domain = toDomain(sourceRepo, item);
			if (expenseLinks) {
				const attachment = domain as AttachmentEntity;
				const ids = new Set([
					...(attachment.expenseIds ?? []),
					...(expenseLinks.get(attachment.id) ?? []),
				]);
				attachment.setExpenseIds(ids.size > 0 ? [...ids] : null);
			}
			// Saving must not publish anything that was recorded while reading
			(domain as any).events = [];
			if (!dryRun) {
				await targetRepo.save(domain);
			}
			written += 1;
		}

		await targetRepo.initialized?.promise;
		const inTarget = dryRun ? 0 : await targetRepo.repository.count();
		result.push({ entity: entity.name, read: items.length, written, inTarget });
		log(
			`${entity.name.padEnd(20)} read ${String(items.length).padStart(5)}  ` +
				`written ${String(written).padStart(5)}  in target ${inTarget}`,
		);
	}

	return result;
}
