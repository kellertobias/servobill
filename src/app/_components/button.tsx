import clsx from 'clsx';
import React from 'react';

export type ButtonIcon = React.ForwardRefExoticComponent<
	Omit<React.SVGProps<SVGSVGElement>, 'ref'> & {
		title?: string | undefined;
		titleId?: string | undefined;
	} & React.RefAttributes<SVGSVGElement>
>;

export const AnimatedLoadingIcon: React.FC<{ className?: string }> = ({
	className,
}) => (
	<svg
		aria-hidden="true"
		role="status"
		className={clsx(className, 'inline  animate-spin')}
		viewBox="0 0 100 101"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
			fill="#E5E7EB"
		/>
		<path
			d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
			fill="currentColor"
		/>
	</svg>
);

export const ButtonGroup: React.FC<React.PropsWithChildren<unknown>> = ({
	children,
}) => (
	<span className="isolate inline-flex rounded-md shadow-sm">{children}</span>
);

export const Button: React.FC<
	React.PropsWithChildren<{
		icon?: ButtonIcon;
		href?: string;
		onClick?: () => void;
		disabled?: boolean;
		loading?: boolean;
		grouped?: boolean;
		primary?: boolean;
		header?: boolean;
		secondary?: boolean;
		danger?: boolean;
		success?: boolean;
		link?: boolean;
		className?: string;
		small?: boolean;
	}>
> = ({
	primary,
	secondary = false,
	danger = false,
	success = false,
	header = false,
	link = false,
	icon: Icon,
	href,
	onClick,
	disabled = false,
	loading = false,
	children,
	grouped = false,
	className,
	small = false,
}) => {
	const Element = href ? 'a' : 'button';
	primary = !secondary && !danger && !success;

	return (
		<Element
			type="button"
			className={clsx(
				'inline-flex items-center text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white',
				{
					'px-4 py-0.5': small,
					'px-4 py-2': !small,
				},
				{
					'bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-500':
						primary,
					'bg-transparent text-gray-800 hover:bg-gray-200 focus:ring-gray-500':
						link,
					'bg-transparent text-white hover:bg-gray-200 focus:ring-gray-500 ring-1 ring-white':
						header,
					'bg-white text-gray-800 hover:bg-gray-200 focus:ring-gray-900 ring-1 ring-gray-300/70':
						secondary,
					'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500':
						danger,
					'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500':
						success,
					'first:rounded-l-md last:rounded-r-md only:rounded-md': grouped,
					'rounded-md': !grouped,
					'opacity-50 cursor-not-allowed': disabled || loading,
				},
				className,
			)}
			onClick={
				disabled || loading
					? undefined
					: (e) => {
							e.stopPropagation();
							onClick?.();
						}
			}
			href={disabled || loading ? undefined : href}
			disabled={disabled}
		>
			{Icon && !loading && (
				<Icon
					className={clsx({
						'-ml-1 mr-2 h-5 w-5': children && !small,
						'-ml-1 -mr-1 h-5 w-5': !children && !small,
						'-ml-1 mr-2 h-4 w-4': children && small,
						'-ml-1 -mr-1 h-4 w-4': !children && small,
						'text-red-500': danger,
						'text-green-500': success,
						'text-blue-500': primary,
						'text-gray-500': secondary,
						'text-gray-100': header,
					})}
				/>
			)}
			{loading && <AnimatedLoadingIcon className="-ml-1 mr-2 h-5 w-5" />}
			{children}
		</Element>
	);
};
