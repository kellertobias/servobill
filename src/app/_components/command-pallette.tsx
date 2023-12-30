import React, { Fragment, useState } from 'react';
import clsx from 'clsx';

import { Dialog, Transition } from '@headlessui/react';
import {
	ExclamationCircleIcon,
	MagnifyingGlassIcon,
} from '@heroicons/react/20/solid';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function CommandPallette<T extends { id: string | number }>({
	data,
	onSearch,
	renderItem,
	renderListItem,
	nameKey = 'name' as keyof T,
	onClose,
	notFound = (
		<>
			<ExclamationCircleIcon
				className="mx-auto h-6 w-6 text-gray-400"
				aria-hidden="true"
			/>
			<p className="mt-4 font-semibold text-gray-900">No entries found</p>
			<p className="mt-2 text-gray-500">
				We couldn’t find anything with that term. Please try again.
			</p>
		</>
	),
}: {
	onSearch: (query: string) => void;
	nameKey?: keyof T;
	data: T[];
	renderItem: (item: T) => React.ReactNode;
	renderListItem?: (item: T, active: boolean) => React.ReactElement;
	onClose: () => void;
	notFound?: React.ReactNode;
}) {
	const renderListItemFinal =
		renderListItem ||
		((item: T, active: boolean) => (
			<>
				<span className="flex-auto truncate">{item[nameKey] as never}</span>
				{active && (
					<ChevronRightIcon
						className="ml-3 h-5 w-5 flex-none text-gray-400"
						aria-hidden="true"
					/>
				)}
			</>
		));

	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(true);
	const [showItem, setItem] = useState<T | null>(null);

	React.useEffect(() => {
		if (!open) {
			onClose();
		}
	}, [open]);

	return (
		<Transition.Root
			show={open}
			as={Fragment}
			afterLeave={() => setQuery('')}
			appear
		>
			<Dialog as="div" className="relative z-30" onClose={setOpen}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-gray-500 bg-opacity-70 transition-opacity backdrop-blur" />
				</Transition.Child>

				<div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0 scale-95"
						enterTo="opacity-100 scale-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-95"
					>
						<Dialog.Panel className="mx-auto max-w-3xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
							<>
								<div className="relative">
									<MagnifyingGlassIcon
										className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
										aria-hidden="true"
									/>
									<input
										className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
										placeholder="Search..."
										onChange={(event) => {
											setQuery(event.target.value);
											onSearch(event.target.value);
										}}
									/>
								</div>

								{(query === '' || data.length > 0) && (
									<div className="flex transform-gpu divide-x divide-gray-100">
										<div
											className={clsx(
												'max-h-96 min-w-0 flex-auto scroll-py-4 overflow-y-auto px-6 py-4',
												{
													'hidden sm:block sm:h-96': showItem,
												},
											)}
										>
											<div className="-mx-2 text-sm text-gray-700">
												{data.map((item) => (
													<div
														key={item.id}
														onClick={() => setItem(item)}
														className={clsx(
															'flex cursor-default select-none items-center rounded-md p-2',

															'hover:bg-gray-100 hover:text-gray-900',
														)}
													>
														{renderListItemFinal(
															item,
															showItem?.id === item.id,
														)}
													</div>
												))}
											</div>
										</div>

										<div
											className={clsx('h-96 w-full sm:w-1/2  overflow-y-auto', {
												'hidden sm:block': !showItem,
											})}
										>
											{showItem && (
												<>
													<div
														className="flex justify-start items-center px-6 py-4 cursor-pointer sm:hidden"
														onClick={() => setItem(null)}
													>
														<ChevronLeftIcon className="h-6 w-6 cursor-pointer text-gray-400" />
														<span className="text-sm text-gray-400 ml-2">
															Back to Selection
														</span>
													</div>
													<div className="flex-none flex-col divide-y divide-gray-100 sm:flex">
														{renderItem(showItem)}
													</div>
												</>
											)}
										</div>
									</div>
								)}

								{query !== '' && data.length === 0 && (
									<div className="px-6 py-14 text-center text-sm sm:px-14">
										{notFound}
									</div>
								)}
							</>
						</Dialog.Panel>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition.Root>
	);
}
