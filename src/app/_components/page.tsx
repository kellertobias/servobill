import clsx from 'clsx';
import type React from 'react';

import { NotFound } from './not-found';

export const PageCard: React.FC<
	React.PropsWithChildren<{
		noPadding?: boolean;
		className?: string;
	}>
> = ({ noPadding = false, className, children }) => (
	<div
		className={clsx('rounded-lg bg-white shadow mb-6', className, {
			'px-5 py-6 sm-px-6': !noPadding,
		})}
	>
		{children}
	</div>
);

export const PageContent: React.FC<
	React.PropsWithChildren<{
		title: string | React.ReactNode;
		noPadding?: boolean;
		noCard?: boolean;
		contentClassName?: string;
		right?: React.ReactNode;
		footer?: React.ReactNode;
		notFound?: boolean;
		fullWidth?: boolean;
	}>
> = ({
	title,
	noPadding = false,
	noCard = false,
	contentClassName,
	right,
	footer,
	children,
	notFound = false,
	fullWidth = false,
}) => (
	<>
		<div className="bg-gray-800 pb-32">
			<header className="py-10">
				<div
					className={clsx(
						'mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between gap-5',
						{
							'max-w-7xl': !fullWidth,
							'w-full': fullWidth,
						},
					)}
				>
					<h1 className="text-3xl font-bold tracking-tight text-white">
						{title}
					</h1>
					<div className="text-center -mb-2">{right}</div>
				</div>
			</header>
		</div>

		<main className="-mt-32">
			<div
				className={clsx('mx-auto px-4 sm:px-6 lg:px-8', {
					'pb-12': !footer,
					'max-w-7xl': !fullWidth,
					'w-full': fullWidth,
				})}
			>
				<div
					className={clsx(contentClassName, {
						'px-5 py-6 sm-px-6': !noPadding && !noCard,
						'rounded-lg bg-white shadow': !noCard,
					})}
				>
					{children}
					{notFound && <NotFound />}
				</div>
			</div>
		</main>
		{footer && (
			<footer>
				<div className="max-w-7xl mx-auto pt-0 py-12 px-4 sm:px-6 lg:px-8">
					{footer}
				</div>
			</footer>
		)}
	</>
);
