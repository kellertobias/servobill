'use client';

import React from 'react';
import clsx from 'clsx';
import { Inter } from 'next/font/google';
import { ModalProvider } from 'react-modal-hook';
import { Toaster } from 'react-hot-toast';

import { useRequireLogin } from '@/hooks/require-login';
import { Navbar } from '@/components/navbar';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	useRequireLogin();

	return (
		<body className={clsx('h-full', inter.className)}>
			<Toaster position="bottom-left" />
			<ModalProvider>
				<div className="min-h-full">
					<Navbar />
					{children}
				</div>
			</ModalProvider>
		</body>
	);
}
