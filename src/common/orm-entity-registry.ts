/* eslint-disable @typescript-eslint/ban-types */
/**
 * OrmEntity decorator and registry for TypeORM entities.
 *
 * Usage: Decorate your TypeORM entity class with @OrmEntity to automatically register it.
 *
 * Example:
 *   @OrmEntity
 *   @Entity('my_table')
 *   export class MyOrmEntity { ... }
 */

// Array to hold all registered ORM entities
export const OrmEntityRegistry: Function[] = [];

/**
 * Decorator to register a class as an ORM entity.
 * Adds the class to the OrmEntityRegistry array for later use (e.g., in DataSource config).
 */
export function OrmEntity(target: Function) {
	OrmEntityRegistry.push(target);
}
