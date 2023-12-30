import clsx from 'clsx';
import React, { Fragment } from 'react';

import { LoadingSkeleton } from './loading';
import { NotFound } from './not-found';

export const Table = <T extends Record<string, unknown>>(props: {
	data: T[] | null | undefined;
	loading?: boolean;
	columns: {
		key: string;
		title: string;
		colSpan?: number;
		headerClassName?: string;
		className?: string;
		render: (data: T) => string | React.ReactNode;
	}[];
	keyField: keyof T;

	getLineLink?: (data: T) => string | null | (() => void);
	getCategory?: (data: T) => string;
	title?: string | React.ReactNode;
}) => {
	let lastCategory: string | undefined;

	return (
		<div>
			{props.title && (
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<h2 className="mx-auto max-w-2xl text-base font-semibold leading-6 text-gray-900 lg:mx-0 lg:max-w-none">
						{props.title}
					</h2>
				</div>
			)}
			{!props.data || props.data.length === 0 || props.loading ? (
				props.loading ? (
					<LoadingSkeleton />
				) : (
					<NotFound
						title="Nothing to Show"
						subtitle="There are no results to show"
					/>
				)
			) : (
				<div
					className={clsx('overflow-hidden border-t border-gray-100', {
						'mt-6': props.title,
					})}
				>
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
							<table className="w-full text-left">
								<thead className="sr-only">
									<tr>
										{props.columns.map((column) => (
											<th
												key={column.key}
												scope="col"
												colSpan={column.colSpan}
												className={clsx(
													// 'py-5 text-xs font-medium tracking-wide text-gray-500 uppercase',
													column.headerClassName || column.className,
												)}
											>
												{column.title}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{props.data.map((data) => {
										const key = String(data[props.keyField]);
										const category = props.getCategory?.(data);
										const lineLink = props.getLineLink?.(data);

										const categoryDivider =
											category && category !== lastCategory ? (
												<tr className="text-sm leading-6 text-gray-900">
													<th
														scope="colgroup"
														colSpan={props.columns.length}
														className="relative isolate py-2 font-semibold"
													>
														{category}
														<div className="absolute inset-y-0 right-full -z-10 w-screen border-b border-gray-200 bg-gray-50" />
														<div className="absolute inset-y-0 left-0 -z-10 w-screen border-b border-gray-200 bg-gray-50" />
													</th>
												</tr>
											) : null;
										lastCategory = category;

										return (
											<Fragment key={key}>
												{categoryDivider}
												<tr
													onClick={() => {
														if (typeof lineLink === 'string') {
															window.location.href = lineLink;
														} else if (typeof lineLink === 'function') {
															lineLink();
														}
													}}
												>
													{props.columns.map((column, index) => (
														<td
															key={column.key}
															className={clsx(column.className, 'relative')}
															colSpan={column.colSpan}
														>
															{column.render(data)}
															{index === 0 && (
																<>
																	<div className="absolute bottom-0 right-full h-px w-screen bg-gray-100" />
																	<div className="absolute bottom-0 left-0 h-px w-screen bg-gray-100" />
																</>
															)}
														</td>
													))}
												</tr>
											</Fragment>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
