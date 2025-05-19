import { DataSource, EntityManager, Repository, ObjectLiteral } from 'typeorm';
import { Inject, Service } from '@/common/di';
import { ConfigService, DatabaseType } from './config.service';
import { ProductOrmEntity } from '@/backend/repositories/product/relational-orm-entity';
import { shouldRegister } from './should-register';

/**
 * Service to manage relational database (Postgres/SQLite) connections and configuration using TypeORM.
 * Handles authentication, connection, and provides repositories and entity managers for entities.
 */
@Service({
	singleton: true,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
})
export class RelationalDbService {
	private dataSource: DataSource;

	constructor(@Inject(ConfigService) private readonly config: ConfigService) {
		this.dataSource = this.createDataSource();
	}

	/**
	 * Creates and initializes the TypeORM DataSource based on config.
	 */
	private createDataSource(): DataSource {
		const dbType = this.config.tables.databaseType;
		if (dbType === DatabaseType.POSTGRES) {
			return new DataSource({
				type: 'postgres',
				url: this.config.tables.postgres,
				entities: [ProductOrmEntity],
				synchronize: true, // For dev only; use migrations in prod
			});
		} else if (dbType === DatabaseType.SQLITE) {
			if (!this.config.tables.sqlite) {
				throw new Error('SQLITE database path is not defined in config');
			}
			return new DataSource({
				type: 'sqlite',
				database: this.config.tables.sqlite as string,
				entities: [ProductOrmEntity],
				synchronize: true,
			});
		} else {
			throw new Error('Unsupported database type for relational DB');
		}
	}

	/**
	 * Initializes the connection if not already initialized.
	 */
	public async initialize(): Promise<void> {
		if (!this.dataSource.isInitialized) {
			await this.dataSource.initialize();
		}
	}

	/**
	 * Gets the TypeORM repository for the given entity.
	 */
	public getRepository<T extends ObjectLiteral>(entity: {
		new (): T;
	}): Repository<T> {
		return this.dataSource.getRepository(entity);
	}

	/**
	 * Gets the TypeORM entity manager.
	 */
	public getEntityManager(): EntityManager {
		return this.dataSource.manager;
	}
}
