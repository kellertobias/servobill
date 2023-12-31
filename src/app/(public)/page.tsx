'use client';

import { useRouteBasedOnLogin } from '@/hooks/require-login';

export default function Index() {
	useRouteBasedOnLogin();

	return (
		<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<img
					className="mx-auto h-40 mb-12 w-auto"
					src="/logo-white-stacked.png"
					alt="Servobill"
				/>
			</div>

			<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm flex flex-row justify-center">
				<span className="relative flex h-8 w-8">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
					<span className="relative inline-flex rounded-full h-8 w-8 bg-blue-600"></span>
				</span>
			</div>
		</div>
	);
}
