import clsx from 'clsx';

export function LoadingSkeleton({ className = 'm-6' }: { className?: string }) {
	return (
		<div
			role="status"
			className={clsx(
				className,
				'w-auto p-4 space-y-4 border border-gray-200 divide-y divide-gray-200 rounded animate-pulse  md:p-6 ',
			)}
		>
			<div className="flex items-center justify-between">
				<div>
					<div className="h-2.5 bg-gray-300 rounded-full  w-24 mb-2.5"></div>
					<div className="w-32 h-2 bg-gray-200 rounded-full "></div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full  w-12"></div>
			</div>
			<div className="flex items-center justify-between pt-4">
				<div>
					<div className="h-2.5 bg-gray-300 rounded-full  w-24 mb-2.5"></div>
					<div className="w-32 h-2 bg-gray-200 rounded-full "></div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full  w-12"></div>
			</div>
			<div className="flex items-center justify-between pt-4">
				<div>
					<div className="h-2.5 bg-gray-300 rounded-full  w-24 mb-2.5"></div>
					<div className="w-32 h-2 bg-gray-200 rounded-full "></div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full  w-12"></div>
			</div>
			<div className="flex items-center justify-between pt-4">
				<div>
					<div className="h-2.5 bg-gray-300 rounded-full  w-24 mb-2.5"></div>
					<div className="w-32 h-2 bg-gray-200 rounded-full "></div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full  w-12"></div>
			</div>
			<div className="flex items-center justify-between pt-4">
				<div>
					<div className="h-2.5 bg-gray-300 rounded-full  w-24 mb-2.5"></div>
					<div className="w-32 h-2 bg-gray-200 rounded-full "></div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full  w-12"></div>
			</div>
			<span className="sr-only">Loading...</span>
		</div>
	);
}
