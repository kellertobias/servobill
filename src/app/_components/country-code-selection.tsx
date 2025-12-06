import type React from 'react';

import SelectInput from '@/components/select-input';

/**
 * List of ISO 3166-1 alpha-2 country codes (should match backend type).
 * Extend as needed for your use case.
 */
export const COUNTRY_CODES = [
	'DE',
	'US',
	'AT',
	'CH',
	'FR',
	'IT',
	'ES',
	'GB',
	'NL',
	'BE',
	'LU',
	'PL',
	'CZ',
	'SK',
	'HU',
	'DK',
	'SE',
	'NO',
	'FI',
	'IE',
	'PT',
	'GR',
	'RO',
	'BG',
	'HR',
	'SI',
	'EE',
	'LV',
	'LT',
	'CY',
	'MT',
	'LI',
	'IS',
	'MC',
	'SM',
	'VA',
	'RU',
	'UA',
	'BY',
	'MD',
	'GE',
	'AM',
	'AZ',
	'TR',
	'IL',
	'EG',
	'MA',
	'TN',
	'DZ',
	'ZA',
	'NG',
	'KE',
	'IN',
	'CN',
	'JP',
	'KR',
	'SG',
	'AU',
	'NZ',
	'BR',
	'AR',
	'CL',
	'MX',
	'CA',
	// ... add more as needed
];

/**
 * Props for CountryCodeSelection component.
 * Note: 'required' is not passed to SelectInput as it is not supported.
 */
export interface CountryCodeSelectionProps {
	/**
	 * The currently selected country code (ISO 3166-1 alpha-2).
	 */
	value?: string;
	/**
	 * Callback when the country code changes.
	 */
	onChange: (code: string) => void;
	/**
	 * Optional label for the select input.
	 */
	label?: string;
	/**
	 * Whether the field is required (for form validation/UI only).
	 */
	required?: boolean;
	/**
	 * Optional className for styling.
	 */
	className?: string;
}

/**
 * CountryCodeSelection
 *
 * A reusable dropdown/select for ISO 3166-1 alpha-2 country codes.
 * Uses the design system's SelectInput component for consistent UI.
 *
 * @param {CountryCodeSelectionProps} props
 * @returns {JSX.Element}
 */
export const CountryCodeSelection: React.FC<CountryCodeSelectionProps> = ({
	value,
	onChange,
	label = 'Country Code',
	// required is not passed to SelectInput
	className = '',
}) => {
	return (
		<SelectInput
			label={label}
			value={value || ''}
			// Accepts string | null, only call onChange if not null
			onChange={(val) => {
				if (val !== null) {
					onChange(val);
				}
			}}
			className={className}
			options={COUNTRY_CODES.map((code) => ({ value: code, label: code }))}
			placeholder="Select country code"
		/>
	);
};

/**
 * Usage example (Customer form):
 *
 * <CountryCodeSelection
 *   value={data.countryCode}
 *   onChange={code => setData(prev => ({ ...prev, countryCode: code }))}
 * />
 *
 * Usage example (Settings form):
 *
 * <CountryCodeSelection
 *   value={settings.companyData.countryCode}
 *   onChange={code => setSettings(prev => ({ ...prev, companyData: { ...prev.companyData, countryCode: code } }))}
 * />
 */
