import { DataSource, type EntityManager, type ObjectLiteral, type Repository } from 'typeorm';
import { Inject, Service } from '@/common/di';
import { OrmEntityRegistry } from '@/common/orm-entity-registry';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../repositories/di-tokens';
import type { ConfigService } from './config.service';
import { DatabaseType } from './constants';
import { CONFIG_SERVICE, RELATIONALDB_SERVICE } from './di-tokens';
import { shouldRegister } from './should-register';
import { adaptColumnTypesForSqlite } from './sqlite-column-types';

/**
 * Service to manage relational database (Postgres/SQLite) connections and configuration using TypeORM.
 * Handles authentication, connection, and provides repositories and entity managers for entities.
 *
 * Uses the OrmEntityRegistry array to dynamically register all ORM entities decorated with @OrmEntity.
 */
@Service({
  name: RELATIONALDB_SERVICE,
  singleton: true,
  ...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
  addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class RelationalDbService {
  public dataSource: DataSource;

  constructor(@Inject(CONFIG_SERVICE) private readonly config: ConfigService) {
    this.dataSource = this.createDataSource();
  }

  /**
   * Creates and initializes the TypeORM DataSource based on config.
   * Uses all entities registered with @OrmEntity.
   */
  private createDataSource(): DataSource {
    const dbType = this.config.tables.databaseType;
    if (dbType === DatabaseType.POSTGRES) {
      return new DataSource({
        type: 'postgres',
        url: this.config.tables.postgres,
        entities: OrmEntityRegistry,
        synchronize: true, // For dev only; use migrations in prod
      });
    } else if (dbType === DatabaseType.SQLITE) {
      if (!this.config.tables.sqlite) {
        throw new Error('SQLITE database path is not defined in config');
      }
      // Entities use Postgres column types (timestamp, ...); map them once.
      adaptColumnTypesForSqlite(OrmEntityRegistry);
      return new DataSource({
        type: 'sqlite',
        database: this.config.tables.sqlite as string,
        entities: OrmEntityRegistry,
        synchronize: true,
        // Readers do not block the writer, and concurrent writes wait for
        // each other instead of failing with SQLITE_BUSY.
        enableWAL: true,
        busyTimeout: 10000,
      });
    } else {
      throw new Error('Unsupported database type for relational DB');
    }
  }

  private initializing?: Promise<void>;

  /**
   * Initializes the connection once. All repositories call this concurrently,
   * so the first call starts the initialization and the others wait for it.
   *
   * Schema synchronization can fail when another process (app and workers
   * start at the same time) creates the same tables in parallel, so failed
   * attempts are retried on a fresh DataSource.
   */
  public initialize(): Promise<void> {
    if (this.dataSource.isInitialized) {
      return Promise.resolve();
    }
    this.initializing ??= this.initializeWithRetry().finally(() => {
      this.initializing = undefined;
    });
    return this.initializing;
  }

  private async initializeWithRetry(attempts = 5): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.dataSource.initialize();
        return;
      } catch (error) {
        if (this.dataSource.isInitialized) {
          await this.dataSource.destroy().catch(() => undefined);
        }
        if (attempt >= attempts) {
          throw error;
        }
        // eslint-disable-next-line no-console
        console.warn(
          `Database initialization failed (attempt ${attempt}/${attempts}), retrying`,
          error instanceof Error ? error.message : error
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        this.dataSource = this.createDataSource();
      }
    }
  }

  /**
   * Gets the TypeORM repository for the given entity.
   */
  public getRepository<T extends ObjectLiteral>(entity: { new (): T }): Repository<T> {
    return this.dataSource.getRepository(entity);
  }

  /**
   * Gets the TypeORM entity manager.
   */
  public getEntityManager(): EntityManager {
    return this.dataSource.manager;
  }
}
