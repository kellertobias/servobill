import React from 'react';

/**
 * SelectInput component for dropdown selects, styled to match the Input component.
 *
 * Props:
 * - value: currently selected value (string or null)
 * - onChange: callback when a new value is selected
 * - options: array of { value: string, label: string, description?: string }
 * - className: optional additional class names
 * - label: optional label for the select
 * - placeholder: optional placeholder for the select
 */
const SelectInput: React.FC<{
	value: string | null | undefined;
	onChange?: (value: string) => void;
	options: { value: string; label: string; description?: string }[];
	className?: string;
	label?: string;
	placeholder?: string;
}> = ({ value, onChange, options, className, label, placeholder = '' }) => {
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
				className="
          mt-2
          relative block
          w-full
          shadow-sm rounded-md
          text-gray-900
          border border-gray-300
          focus-within:ring-2 focus:ring-inset
          focus-within:ring-indigo-600
          focus-within:border-transparent
          sm:text-sm sm:leading-6"
			>
				<select
					id={label}
					value={value || ''}
					onChange={(e) => onChange?.(e.target.value)}
					className="
            placeholder:text-gray-400
            outline outline-transparent
            py-1.5 px-2
            block w-full
            sm:text-sm
            border-0 rounded-md
            bg-white
            appearance-none
            focus:ring-0
          "
				>
					{placeholder && <option value="">{placeholder}</option>}
					{options.map((opt) => (
						<option
							key={opt.value}
							value={opt.value}
							title={opt.description || opt.label}
						>
							{opt.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};

export default SelectInput;
