import React, { Fragment, useRef } from 'react';

import { Dialog, Transition } from '@headlessui/react';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';

import { Button } from './button';
import { confirmDialog } from './dialog';

export function Drawer(props: {
	id: string | null;
	title: string;
	subtitle?: string;
	children: React.ReactNode;
	onClose?: () => void;
	onCancel?: () => void;
	onSave?: () => Promise<void>;
	onDelete?: () => Promise<void>;
	deleteText?: {
		title: string;
		content: string | React.ReactNode;
	};
	cancelText?: string;
	saveText?: string;
}) {
	const { title, subtitle, children, onClose, id } = props;

	const waitingForConfirm = useRef(false);

	const wasOpen = React.useRef(false);
	const [open, setOpen] = React.useState(false);
	const [deleting, setDeleting] = React.useState(false);
	React.useEffect(() => {
		if (id) {
			setOpen(true);
		}
	}, [id]);

	React.useEffect(() => {
		if (!open && wasOpen.current) {
			onClose?.();
		}
		if (open) {
			wasOpen.current = true;
		}
	}, [open]);

	return (
		<Transition.Root show={open} as={Fragment}>
			<Dialog
				as="div"
				className="relative z-30"
				onClose={() => {
					if (waitingForConfirm.current) {
						return;
					}
					setOpen(false);
				}}
			>
				<Transition.Child
					as={Fragment}
					enter="ease-in-out duration-500"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in-out duration-500"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur" />
				</Transition.Child>

				<div className="fixed inset-0" />

				<div className="fixed inset-0 overflow-hidden">
					<div className="absolute inset-0 overflow-hidden">
						<div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full ">
							<Transition.Child
								as={Fragment}
								enter="transform transition ease-in-out duration-500 sm:duration-700"
								enterFrom="translate-x-full"
								enterTo="translate-x-0"
								leave="transform transition ease-in-out duration-500 sm:duration-700"
								leaveFrom="translate-x-0"
								leaveTo="translate-x-full"
							>
								<Dialog.Panel className="pointer-events-auto w-screen max-w-md">
									<form className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
										<div className="h-0 flex-1 overflow-y-auto">
											<div className="bg-slate-700 px-4 py-6 sm:px-6">
												<div className="flex items-center justify-between">
													<Dialog.Title className="text-base font-semibold leading-6 text-white">
														{title}
													</Dialog.Title>
													<div className="ml-3 flex h-7 items-center">
														<button
															type="button"
															className="relative rounded-md bg-slate-700 text-slate-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
															onClick={() => setOpen(false)}
														>
															<span className="absolute -inset-2.5" />
															<span className="sr-only">Close panel</span>
															<XMarkIcon
																className="h-6 w-6"
																aria-hidden="true"
															/>
														</button>
													</div>
												</div>
												<div className="mt-1">
													<p className="text-sm text-slate-300">{subtitle}</p>
												</div>
											</div>
											<div className="flex flex-1 flex-col justify-between">
												{open ? children : null}
											</div>
										</div>
										<div className="flex flex-shrink-0 justify-between px-4 py-4">
											{props.onDelete && (
												<div>
													<Button
														danger
														loading={deleting}
														onClick={async () => {
															setDeleting(true);
															waitingForConfirm.current = true;
															const deleteConfirmed = await confirmDialog({
																danger: true,
																icon: ExclamationCircleIcon,
																...(props.deleteText || {
																	title: 'Delete',
																	content:
																		'Are you sure you want to delete this?',
																}),
															});
															if (deleteConfirmed) {
																await props.onDelete?.();
															}
															waitingForConfirm.current = false;
															setDeleting(false);

															if (deleteConfirmed) {
																setOpen(false);
															}
														}}
													>
														Delete
													</Button>
												</div>
											)}
											<div className="flex flex-shrink-0 justify-end gap-2">
												<Button
													primary={!props.onSave}
													secondary={!!props.onSave}
													onClick={() => {
														props.onCancel?.();
														setOpen(false);
													}}
												>
													{props.cancelText || !props.onSave
														? 'Close'
														: 'Cancel'}
												</Button>

												{props.onSave && (
													<Button
														primary
														onClick={async () => {
															const close = props.onSave
																? await props.onSave()
																: true;
															if (close) {
																setOpen(false);
															}
														}}
													>
														{props.saveText || 'Save'}
													</Button>
												)}
											</div>
										</div>
									</form>
								</Dialog.Panel>
							</Transition.Child>
						</div>
					</div>
				</div>
			</Dialog>
		</Transition.Root>
	);
}
