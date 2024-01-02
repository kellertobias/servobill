import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import React, { Fragment } from 'react';

import {
	Bars3Icon,
	UserCircleIcon,
	XMarkIcon,
} from '@heroicons/react/20/solid';
import { Disclosure, Menu, Transition } from '@headlessui/react';

import { useUserContext } from '@/hooks/require-login';

type MenuItemDef = {
	name?: string;
	href?: string;
	onClick?: () => void;
	mobile?: boolean;
	divider?: boolean;
};

const navigation: MenuItemDef[] = [
	{ name: 'Invoices', href: '/invoices' },
	{ name: 'Expenses', href: '/expenses' },
	{ name: 'Customers', href: '/customers', mobile: true },
	{ name: 'Products', href: '/products', mobile: true },
	{ name: 'Settings', href: '/settings', mobile: true },
];

const userNavigation: MenuItemDef[] = [
	{ name: 'Customers', href: '/customers', mobile: false },
	{ name: 'Products', href: '/products', mobile: false },
	{ name: 'Settings', href: '/settings', mobile: false },
	{ divider: true, mobile: false },
	{
		name: 'Sign out',
		href: `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/logout`,
	},
];

const MenuItems: React.FC<{
	items: MenuItemDef[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	as: any;
	isMobile?: boolean;
	isFull?: boolean;
	isSecondaryMenu?: boolean;
	renderWrapper?: (
		renderChildren: ({ active }: { active: boolean }) => React.ReactElement,
		key: string,
	) => React.ReactElement;
}> = ({
	as: As,
	isMobile,
	isFull,
	items,
	isSecondaryMenu,
	renderWrapper = (renderChildren, key) => (
		<React.Fragment key={key}>
			{renderChildren({ active: false })}
		</React.Fragment>
	),
}) => {
	const pathname = usePathname();
	return (
		<>
			{items.map((item) => {
				const isActive = item.href && pathname.startsWith(item.href);
				if (item.mobile && !isMobile) {
					return null;
				}
				if (item.mobile === false && isMobile) {
					return null;
				}
				if (item.divider) {
					return <div className="border-t border-gray-200 mt-1 mb-1" />;
				}
				return renderWrapper(
					({ active }) => (
						<As
							key={item.name}
							onClick={item.onClick}
							href={item.href}
							className={clsx(
								isSecondaryMenu
									? {
											'bg-gray-100': active,
											'block px-4 py-2 text-sm text-gray-700': isFull,
											'block w-full rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white':
												isMobile,
										}
									: {
											'bg-gray-100': active,
											'block px-4 py-2 text-sm text-gray-700': isSecondaryMenu,
											'bg-gray-900 text-white': isActive && !isSecondaryMenu,
											'text-gray-300 hover:bg-gray-700 hover:text-white':
												!isActive && !isSecondaryMenu,
											'rounded-md px-3 py-2 text-sm font-medium':
												isFull && !isSecondaryMenu,
											'block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white':
												isFull && isSecondaryMenu,
											'block w-full justify-left text-left rounded-md px-3 py-2 text-base font-medium':
												isMobile,
										},
							)}
							aria-current={isActive ? 'page' : undefined}
						>
							{item.name}
						</As>
					),
					`${item.name}${item.href}`,
				);
			})}
		</>
	);
};

export const Navbar = () => {
	const user = useUserContext();
	return (
		<Disclosure as="nav" className="bg-gray-800">
			{({ open }) => (
				<>
					<div className="-z-10 h-16"></div>
					<div className="fixed z-20 top-0 left-0 right-0 bg-gray-800/95 backdrop-blur">
						<div className="mx-auto max-w-7xl sm:px-6 lg:px-8 ">
							<div className="border-b border-gray-700">
								<div className="flex h-16 items-center justify-between px-4 sm:px-0">
									<div className="flex items-center">
										<div className="flex-shrink-0">
											<img
												onClick={() => window.location.replace('/')}
												className="h-8 w-8 object-contain"
												src="/logo-icon.png"
												alt="Tobisk Media"
											/>
										</div>
										<div className="hidden md:block">
											<div className="ml-10 flex items-baseline space-x-4">
												<MenuItems items={navigation} as="a" isFull />
											</div>
										</div>
									</div>
									<div className="hidden md:block">
										<div className="ml-4 flex items-center md:ml-6">
											{/* Profile dropdown */}
											<Menu as="div" className="relative ml-3">
												<div>
													<Menu.Button className="relative flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
														<span className="absolute -inset-1.5" />
														<span className="sr-only">Open user menu</span>
														<span className="bg-gray-700 flex items-center justify-center h-10 w-10 rounded-full">
															{user?.profilePictureUrl ? (
																<img
																	className="h-10 w-10 rounded-full "
																	src={user?.profilePictureUrl}
																	alt=""
																/>
															) : (
																<UserCircleIcon
																	className="h-10 w-10 text-gray-400"
																	aria-hidden="true"
																/>
															)}
														</span>
													</Menu.Button>
												</div>
												<Transition
													as={Fragment}
													enter="transition ease-out duration-100"
													enterFrom="transform opacity-0 scale-95"
													enterTo="transform opacity-100 scale-100"
													leave="transition ease-in duration-75"
													leaveFrom="transform opacity-100 scale-100"
													leaveTo="transform opacity-0 scale-95"
												>
													<Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
														<MenuItems
															items={userNavigation}
															renderWrapper={(renderChildren, key) => (
																<Menu.Item key={key}>
																	{renderChildren}
																</Menu.Item>
															)}
															as={'a'}
															isFull
															isSecondaryMenu
														/>
													</Menu.Items>
												</Transition>
											</Menu>
										</div>
									</div>
									<div className="-mr-2 flex md:hidden">
										{/* Mobile menu button */}
										<Disclosure.Button className="relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
											<span className="absolute -inset-0.5" />
											<span className="sr-only">Open main menu</span>
											{open ? (
												<XMarkIcon
													className="block h-6 w-6"
													aria-hidden="true"
												/>
											) : (
												<Bars3Icon
													className="block h-6 w-6"
													aria-hidden="true"
												/>
											)}
										</Disclosure.Button>
									</div>
								</div>
							</div>
						</div>
					</div>

					<Disclosure.Panel className="border-b border-gray-700 md:hidden bg-gray-800/95 backdrop-blur fixed z-50 top-18 left-0 right-0 bottom-0 h-[calc(100vh-60px)] border-t border-t-gray-700">
						<div className="space-y-1 px-2 py-3 sm:px-3">
							<MenuItems items={navigation} as={'a'} isMobile />
						</div>
						<div className="border-t border-gray-700 pb-3">
							<div className="mt-3 space-y-1 px-2">
								<MenuItems
									items={userNavigation}
									as={'a'}
									isMobile
									isSecondaryMenu
								/>
							</div>
						</div>
					</Disclosure.Panel>
				</>
			)}
		</Disclosure>
	);
};
