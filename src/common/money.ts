export const centsToPrice = (cents: number | undefined | null) => {
	return `${((cents || 0) / 100).toFixed(2)}`;
};

export const priceToCents = (price: string | undefined | null) => {
	if (!price) {
		return 0;
	}
	price = price.replace(',', '.').replace('€', '').trim();
	const [euro, cents] = price.split('.');

	// get leading two digits from cents
	const centsLeadingDigits = cents?.slice(0, 2) || '0';

	return (
		Number.parseInt(euro) * 100 + Number.parseInt(centsLeadingDigits || '0')
	);
};
