import React from 'react';

import { API } from '@/api/index';

export const useRequireLogin = () => {
	React.useEffect(() => {
		(async () => {
			// Check if logged in
			const loggedIn = await API.isLoggedIn();
			if (!loggedIn) {
				window.location.href = '/login';
			}
		})();
	}, []);
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
