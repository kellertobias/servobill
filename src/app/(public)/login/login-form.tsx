'use client';

import { XCircleIcon } from '@heroicons/react/20/solid';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { API, gql } from '@/api/index';

type AuthOptions = {
	localEnabled: boolean;
	providers: { id: string; name: string; loginPath: string }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

const buttonClass =
	'flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-60';

const inputClass =
	'block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6';

/** Email and password form, posts to /api/auth/login. */
function LocalLoginForm({ onError }: { onError: (message: string) => void }) {
	const [email, setEmail] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	return (
		<form
			className="space-y-4"
			onSubmit={async (event) => {
				event.preventDefault();
				setBusy(true);
				onError('');
				try {
					const response = await fetch(`${apiUrl}/api/auth/login`, {
						method: 'POST',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email, password }),
					});
					const result = await response.json().catch(() => ({}));
					if (!response.ok) {
						onError(result.message || 'Sign in failed');
						return;
					}
					window.location.href = '/invoices';
				} catch {
					onError('Sign in failed. Is the server reachable?');
				} finally {
					setBusy(false);
				}
			}}
		>
			<div>
				<label
					htmlFor="login-email"
					className="block text-sm font-medium leading-6 text-white"
				>
					Email address
				</label>
				<input
					id="login-email"
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className={`mt-2 px-2 ${inputClass}`}
				/>
			</div>
			<div>
				<label
					htmlFor="login-password"
					className="block text-sm font-medium leading-6 text-white"
				>
					Password
				</label>
				<input
					id="login-password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className={`mt-2 px-2 ${inputClass}`}
				/>
			</div>
			<button type="submit" className={buttonClass} disabled={busy}>
				{busy ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	);
}

/**
 * Login form component that handles the authentication flow
 * Includes error handling, loading states, and Google OAuth integration
 */
export function LoginForm() {
	const queryString = useSearchParams();
	const [failedSuccess, setFailedSuccess] = React.useState(false);
	const [options, setOptions] = React.useState<AuthOptions | null>(null);
	const [localError, setLocalError] = React.useState('');

	React.useEffect(() => {
		API.query({
			query: gql(`
				query AuthOptions {
					authOptions {
						localEnabled
						providers {
							id
							name
							loginPath
						}
					}
				}
			`),
		})
			.then((result) => setOptions(result.authOptions))
			.catch(() =>
				setOptions({
					localEnabled: false,
					providers: [
						{ id: 'google', name: 'Google', loginPath: '/api/auth/authorize' },
					],
				}),
			);
	}, []);

	const errorMessage = localError || queryString.get('error');

	React.useEffect(() => {
		if (queryString.has('success')) {
			const timeout = setTimeout(() => {
				setFailedSuccess(true);
			}, 10000);
			return () => clearTimeout(timeout);
		}
	}, [queryString]);

	return (
		<>
			{(errorMessage || failedSuccess) && (
				<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
					<div className="rounded-md bg-red-950 p-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<XCircleIcon
									className="h-5 w-5 text-red-400"
									aria-hidden="true"
								/>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-bold text-red-600">Login Failed</h3>
								<div className="mt-2 text-sm text-red-600">
									{failedSuccess ? (
										<>
											<p className="mb-3">
												Login against provider succeeded, but we couldn't start
												your session.
											</p>
											<p>Are cookies enabled?</p>
										</>
									) : (
										<p>{errorMessage || 'An unknown error occurred.'}</p>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{queryString.has('success') && !failedSuccess ? (
				<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm flex flex-row justify-center">
					<span className="relative flex h-8 w-8">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
						<span className="relative inline-flex rounded-full h-8 w-8 bg-blue-600"></span>
					</span>
				</div>
			) : (
				<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
					{!options ? (
						<div className="flex flex-row justify-center">
							<span className="relative inline-flex rounded-full h-3 w-3 bg-gray-600 animate-pulse" />
						</div>
					) : (
						<div className="space-y-6">
							{options.localEnabled && (
								<LocalLoginForm onError={setLocalError} />
							)}
							{options.localEnabled && options.providers.length > 0 && (
								<div className="relative">
									<div
										className="absolute inset-0 flex items-center"
										aria-hidden="true"
									>
										<div className="w-full border-t border-gray-700" />
									</div>
									<div className="relative flex justify-center text-sm">
										<span className="bg-gray-900 px-2 text-gray-400">or</span>
									</div>
								</div>
							)}
							{options.providers.map((provider) => (
								<a
									key={provider.id}
									className={buttonClass}
									href={`${apiUrl}${provider.loginPath}`}
								>
									Sign in with {provider.name}
								</a>
							))}
							{!options.localEnabled && options.providers.length === 0 && (
								<p className="text-center text-sm text-gray-400">
									No sign in method is configured. Set LOCAL_AUTH_ENABLED,
									OIDC_PROVIDERS or OAUTH_CLIENT_ID.
								</p>
							)}
						</div>
					)}

					<p className="mt-10 text-center text-sm text-gray-400">
						Interested in this Billing software? visit{' '}
						<a
							href="https://www.servobill.de"
							className="font-semibold leading-6 text-indigo-400 hover:text-indigo-300"
						>
							servobill.de
						</a>
					</p>
				</div>
			)}
		</>
	);
}
