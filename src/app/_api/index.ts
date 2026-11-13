import { centsToPrice, priceToCents } from '@/common/money';
import { gql, query, renewSessionToken } from './graphql';

export { gql } from './graphql';

export const API = {
	query,
	isLoggedIn: async (): Promise<
		| false
		| {
				userName: string;
				profilePictureUrl?: string;
				email?: string;
				isAdmin: boolean;
		  }
	> => {
		const result = await query(
			gql(`
				query CheckLoggedIn {
					loggedInUser {
						authenticated
						userName
						profilePictureUrl
						refreshable
						email
						isAdmin
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
		const { userName, profilePictureUrl, email, isAdmin } = result.loggedInUser;
		if (!userName) {
			return false;
		}

		return {
			userName,
			profilePictureUrl: profilePictureUrl || undefined,
			email: email || undefined,
			isAdmin,
		};
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
	/** Extracts a readable message from a failed GraphQL request. */
	getErrorMessage: (error: unknown): string => {
		const response = (
			error as { response?: { errors?: { message?: string }[] } }
		)?.response;
		return (
			response?.errors?.[0]?.message ||
			(error instanceof Error ? error.message : String(error))
		);
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
