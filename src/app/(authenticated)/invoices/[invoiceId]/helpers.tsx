import {
	CheckIcon,
	NewspaperIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type React from 'react';
import { useState } from 'react';
import { DateInput } from '@/components/date';
import { useAutoSizeTextArea } from '@/hooks/use-auto-textarea';

export function InvoiceLookupStartButton({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onClick,
}: {
	onClick: () => void;
}) {
	return (
		<div
			className="
				absolute
				z-10
				-left-1
				-top-6
				rounded-full
			"
		>
			<button
				onClick={onClick}
				type="button"
				className="
				
				inline-flex items-center
				gap-x-1
				h-6
				rounded-full
				bg-white
				px-2.5 py-0.5
				hover:py-1
				text-xs font-semibold text-gray-900
				shadow-sm ring-1 ring-inset ring-gray-300
				hover:bg-gray-50
				group
				transform duration-300
			"
			>
				<NewspaperIcon
					className="-ml-1 -mr-2 group-hover:-mr-0.5 h-3 w-3 group-hover:h-4 group-hover:w-4 text-gray-400 group-hover:text-blue-500 transform duration-300"
					aria-hidden="true"
				/>
				<span className="group-hover:w-32 w-0 overflow-clip whitespace-nowrap transform duration-300">
					Lookup from Catalog
				</span>
			</button>
		</div>
	);
}

export function InvoiceRowDeleteButton({ onClick }: { onClick: () => void }) {
	return (
		<div
			className="
				absolute
				z-10
				-right-1
				-top-6
				rounded-full
			"
		>
			<button
				onClick={onClick}
				type="button"
				className="
				
				inline-flex items-center
				gap-x-1
				h-6
				rounded-full
				bg-white
				px-2.5 py-0.5
				hover:py-1
				text-xs font-semibold text-gray-900
				shadow-sm ring-1 ring-inset ring-gray-300
				hover:bg-gray-50
				group
				transform duration-300
			"
			>
				<TrashIcon
					className="-ml-1 -mr-2 group-hover:-mr-0.5 h-3 w-3 group-hover:h-4 group-hover:w-4 text-gray-400 group-hover:text-red-500 transform duration-300"
					aria-hidden="true"
				/>
				<span className="group-hover:w-20 w-0 overflow-clip whitespace-nowrap transform duration-300">
					Remove Item
				</span>
			</button>
		</div>
	);
}

export function InvoiceItemDivider({
	onAddItem,
	locked,
}: {
	onAddItem: () => void;
	locked: boolean;
}) {
	return (
		<div className="relative">
			<div className="absolute inset-0 flex items-center" aria-hidden="true">
				<div className="w-full border-t border-gray-300" />
			</div>
			{locked ? null : (
				<div className="relative flex justify-center items-middle">
					<button
						onClick={onAddItem}
						type="button"
						className="
						inline-flex items-center
						gap-x-1
						h-6
						rounded-full
						bg-white
						px-2.5 py-0.5
						hover:py-1
						text-xs font-semibold text-gray-900
						shadow-sm ring-1 ring-inset ring-gray-300
						hover:bg-gray-50
						group
						transform duration-300
					"
					>
						<PlusIcon
							className="-ml-1 -mr-2 group-hover:-mr-0.5 h-3 w-3 group-hover:h-4 group-hover:w-4 text-gray-400 transform duration-300"
							aria-hidden="true"
						/>
						<span className="group-hover:w-14 w-0 overflow-clip whitespace-nowrap transform duration-300">
							Add Item
						</span>
					</button>
				</div>
			)}
		</div>
	);
}

export function InlineEditableText({
	value,
	onChange,
	placeholder,
	empty,
	textRight = false,
	locked,
	prefix,
	postfix,
}: {
	value: string | null | undefined;
	placeholder: string;
	empty?: string;

	onChange: (value: string) => void;
	locked: boolean;
	textRight?: boolean;
	prefix?: string;
	postfix?: string;
}) {
	const ref = useAutoSizeTextArea(value || placeholder);

	return (
		<InlineEditableArea textRight={textRight} locked={locked}>
			{(editing, setEditing) => (
				<div
					className={clsx('flex flex-row', {
						'justify-end': textRight,
					})}
				>
					{prefix && (
						<span className="whitespace-nowrap break-keep pr-1">{prefix}</span>
					)}
					{editing ? (
						<textarea
							ref={ref}
							// biome-ignore lint/a11y/noAutofocus: needed
							autoFocus
							placeholder={placeholder}
							className={clsx(
								'w-full m-0 p-0 outline outline-transparent border-none bg-transparent resize-none placeholder:text-sm placeholder:text-gray-300 placeholder:leading-6',
								{
									'text-right': textRight,
								},
							)}
							value={value || ''}
							onChange={(e) => onChange(e.target.value)}
							onBlur={() => setEditing(false)}
						/>
					) : (
						<span className="whitespace-pre-line">
							{value?.trim() ? (
								value
							) : (
								<span className="opacity-30">{empty || placeholder}</span>
							)}
						</span>
					)}
					{postfix && (
						<span className="whitespace-nowrap break-keep pl-1">{postfix}</span>
					)}
				</div>
			)}
		</InlineEditableArea>
	);
}

export function InlineEditableDate({
	value,
	onChange,
	placeholder,
	empty,
	locked,
}: {
	value: string | null | undefined;
	placeholder: string;
	empty?: string;
	onChange: (value: string) => void;
	locked: boolean;
	prefix?: string;
	postfix?: string;
}) {
	return (
		<div className={clsx('relative w-full group')}>
			{locked ? (
				value ? (
					dayjs(value).format('DD.MM.YYYY')
				) : (
					<span className="opacity-30">{empty || placeholder}</span>
				)
			) : (
				<DateInput
					value={value || undefined}
					onChange={(value) => {
						onChange(value);
					}}
					placeholder={placeholder}
					reduced
				/>
			)}
		</div>
	);
}

export function InlineEditableArea({
	textRight = false,
	children,
	locked,
	onStartEditing,
}: {
	locked: boolean;
	textRight?: boolean;
	onStartEditing?: () => void;
	children: (
		editing: boolean,
		setEditing: (editing: boolean) => void,
	) => React.ReactNode;
}) {
	const [editing, setEditing] = useState(false);

	return (
		<div
			className={clsx('relative w-full group', {
				'cursor-pointer': !locked && !editing,
			})}
			onClick={() =>
				!locked &&
				!editing &&
				(onStartEditing ? onStartEditing() : setEditing(true))
			}
		>
			{!locked && (
				<button
					type="button"
					onClick={() => setEditing(false)}
					className={clsx(
						'inline-flex items-center justify-center absolute z-10 h-6 w-6 p-1 rounded-full',
						'bg-white text-xs font-semibold text-gray-900',
						'shadow-sm ring-1 ring-inset ring-gray-300',
						'hover:bg-gray-50',
						{
							'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300':
								!editing,
							'text-gray-400': !editing,
							'text-green-500 hover:text-green-700': editing,
							'left-0 -ml-7': !textRight,
							'right-0 -mr-7': textRight,
						},
					)}
				>
					{editing ? (
						<CheckIcon className="w-3 h-3" />
					) : (
						<PencilIcon className="w-3 h-3" />
					)}
				</button>
			)}
			{children(editing, setEditing)}
		</div>
	);
}
