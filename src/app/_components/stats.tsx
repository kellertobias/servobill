import clsx from 'clsx';
import React from 'react';

export type StatsDisplayStat = {
	name: string;
	value: string | number;
	subValue?: string | number;
	change?: number;
	changeType?: string;
};

const StatsLoadingSkeleton: React.FC<{
	className?: string;
	numStats: number;
}> = ({ className, numStats = 4 }) => (
	<div
		role="status"
		className={clsx(
			className,
			'divide divide-gray-200 rounded animate-pulse  md:p-6 ',
			'mx-auto grid grid-cols-1 gap-px ',

			{
				'grid-cols-2 md:grid-cols-4': numStats >= 4,
				'grid-cols-2 md:grid-cols-3': numStats === 3,
				'grid-cols-2': numStats === 2,
			},
		)}
	>
		{Array.from({ length: numStats }).map((_, i) => (
			<div
				className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-white px-4 py-4 sm:py-10 sm:px-6 xl:px-8"
				key={i}
			>
				<div>
					<div className="h-2.5 bg-gray-300 rounded-full  w-24 mb-2.5"></div>
					<div className="w-32 h-2 bg-gray-200 rounded-full "></div>
				</div>
			</div>
		))}

		<span className="sr-only">Loading...</span>
	</div>
);

export const StatsDisplay: React.FC<{
	className?: string;
	stats: StatsDisplayStat[];
	loading?: boolean;
}> = ({ stats, className, loading }) =>
	loading ? (
		<StatsLoadingSkeleton className={className} numStats={stats.length} />
	) : (
		<dl
			className={clsx(
				className,
				'mx-auto grid grid-cols-1 gap-px bg-gray-900/5',
				{
					'grid-cols-2 md:grid-cols-4': stats.length >= 4,
					'grid-cols-2 md:grid-cols-3': stats.length === 3,
					'grid-cols-2': stats.length === 2,
				},
			)}
		>
			{stats.map((stat) => {
				const changeType =
					stat.changeType || (stat.change || 0) >= 0 ? 'positive' : 'negative';
				return (
					<div
						key={stat.name}
						className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-white px-4 py-4 sm:py-6 sm:px-6 xl:px-8"
					>
						<dt className="text-xs sm:text-sm font-medium leading-6 text-gray-500">
							{stat.name}
						</dt>
						<dd
							className={clsx(
								changeType === 'negative' ? 'text-rose-600' : 'text-green-700',
								'text-xs font-medium',
							)}
						>
							{!!stat.change && (
								<>
									{changeType === 'negative' ? '-' : '+'}{' '}
									{Number(stat.change).toFixed(2)} %
								</>
							)}
						</dd>
						<dd className="w-full flex-none text-xl sm:text-2xl font-medium leading-3 sm:leading-6 tracking-tight text-gray-900">
							{stat.value}
						</dd>
					</div>
				);
			})}
		</dl>
	);
