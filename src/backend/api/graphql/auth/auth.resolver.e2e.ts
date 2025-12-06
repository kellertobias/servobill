import type { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { Session } from '@/backend/api/session';
import { prepareGraphqlTest } from '@/test/graphql-test';

/**
 * Integration tests for AuthResolver.
 *
 * This suite covers:
 *  - loggedInUser: both authenticated and unauthenticated cases
 *  - getContext: authenticated (should succeed) and unauthenticated (should fail)
 *
 * Uses prepareGraphqlTest to spin up a DI-backed GraphQL server for each test.
 */
describe('AuthResolver (integration)', () => {
  /**
   * Test the loggedInUser query for an unauthenticated user.
   * Should return authenticated: false and empty user info.
   */
  it('loggedInUser returns unauthenticated for anonymous user', async () => {
    const { execute } = await prepareGraphqlTest();
    const query = `query { loggedInUser { authenticated userName profilePictureUrl refreshable } }`;
    const result = await execute({
      source: query,
      contextValue: { authenticated: false },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.loggedInUser).toEqual({
      authenticated: false,
      userName: '',
      profilePictureUrl: '',
      refreshable: false,
    });
  });

  /**
   * Test the loggedInUser query for an authenticated user.
   * Should return authenticated: true and correct user info.
   */
  it('loggedInUser returns authenticated user info', async () => {
    const session = new Session({
      userId: 'u1',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'test-picture.png',
      roles: ['user'],
    });
    const { execute } = await prepareGraphqlTest();
    const query = `query { loggedInUser { authenticated userName profilePictureUrl refreshable } }`;
    const result = await execute({
      source: query,
      contextValue: { session, authenticated: true },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.loggedInUser.authenticated).toBe(true);
    expect(result.data?.loggedInUser.userName).toBe('Test User');
    // profilePictureUrl is signed, so just check it's a string (could be empty if not implemented)
    expect(typeof result.data?.loggedInUser.profilePictureUrl).toBe('string');
    expect(result.data?.loggedInUser.refreshable).toBe(false);
  });

  /**
   * Test the getContext query for an authenticated user.
   * Should return the context string (JSON).
   */
  it('getContext returns context string for authenticated user', async () => {
    const session = new Session({
      userId: 'u1',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'test-picture.png',
      roles: ['user'],
    });
    const { execute } = await prepareGraphqlTest();
    const query = `query { getContext { contextString } }`;
    const result = await execute({
      source: query,
      contextValue: { session, authenticated: true },
    });
    expect(result.errors).toBeUndefined();
    // Should be a JSON string containing the user name
    expect(result.data?.getContext.contextString).toContain('Test User');
  });

  /**
   * Test the getContext query for an unauthenticated user.
   * Should return an authorization error.
   */
  it('getContext fails for unauthenticated user', async () => {
    const { execute } = await prepareGraphqlTest();
    const query = `query { getContext { contextString } }`;
    const result = await execute({
      source: query,
      contextValue: { authenticated: false } as unknown as {
        authenticated: boolean;
      },
    });
    expect(result.errors).toBeDefined();
    // Should be an authorization error
    const firstError = result.errors?.[0];
    const message =
      firstError && typeof firstError === 'object' && 'message' in firstError
        ? (firstError as GraphQLError).message
        : String(firstError);
    expect(message).toMatch(/not authorised|unauthorized|not authorized|authorized|access denied/i);
  });
});
