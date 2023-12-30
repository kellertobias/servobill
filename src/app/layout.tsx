import 'reflect-metadata';
import React from 'react';
import './globals.css';

import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
	themeColor: 'black',
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	minimumScale: 1,
	viewportFit: 'cover',
	userScalable: false,
};

export const metadata: Metadata = {
	title: 'Tobisk Invoices',
	description: 'Serverless Invoice and Expenses Management',
	manifest: '/manifest.json',
	appleWebApp: {
		capable: true,
		title: 'Tobisk Faktura',
		statusBarStyle: 'black',
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <html className="h-full bg-gray-100">{children}</html>;
}
