'use client';

import { XCircleIcon } from '@heroicons/react/20/solid';
import { useSearchParams } from 'next/navigation';
import React from 'react';

/**
 * Login form component that handles the authentication flow
 * Includes error handling, loading states, and Google OAuth integration
 */
export function LoginForm() {
  const queryString = useSearchParams();
  const [failedSuccess, setFailedSuccess] = React.useState(false);

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
      {(queryString.get('error') || failedSuccess) && (
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <div className="rounded-md bg-red-950 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-red-600">Login Failed</h3>
                <div className="mt-2 text-sm text-red-600">
                  {failedSuccess ? (
                    <>
                      <p className="mb-3">
                        Login against provider succeeded, but we couldn't start your session.
                      </p>
                      <p>Are cookies enabled?</p>
                    </>
                  ) : (
                    <p>{queryString.get('error') || 'An unknown error occurred.'}</p>
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
          <form className="space-y-6" action="#" method="POST">
            <div>
              <a
                className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/authorize`}
              >
                Sign in with Google
              </a>
            </div>
          </form>

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
