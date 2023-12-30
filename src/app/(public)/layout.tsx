'use client';

import React from 'react';
import clsx from 'clsx';
import { Inter } from 'next/font/google';

import { useRequireGuest } from '@/hooks/require-login';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	useRequireGuest();

	return (
		<body className={clsx('h-full bg-gray-900', inter.className)}>
			{children}
		</body>
	);
}
