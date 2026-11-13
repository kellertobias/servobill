'use client';

import type React from 'react';
import { LoadingSkeleton } from '@/components/loading';
import { PageContent } from '@/components/page';
import { useUserContext } from '@/hooks/require-login';

/**
 * Settings are only available to administrators. The API enforces this as
 * well; this layout only avoids showing pages that cannot be saved.
 */
export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = useUserContext();

	if (!user) {
		return <LoadingSkeleton />;
	}

	if (!user.isAdmin) {
		return (
			<PageContent title="Settings">
				<p className="text-sm text-gray-600">
					Only administrators can change settings. Ask an administrator of this
					Servobill instance for help.
				</p>
			</PageContent>
		);
	}

	return <>{children}</>;
}
