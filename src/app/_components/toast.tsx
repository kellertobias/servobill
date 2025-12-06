/* eslint-disable @typescript-eslint/no-explicit-any */
import clsx from 'clsx';
import type React from 'react';
import toast from 'react-hot-toast';

function CustomToast({
	icon: Icon,
	message,
	title,
	type,
	visible = true,
	id,
}: {
	icon?: React.ForwardRefExoticComponent<
		Omit<React.SVGProps<SVGSVGElement>, 'ref'>
	>;
	message: string;
	title?: string;
	type?: 'success' | 'danger' | 'info';
	visible?: boolean;
	id?: string;
}) {
	return (
		<div
			className={clsx(
				'max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5',
				{
					'animate-enter': visible,
					'animate-leave': !visible,
				},
			)}
		>
			<div className="flex-1 w-0 p-4">
				<div className="flex items-start">
					<div className="flex-shrink-0 pt-0.5">
						{Icon && (
							<Icon
								className={clsx('h-10 w-10', {
									'text-green-500': type === 'success',
									'text-red-500': type === 'danger',
									'text-blue-500': type === 'info',
								})}
							/>
						)}
					</div>
					<div className="ml-3 flex-1">
						<p className="text-sm font-medium text-gray-900">
							{title || message}
						</p>

						{title && <p className="mt-1 text-sm text-gray-500">{message}</p>}
					</div>
				</div>
			</div>
			{id && (
				<div className="flex border-l border-gray-200">
					<button
						onClick={() => toast.dismiss(id)}
						className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						Close
					</button>
				</div>
			)}
		</div>
	);
}

export const doToast = (
	props:
		| {
				promise: Promise<any>;
				success: string;
				error: string;
				loading: string;
				duration?: undefined;
		  }
		| {
				promise?: undefined;
				icon?: React.ForwardRefExoticComponent<
					Omit<React.SVGProps<SVGSVGElement>, 'ref'>
				>;
				message: string;
				title?: string;
				type?: 'success' | 'danger';
				duration?: number;
		  },
) => {
	if (props.promise) {
		return toast.promise(props.promise, {
			loading: props.loading || 'Loading...',
			success: props.success || 'Success!',
			error: props.error || 'Error!',
		});
	}
	return toast.custom(
		(t: any) => (
			<CustomToast
				{...t}
				type={props.type || 'info'}
				{...props}
				icon={props.icon}
			/>
		),
		{
			duration: props.duration,
		},
	);
};
