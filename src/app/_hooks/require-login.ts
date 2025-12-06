import React from 'react';

import { API } from '@/api/index';

export type SessionUserState = {
  userName: string;
  profilePictureUrl?: string;
};

export const UserContext = React.createContext<SessionUserState | null>(null);

export const useUserContext = () => {
  const user = React.useContext(UserContext);

  return user;
};

export const useRequireLogin = () => {
  const [user, setUser] = React.useState<SessionUserState | null>(null);
  React.useEffect(() => {
    (async () => {
      // Check if logged in
      const loggedIn = await API.isLoggedIn();
      if (loggedIn) {
        setUser(loggedIn);
      } else {
        setUser(null);
        window.location.href = '/login';
      }
    })();
  }, []);

  return user;
};

export const useRequireGuest = () => {
  React.useEffect(() => {
    (async () => {
      // Check if logged in
      const loggedIn = await API.isLoggedIn();
      if (loggedIn) {
        window.location.href = '/invoices';
      }
    })();
  }, []);
};

export const useRouteBasedOnLogin = () => {
  React.useEffect(() => {
    (async () => {
      // Check if logged in
      const loggedIn = await API.isLoggedIn();
      window.location.href = loggedIn ? '/invoices' : '/login';
    })();
  }, []);
};
