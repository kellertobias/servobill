import React from 'react';

import { useAutoSizeTextArea } from '@/hooks/use-auto-textarea';
import clsx from 'clsx';

export const Input: React.FC<{
	value: string | null | undefined;
	onChange?: (value: string) => void;
	className?: string;
	as?: 'input' | 'textarea';
	placeholder?: string;
	label?: string;
	textarea?: boolean;
	type?: string;
	displayFirst?: boolean;
}> = ({
	value,
	onChange,
	className,
	as: InputComponent = 'input',
	placeholder,
	label,
	type = 'text',
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	displayFirst = false,
	textarea = false,
}) => {
	const ref = useAutoSizeTextArea(value || placeholder || '', 64);

	if (textarea) {
		InputComponent = 'textarea';
	}
	return (
		<div className={className}>
			{label && (
				<label
					htmlFor={label}
					className="block text-sm font-medium leading-6 text-gray-900"
				>
					{label}
				</label>
			)}
			<div
				className={clsx(
					`
				mt-2
				relative block
				w-full
				shadow-sm rounded-md
				text-gray-900
				border border-gray-300 
				focus-within:ring-2 focus:ring-inset 
				focus-within:ring-indigo-600 
				focus-within:border-transparent
				sm:text-sm sm:leading-6`,
					{
						'min-h-10': textarea,
					},
				)}
			>
				<InputComponent
					id={label}
					value={value || ''}
					onChange={(e) => onChange?.(e.target.value)}
					placeholder={placeholder}
					type={type}
					rows={textarea ? 3 : undefined}
					className={clsx(
						`
						placeholder:text-gray-400
						outline outline-transparent
						py-1.5 px-2
           				block w-full
						sm:text-sm
						border-0 rounded-md`,
						{
							'min-h-10': textarea,
						},
					)}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					{...((InputComponent === 'textarea' ? { ref } : {}) as any)}
				/>
			</div>
		</div>
	);
};
