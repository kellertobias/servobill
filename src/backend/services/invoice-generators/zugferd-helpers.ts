import { VatStatus } from '@/backend/entities/settings.entity';

export const getVatInfo = (vatStatus: VatStatus) => {
	const isVatDisabled =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER ||
		vatStatus === VatStatus.VAT_DISABLED_OTHER;

	const exemptionReason =
		vatStatus === VatStatus.VAT_DISABLED_KLEINUNTERNEHMER
			? 'Kleinunternehmerregelung § 19 UStG'
			: vatStatus === VatStatus.VAT_DISABLED_OTHER
				? 'VAT Exempt (Other Reason)'
				: undefined;

	return {
		isVatDisabled,
		exemptionReason: isVatDisabled
			? { exemptionReasonText: exemptionReason }
			: {},
	};
};
