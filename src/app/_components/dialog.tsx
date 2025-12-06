import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type React from 'react';
import { Fragment } from 'react';
import { confirmable, createConfirmation } from 'react-confirm';

import { Button } from './button';

export type DialogProps = {
  icon?: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, 'ref'>>;
  title: string | React.ReactNode;
  content: string | React.ReactNode;
  cancelText?: string;
  confirmText?: string;
} & (
  | { primary: true; danger?: boolean; success?: boolean }
  | { primary?: boolean; danger: true; success?: boolean }
  | { primary?: boolean; danger?: boolean; success: true }
);

export function Dialog(props: {
  show: boolean;
  proceed: (proceed: boolean) => void;
  confirmation: string | React.ReactNode;
  options: DialogProps;
}) {
  const Icon = props.options.icon || ExclamationCircleIcon;
  return (
    <Transition.Root show={props.show} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={() => props.proceed(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0 w-full">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <HeadlessDialog.Panel className="relative transform rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg">
                <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div
                      className={clsx(
                        'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10',
                        {
                          'bg-red-100': props.options.danger,
                          'bg-green-100': props.options.success,
                          'bg-blue-100': !props.options.danger && !props.options.success,
                        }
                      )}
                    >
                      <Icon
                        className={clsx('h-6 w-6', {
                          'text-red-600': props.options.danger,
                          'text-green-600': props.options.success,
                          'text-blue-600': !props.options.danger && !props.options.success,
                        })}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <HeadlessDialog.Title
                        as="h3"
                        className="text-base font-semibold leading-6 text-gray-900"
                      >
                        {props.options.title}
                      </HeadlessDialog.Title>
                      <div className="mt-2">
                        {typeof props.options.content === 'string' ? (
                          <p className="text-sm text-gray-500">{props.options.content}</p>
                        ) : (
                          props.options.content
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 flex flex-col sm:flex-row-reverse sm:px-6 gap-2">
                  <Button
                    onClick={() => props.proceed(true)}
                    primary={props.options.primary}
                    danger={props.options.danger}
                    success={props.options.success}
                  >
                    {props.options.confirmText || 'Confirm'}
                  </Button>
                  <Button onClick={() => props.proceed(false)} secondary>
                    {props.options.cancelText || 'Cancel'}
                  </Button>
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  );
}

export const ConfirmDialog = confirmable(Dialog);

const confirmDialogInner = createConfirmation(ConfirmDialog);
export const confirmDialog = (options: DialogProps) =>
  confirmDialogInner({ options } as unknown as Parameters<typeof confirmDialogInner>[0]);
