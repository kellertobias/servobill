import { gql, query, renewSessionToken } from './graphql';

import { centsToPrice, priceToCents } from '@/common/money';
export { gql } from './graphql';

export const API = {
	query,
	isLoggedIn: async (): Promise<
		false | { userName: string; profilePictureUrl?: string }
	> => {
		const result = await query(
			gql(`
				query CheckLoggedIn {
					loggedInUser {
						authenticated
						userName
						profilePictureUrl
						refreshable
					}
				}
			`),
		);
		if (!result.loggedInUser.authenticated) {
			if (result.loggedInUser.refreshable) {
				await renewSessionToken();
				return API.isLoggedIn();
			} else {
				return false;
			}
		}
		const { userName, profilePictureUrl } = result.loggedInUser;
		if (!userName) {
			return false;
		}

		return { userName, profilePictureUrl: profilePictureUrl || undefined };
	},
	getContext: async () => {
		const result = await query(
			gql(`
				query GetContext {
					getContext {
						contextString
					}
				}
			`),
		);
		const context = JSON.parse(result.getContext.contextString);
		return context;
	},
	centsToPrice,
	priceToCents,
	getChange: (
		value1: number | undefined | null,
		value2: number | undefined | null,
	) => {
		if (value1 && !value2) {
			return -100;
		}
		if (!value1 && value2) {
			return 100;
		}
		if (!value1 || !value2) {
			return;
		}
		return ((value1 - value2) / value2) * 100;
	},
};

if (typeof window !== 'undefined') {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as any).API = API;
}
