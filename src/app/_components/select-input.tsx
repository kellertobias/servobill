import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, XCircleIcon } from '@heroicons/react/20/solid';
import type React from 'react';
import { Fragment } from 'react';

/**
 * SelectInput component for dropdown selects, styled to match the Input component using Tailwind and Headless UI.
 *
 * Props:
 * - value: currently selected value (string or null)
 * - onChange: callback when a new value is selected
 * - options: array of { value: string; label: string; description?: string, color?: string }
 *   - color: optional, if provided, a colored dot will be shown left of the label
 * - className: optional additional class names
 * - label: optional label for the select
 * - placeholder: optional placeholder for the select
 */
const SelectInput: React.FC<{
  value: string | null | undefined;
  onChange?: (value: string | null) => void;
  options: {
    value: string;
    label: string;
    description?: string;
    color?: string;
  }[];
  className?: string;
  label?: string;
  placeholder?: string;
  clearable?: boolean; // Whether to show a clear (x) button when an option is selected
}> = ({ value, onChange, options, className, label, placeholder = '', clearable = true }) => {
  // Find the selected option object based on value
  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Handle selection change
  const handleChange = (option: {
    value: string;
    label: string;
    description?: string;
    color?: string;
  }) => {
    onChange?.(option.value);
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
  };

  return (
    <div className={className}>
      {/* Optional label for accessibility */}
      {label && (
        <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">{label}</label>
      )}
      <Listbox value={selectedOption || null} onChange={handleChange} by="value">
        <div className="relative mt-2">
          {/* Button that shows the selected value */}
          <Listbox.Button className="relative w-full cursor-pointer rounded-md bg-white border border-gray-300 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm flex items-center">
            {/* Show colored dot if selected option has color */}
            {selectedOption?.color && (
              <span
                className="inline-block w-3 h-3 rounded-full align-middle mr-2"
                style={{ backgroundColor: selectedOption.color }}
                aria-label="Color dot"
              />
            )}
            {/* Show placeholder with placeholder style if no option is selected */}
            <span
              className={`block truncate flex-1 ${
                selectedOption ? '' : 'text-gray-400'
              } ${selectedOption?.color ? '' : ''}`}
            >
              {selectedOption ? selectedOption.label : placeholder || 'Select...'}
            </span>
            {/* Show clear (x) button if a value is selected */}
            {selectedOption && clearable && (
              <span
                className="flex items-center absolute right-8 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                onClick={handleClear}
                tabIndex={-1}
                aria-label="Clear selection"
                role="button"
              >
                <XCircleIcon className="h-5 w-5 text-gray-300 hover:text-gray-500 transition-colors" />
              </span>
            )}
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          {/* Dropdown options with transition */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt}
                  className={({ active }) =>
                    `relative select-none py-2 pr-10 cursor-pointer ${
                      opt.color ? 'pl-4' : 'pl-4'
                    } ${active ? 'bg-indigo-600 text-white' : 'text-gray-900'}`
                  }
                >
                  {({ selected, active }) => {
                    return (
                      <>
                        <div className="flex items-center">
                          {/* Colored dot if color is provided */}
                          {opt.color && (
                            <span
                              className="inline-block w-3 h-3 rounded-full align-middle mr-2"
                              style={{ backgroundColor: opt.color }}
                              aria-label="Color dot"
                            />
                          )}
                          <span
                            className={`block truncate ${
                              selected ? 'font-semibold' : 'font-normal'
                            } ${opt.color ? '' : ''}`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        {/* Option description, if present */}
                        {opt.description && (
                          <span
                            className={`block text-xs ${
                              active ? 'text-indigo-200' : 'text-gray-500'
                            }`}
                          >
                            {opt.description}
                          </span>
                        )}
                        {/* Checkmark for selected option, now on the right */}
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                              active ? 'text-white' : 'text-indigo-600'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    );
                  }}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default SelectInput;
