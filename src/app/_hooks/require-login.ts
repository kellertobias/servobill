import React from 'react';

import { API } from '@/api/index';

export type SessionUserState = {
	userName: string;
	profilePictureUrl?: string;
	email?: string;
	isAdmin: boolean;
};

export const UserContext = React.createContext<SessionUserState | null>(null);

export const useUserContext = () => {
	const user = React.useContext(UserContext);

	return user;
};

/**
 * Dispatch this window event after changing the signed in user's profile
 * (e.g. the picture) so the navbar loads the user again.
 */
export const USER_CHANGED_EVENT = 'servobill:user-changed';

export const notifyUserChanged = () => {
	window.dispatchEvent(new Event(USER_CHANGED_EVENT));
};

export const useRequireLogin = () => {
	const [user, setUser] = React.useState<SessionUserState | null>(null);
	React.useEffect(() => {
		const reload = async () => {
			const loggedIn = await API.isLoggedIn();
			if (loggedIn) {
				setUser(loggedIn);
			}
		};
		window.addEventListener(USER_CHANGED_EVENT, reload);
		return () => window.removeEventListener(USER_CHANGED_EVENT, reload);
	}, []);
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
