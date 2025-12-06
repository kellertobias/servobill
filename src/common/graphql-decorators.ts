/**
 * GraphQL-specific decorators for authorization control.
 *
 * This file contains decorators that work with the ESLint rule
 * to enforce explicit authorization decisions on resolver methods.
 */

/**
 * Decorator to explicitly mark a public endpoint that doesn't require authorization.
 *
 * This decorator does nothing functionally but serves as an explicit marker
 * that the developer has consciously decided this endpoint should be public.
 * It satisfies the ESLint rule that requires either @Authorized() or @AllowUnauthorized()
 * on public methods in resolver files.
 *
 * Usage:
 *   @AllowUnauthorized()
 *   @Query(() => PublicData)
 *   async getPublicData(): Promise<PublicData> {
 *     // This endpoint is intentionally public
 *   }
 *
 * @returns A no-op decorator that satisfies the ESLint rule
 */
export function AllowUnauthorized(): MethodDecorator {
	// This is a no-op decorator that serves as an explicit marker
	// for public endpoints that don't require authorization
	return (
		target: object,
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	) => {
		// Do nothing - this is just a marker decorator
		return descriptor;
	};
}
