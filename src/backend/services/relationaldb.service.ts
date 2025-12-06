import { DataSource, type EntityManager, type ObjectLiteral, type Repository } from 'typeorm';
import { Inject, Service } from '@/common/di';
import { OrmEntityRegistry } from '@/common/orm-entity-registry';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../repositories/di-tokens';
import type { ConfigService } from './config.service';
import { DatabaseType } from './constants';
import { CONFIG_SERVICE, RELATIONALDB_SERVICE } from './di-tokens';
import { shouldRegister } from './should-register';

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
      return new DataSource({
        type: 'sqlite',
        database: this.config.tables.sqlite as string,
        entities: OrmEntityRegistry,
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
