'use client';

import clsx from 'clsx';
import { Inter } from 'next/font/google';
import type React from 'react';
import { Toaster } from 'react-hot-toast';
import { ModalProvider } from 'react-modal-hook';
import { Navbar } from '@/components/navbar';
import { UserContext, useRequireLogin } from '@/hooks/require-login';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireLogin();

  return (
    <body className={clsx('h-full', inter.className)}>
      <Toaster position="bottom-left" />
      <UserContext.Provider value={user}>
        <ModalProvider>
          <div className="min-h-full">
            <Navbar />
            {children}
          </div>
        </ModalProvider>
      </UserContext.Provider>
    </body>
  );
}
