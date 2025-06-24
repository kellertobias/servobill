export const centsToPrice = (cents: number | undefined | null) => {
	return `${((cents || 0) / 100).toFixed(2)}`;
};

export const priceToCents = (price: string | undefined | null) => {
	if (!price) {
		return 0;
	}
	price = price.replace(',', '.').replace('€', '').trim();

	// count dots. if there is more than one, return NaN
	const dotCount = (price.match(/\./g) || []).length;
	if (dotCount > 1) {
		return Number.NaN;
	}

	const [euro, cents] = price.split('.');

	// get leading two digits from cents
	const centsLeadingDigits = cents?.slice(0, 2) || '00';

	// fill up cents with trailing zeros
	const centsTrailingZeros = centsLeadingDigits.padEnd(2, '0');

	const euroInt = Number.parseInt(euro);
	const sign = euroInt < 0 ? -1 : 1;
	const euroIntAbs = Math.abs(euroInt);

	return sign * (euroIntAbs * 100 + Number.parseInt(centsTrailingZeros || '0'));
};
