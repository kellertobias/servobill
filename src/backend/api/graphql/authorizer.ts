import type { AuthChecker } from 'type-graphql';

import type { GqlContext } from './types';

export const authChecker: AuthChecker<GqlContext> = ({ context }, roles) => {
  // Read user from context
  // and check the user's permission against the `roles` argument
  // that comes from the '@Authorized' decorator, eg. ["ADMIN", "MODERATOR"]

  if (!context.session?.user && context.session?.refreshable) {
    throw new Error('Session Expired - Refreshable');
  }

  if (!context.session?.user) {
    return false;
  }

  const userRoles = context.session.user?.roles || [];

  if (roles) {
    return roles.every((role) => userRoles.includes(role));
  }
  return true;
};
