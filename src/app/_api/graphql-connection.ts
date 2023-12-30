import { GraphQLClient } from 'graphql-request';
import axios from 'axios';
export { gql } from '@/common/gql';

// export type DocumentNode = ReturnType<typeof gql>;

export const isServer = typeof window === 'undefined';
const host = process.env.NEXT_PUBLIC_API_URL;
const endpoint = `${host}/api/graphql`;

export const connection = new GraphQLClient(endpoint, {
	mode: 'cors',
	credentials: 'include',
	headers: {
		'Apollo-Require-Preflight': 'true',
	},
});

export const restConnection = axios.create({
	baseURL: host,
	withCredentials: true,
});
