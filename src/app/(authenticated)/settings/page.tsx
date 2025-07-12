'use client';

import React from 'react';

import useDebouncedMemo from '@sevenoutman/use-debounced-memo';

import { PageContent } from '@/components/page';
import { useHasChanges, useLoadData } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { Input } from '@/components/input';
import { LoadingSkeleton } from '@/components/loading';
import { NotFound } from '@/components/not-found';
import { Button } from '@/components/button';
import { doToast } from '@/components/toast';
import { exportSettings, importSettings } from '@/api/import-export/settings';
import { SettingsBlock } from '@/components/settings-block';
import { CountryCodeSelection } from '@/components/country-code-selection';

import SelectInput from '@/app/_components/select-input';

import { Numbering } from '@/common/numbers';
import { VatStatus } from '@/common/gql/graphql';

function NumberValidity({
	template,
	number,
}: {
	template?: string;
	number?: string;
}) {
	const nextNumberValidity = useDebouncedMemo(
		() => (template && number ? Numbering.parseNumber(template, number) : null),
		[template, number],
		500,
	);

	return nextNumberValidity === null ? (
		<div className="text-xs text-red-500/80 ">
			The next number is not valid for the template
		</div>
	) : (
		<div className="text-xs text-gray-500/80 ">
			The next number is valid for the template. Parsed Parts:
			<ul>
				{Object.entries(nextNumberValidity).map(([key, value]) => (
					<li key={key}>
						<code>{key}</code>: {value}
					</li>
				))}
			</ul>
		</div>
	);
}

export default function SettingsHomePage() {
	const { data, setData, initialData, loading, reload } = useLoadData(
		async () => {
			const res = await API.query({
				query: gql(`
					query GetSettings {
						settings {
							invoiceNumbersTemplate
							invoiceNumbersIncrementTemplate
							invoiceNumbersLast
							offerNumbersTemplate
							offerNumbersIncrementTemplate
							offerNumbersLast
							customerNumbersTemplate
							customerNumbersIncrementTemplate
							customerNumbersLast
							emailTemplate
							emailSubjectInvoices
							emailSubjectOffers
							emailSubjectReminder
							emailSubjectWarning
							invoiceCompanyLogo
							emailCompanyLogo
							sendFrom
							replyTo
							offerValidityDays
							defaultInvoiceDueDays
							defaultInvoiceFooterText
							company {
								name
								street
								zip
								city
								taxId
								vatId
								email
								phone
								web
								bankAccountHolder
								bankIban
								bankBic
								countryCode
								vatStatus
							}
							currency
							invoiceOutputFormat
						}
					}
				`),
			});

			return {
				...res.settings,
				company: undefined,
				defaultInvoiceDueDays: String(res.settings.defaultInvoiceDueDays),
				offerValidityDays: String(res.settings.offerValidityDays),
				companyName: res.settings.company?.name || '',
				companyStreet: res.settings.company?.street || '',
				companyZip: res.settings.company?.zip || '',
				companyCity: res.settings.company?.city || '',
				companyTaxId: res.settings.company?.taxId || '',
				companyVatId: res.settings.company?.vatId || '',
				companyEmail: res.settings.company?.email || '',
				companyPhone: res.settings.company?.phone || '',
				companyWeb: res.settings.company?.web || '',
				companyBankAccountHolder: res.settings.company?.bankAccountHolder || '',
				companyBankIban: res.settings.company?.bankIban || '',
				companyBankBic: res.settings.company?.bankBic || '',
				companyCountryCode: res.settings.company?.countryCode || 'DE',
				vatStatus: res.settings.company?.vatStatus || VatStatus.VatEnabled,
				currency: res.settings.currency || 'EUR',
				invoiceOutputFormat: res.settings.invoiceOutputFormat || 'PDF',
			};
		},
	);

	const hasChanges = useHasChanges(initialData, data);

	if (loading || !data) {
		return (
			<PageContent
				title="Settings"
				noPadding
				contentClassName="overflow-hidden pt-6"
			>
				{loading ? (
					<LoadingSkeleton />
				) : (
					<NotFound
						title="No Settings"
						subtitle="There are no results to show"
					/>
				)}
			</PageContent>
		);
	}

	return (
		<>
			<PageContent
				title="Settings"
				noPadding
				contentClassName="overflow-hidden pt-6"
				footer={
					<>
						<div className="flex justify-center mt-6 gap-1 text-gray-500 text-xs">
							<a
								className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
								onClick={async () => {
									await importSettings();

									reload();
								}}
							>
								Import from JSON
							</a>{' '}
							&bull;{' '}
							<a
								className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
								onClick={async () => {
									await exportSettings();
								}}
							>
								Export to JSON
							</a>
						</div>
					</>
				}
			>
				<div className="space-y-12 p-6 pt-0 divide-y divide-gray-900/10">
					<SettingsBlock
						title="Company Details"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								These company details can be used in the invoice and email
								templates.
							</div>
						}
					>
						<Input
							label="Company Name"
							value={data?.companyName}
							placeholder="Cool Stuff Inc."
							onChange={(companyName) => {
								setData((current) => ({
									...current,
									companyName,
								}));
							}}
						/>
						<Input
							label="Street"
							value={data?.companyStreet}
							placeholder="123 Main Street"
							onChange={(companyStreet) => {
								setData((current) => ({
									...current,
									companyStreet,
								}));
							}}
						/>
						<Input
							label="ZIP"
							value={data?.companyZip}
							placeholder="12345"
							onChange={(companyZip) => {
								setData((current) => ({
									...current,
									companyZip,
								}));
							}}
						/>
						<Input
							label="City"
							value={data?.companyCity}
							placeholder="Berlin"
							onChange={(companyCity) => {
								setData((current) => ({
									...current,
									companyCity,
								}));
							}}
						/>
						<Input
							label="E-Mail"
							value={data?.companyEmail}
							placeholder="you@company.com"
							onChange={(companyEmail) => {
								setData((current) => ({
									...current,
									companyEmail,
								}));
							}}
						/>
						<Input
							label="Phone"
							value={data?.companyPhone}
							placeholder="+49 123 456789"
							onChange={(companyPhone) => {
								setData((current) => ({
									...current,
									companyPhone,
								}));
							}}
						/>
						<Input
							label="Web"
							value={data?.companyWeb}
							placeholder="https://company.com"
							onChange={(companyWeb) => {
								setData((current) => ({
									...current,
									companyWeb,
								}));
							}}
						/>
						<SelectInput
							label="Currency"
							value={data?.currency || 'EUR'}
							onChange={(currency: string | null) => {
								setData((current) => ({
									...current,
									currency: currency || 'EUR',
								}));
							}}
							options={[
								{ value: 'EUR', label: 'Euro (EUR)' },
								{ value: 'USD', label: 'US Dollar (USD)' },
								{ value: 'GBP', label: 'British Pound (GBP)' },
								{ value: 'CHF', label: 'Swiss Franc (CHF)' },
								{ value: 'JPY', label: 'Japanese Yen (JPY)' },
								{ value: 'AUD', label: 'Australian Dollar (AUD)' },
								{ value: 'CAD', label: 'Canadian Dollar (CAD)' },
							]}
							className="w-full"
						/>
						<CountryCodeSelection
							value={data?.companyCountryCode || 'DE'}
							onChange={(code) =>
								setData((prev) => ({ ...prev, countryCode: code }))
							}
							className="col-span-3"
						/>
					</SettingsBlock>
					<SettingsBlock
						title="Company Bank & Tax Details"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								These company details can be used in the invoice and email
								templates.
							</div>
						}
					>
						{/* VAT/tax status selector */}
						{/*
							This select allows the user to specify the VAT/tax status of the company.
							- VAT Enabled: Standard VAT applies, invoices include VAT.
							- VAT Disabled (Kleinunternehmerregelung § 19 UStG): For small businesses in Germany exempt from VAT.
							- VAT Disabled (Other): For other legal reasons (e.g., non-profit, foreign entity).
						*/}
						<SelectInput
							label="VAT/Tax Status"
							value={data?.vatStatus || VatStatus.VatEnabled}
							onChange={(vatStatus: string | null) => {
								setData((current) => ({
									...current,
									vatStatus: (vatStatus || VatStatus.VatEnabled) as VatStatus,
								}));
							}}
							options={[
								{
									value: VatStatus.VatEnabled,
									label: 'VAT Enabled',
									description:
										'Invoices include VAT. Standard for most businesses.',
								},
								{
									value: VatStatus.VatDisabledKleinunternehmer,
									label: 'VAT Disabled (Kleinunternehmerregelung § 19 UStG)',
									description:
										'Small business exemption (Germany). No VAT on invoices.',
								},
								{
									value: VatStatus.VatDisabledOther,
									label: 'VAT Disabled (Other)',
									description:
										'No VAT for other legal reasons (e.g., non-profit, foreign entity).',
								},
							]}
							className="w-full"
						/>
						<Input
							label="Tax ID"
							value={data?.companyTaxId}
							placeholder="DE123456789"
							onChange={(companyTaxId) => {
								setData((current) => ({
									...current,
									companyTaxId,
								}));
							}}
						/>
						<Input
							label="VAT ID"
							value={data?.companyVatId}
							placeholder="DE123456789"
							onChange={(companyVatId) => {
								setData((current) => ({
									...current,
									companyVatId,
								}));
							}}
						/>
						<Input
							label="Bank Account Holder"
							value={data?.companyBankAccountHolder}
							placeholder="Cool Stuff Inc."
							onChange={(companyBankAccountHolder) => {
								setData((current) => ({
									...current,
									companyBankAccountHolder,
								}));
							}}
						/>
						<Input
							label="Bank IBAN"
							value={data?.companyBankIban}
							placeholder="DE123456789"
							onChange={(companyBankIban) => {
								setData((current) => ({
									...current,
									companyBankIban,
								}));
							}}
						/>
						<Input
							label="Bank BIC"
							value={data?.companyBankBic}
							placeholder="MYBANKBIC"
							onChange={(companyBankBic) => {
								setData((current) => ({
									...current,
									companyBankBic,
								}));
							}}
						/>
					</SettingsBlock>
					<SettingsBlock
						title="Invoice Numbers"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Define how your invoice numbers increase. You need to set a
								Template which is used to generate the invoice number. The
								template can contain the following placeholders:
								<ul>
									<li>
										<code>YY</code> or <code>YYYY</code> for the current year
									</li>
									<li>
										<code>MM</code> for the current month
									</li>
									<li>
										<code>DD</code> for the current day of month
									</li>
									<li>
										<code>####</code> for the current number
									</li>
								</ul>
								You can also define a separate template for the incrementing
								number. This is useful if you e.g. increasing numbers per year,
								but want to reset the number every year, while having the month
								and day in the invoice number.
							</div>
						}
					>
						<Input
							label="Template"
							value={data?.invoiceNumbersTemplate}
							placeholder="INV-YYMM-####"
							onChange={(invoiceNumbersTemplate) => {
								setData((current) => ({
									...current,
									invoiceNumbersTemplate,
								}));
							}}
						/>
						<p className="text-xs text-gray-500/80">
							An example number for the template above would be{' '}
							<code>
								{Numbering.makeNumber(
									data?.invoiceNumbersTemplate || 'INV-YYMM-####',
									42,
								)}
							</code>
							.
						</p>
						<Input
							label="Increment Template"
							value={data?.invoiceNumbersIncrementTemplate}
							placeholder="INV-YY-####"
							onChange={(invoiceNumbersIncrementTemplate) => {
								setData((current) => ({
									...current,
									invoiceNumbersIncrementTemplate,
								}));
							}}
						/>
						<p className="text-xs text-gray-500/80 ">
							We search for the highest invoice number matching the template and
							increment it by one. If there is no invoice number yet, we start
							with 1.
						</p>
						<Input
							label="Last used Number"
							value={data?.invoiceNumbersLast}
							placeholder="INV-YY-####"
							onChange={(invoiceNumbersLast) => {
								setData((current) => ({
									...current,
									invoiceNumbersLast,
								}));
							}}
						/>
						<NumberValidity
							template={data?.invoiceNumbersTemplate || ''}
							number={data?.invoiceNumbersLast || ''}
						/>
					</SettingsBlock>
					<SettingsBlock
						title="Offer Numbers"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Define how your offer numbers increase. Works the same as
								invoice numbers, but has a separate template and next number.
							</div>
						}
					>
						<Input
							label="Template"
							value={data?.offerNumbersTemplate}
							placeholder="OFF-YYMM-####"
							onChange={(offerNumbersTemplate) => {
								setData((current) => ({
									...current,
									offerNumbersTemplate,
								}));
							}}
						/>
						<p className="text-xs text-gray-500/80 ">
							An example number for the template above would be{' '}
							<code>
								{Numbering.makeNumber(
									data?.offerNumbersTemplate || 'OFF-YYMM-####',
									21,
								)}
							</code>
							.
						</p>
						<Input
							label="Increment Template"
							value={data?.offerNumbersIncrementTemplate}
							placeholder="OFF-YY-####"
							onChange={(offerNumbersIncrementTemplate) => {
								setData((current) => ({
									...current,
									offerNumbersIncrementTemplate,
								}));
							}}
						/>
						<Input
							label="Last used Number"
							value={data?.offerNumbersLast}
							placeholder="OFF-YY-####"
							onChange={(offerNumbersLast) => {
								setData((current) => ({
									...current,
									offerNumbersLast,
								}));
							}}
						/>
						<NumberValidity
							template={data?.offerNumbersTemplate || ''}
							number={data?.offerNumbersLast || ''}
						/>
					</SettingsBlock>
					<SettingsBlock
						title="Customer Numbers"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Define how your customer numbers increase. Works the same as
								invoice numbers, but has a separate template and next number.
							</div>
						}
					>
						<Input
							label="Template"
							value={data?.customerNumbersTemplate}
							placeholder="CUS-YYMM-####"
							onChange={(customerNumbersTemplate) => {
								setData((current) => ({
									...current,
									customerNumbersTemplate,
								}));
							}}
						/>
						<p className="text-xs text-gray-500/80 ">
							An example number for the template above would be{' '}
							<code>
								{Numbering.makeNumber(
									data?.customerNumbersTemplate || 'CUS-YYMM-####',
									42,
								)}
							</code>
							.
						</p>
						<Input
							label="Increment Template"
							value={data?.customerNumbersIncrementTemplate}
							placeholder="CUS-YY-####"
							onChange={(customerNumbersIncrementTemplate) => {
								setData((current) => ({
									...current,
									customerNumbersIncrementTemplate,
								}));
							}}
						/>
						<Input
							label="Last used Number"
							value={data?.customerNumbersLast}
							placeholder="CUS-YY-####"
							onChange={(customerNumbersLast) => {
								setData((current) => ({
									...current,
									customerNumbersLast,
								}));
							}}
						/>
						<NumberValidity
							template={data?.customerNumbersTemplate || ''}
							number={data?.customerNumbersLast || ''}
						/>
					</SettingsBlock>
					<SettingsBlock
						title="Invoice Settings"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Here you can setup defaults for your invoices
							</div>
						}
					>
						<Input
							label="Default Invoice Due Days"
							value={data?.defaultInvoiceDueDays}
							placeholder="...Days after invoice date"
							onChange={(defaultInvoiceDueDays) => {
								setData((current) => ({
									...current,
									defaultInvoiceDueDays,
								}));
							}}
						/>
						<Input
							label="How long are offers valid?"
							value={data?.offerValidityDays}
							placeholder="...days after offer date"
							onChange={(offerValidityDays) => {
								setData((current) => ({
									...current,
									offerValidityDays,
								}));
							}}
						/>

						<Input
							textarea
							label="This text is added as the default footer of every invoice"
							value={data?.defaultInvoiceFooterText}
							placeholder="Default Footer Text"
							onChange={(defaultInvoiceFooterText) => {
								setData((current) => ({
									...current,
									defaultInvoiceFooterText,
								}));
							}}
						/>
						<SelectInput
							label="Invoice Output Format"
							value={data?.invoiceOutputFormat || 'PDF'}
							onChange={(invoiceOutputFormat: string | null) => {
								setData((current) => ({
									...current,
									invoiceOutputFormat: invoiceOutputFormat || 'PDF',
								}));
							}}
							options={[
								{ value: 'PDF', label: 'PDF (Standard)' },
								{ value: 'ZUGFERD', label: 'ZUGFeRD' },
								{
									value: 'XRECHNUNG_PDF',
									label: 'XRechnung + PDF',
								},
								{
									value: 'XRECHNUNG',
									label: 'XRechnung (XML Only)',
								},
							]}
							className="w-full"
						/>
					</SettingsBlock>
					<SettingsBlock
						title="Logo URLs"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								These URLs are used in the invoice and email templates.
							</div>
						}
					>
						<Input
							label="Invoice Logo URL"
							value={data?.invoiceCompanyLogo}
							placeholder="https://..."
							onChange={(invoiceCompanyLogo) => {
								setData((current) => ({
									...current,
									invoiceCompanyLogo,
								}));
							}}
						/>
						<Input
							label="E-Mail Logo URL"
							value={data?.emailCompanyLogo}
							placeholder="https://..."
							onChange={(emailCompanyLogo) => {
								setData((current) => ({
									...current,
									emailCompanyLogo,
								}));
							}}
						/>
					</SettingsBlock>
					<SettingsBlock
						title="E-Mail Sending"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Define the E-Mail address we will send invoices, offers and
								reminders from. You can also define a reply to address.
							</div>
						}
					>
						<Input
							label="Send invoices from"
							value={data?.sendFrom}
							placeholder="billing@your-company.com"
							onChange={(sendFrom) => {
								setData((current) => ({
									...current,
									sendFrom,
								}));
							}}
						/>
						<Input
							label="Reply To on Invoice Mails"
							value={data?.replyTo}
							placeholder="billing@your-company.com"
							onChange={(replyTo) => {
								setData((current) => ({
									...current,
									replyTo,
								}));
							}}
						/>
					</SettingsBlock>
					<SettingsBlock
						title="E-Mail Templates"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Here you can define the templates for the E-Mails we send.
								Placeholders will be replaced using handlebars. You can use the
								following placeholders in the subject and body:
								<ul>
									<li>
										<code>{'{{number}}'}</code> Invoice or Offer number
									</li>
									<li>
										<code>{'{{total}}'}</code> The total amount of the invoice
									</li>
									<li>
										<code>{'{{date}}'}</code> The Offer or Invoice date
									</li>
									<li>
										<code>{'{{due}}'}</code> Invoice or Offer due date
									</li>
									<li>
										<code>{'{{name}}'}</code> Customer Contact Name
									</li>
								</ul>
								In the body you can also use the following helpers:
								<ul>
									<li>
										<code>{'{{#if type}}...{{/if}}'}</code> This block will be
										shown for the type of email. You can use the following
										types: <code>invoice</code>, <code>offer</code>,{' '}
										<code>reminder</code>, <code>warning</code>
									</li>
								</ul>
							</div>
						}
					>
						<Input
							label="Offer Subject"
							value={data?.emailSubjectOffers}
							placeholder="Your offer {{number}} is ready"
							onChange={(emailSubjectOffers) => {
								setData((current) => ({
									...current,
									emailSubjectOffers,
								}));
							}}
						/>
						<Input
							label="Invoice Subject"
							value={data?.emailSubjectInvoices}
							placeholder="Here is your invoice {{number}}"
							onChange={(emailSubjectInvoices) => {
								setData((current) => ({
									...current,
									emailSubjectInvoices,
								}));
							}}
						/>
						<Input
							label="Reminder Subject"
							value={data?.emailSubjectReminder}
							placeholder="We haven't received your payment for {{number}} yet"
							onChange={(emailSubjectReminder) => {
								setData((current) => ({
									...current,
									emailSubjectReminder,
								}));
							}}
						/>
						<Input
							label="Warning Subject"
							value={data?.emailSubjectWarning}
							placeholder="Your invoice {{number}} is overdue"
							onChange={(emailSubjectWarning) => {
								setData((current) => ({
									...current,
									emailSubjectWarning,
								}));
							}}
						/>

						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							E-Mail-Template
						</label>
						<Input
							textarea
							value={data?.emailTemplate}
							placeholder="Your HTML Template goes here"
							onChange={(emailTemplate) =>
								setData((current) => ({
									...current,
									emailTemplate,
								}))
							}
						/>

						<div>
							<label className="text-sm font-medium leading-6 text-gray-900 hidden md:block mb-3">
								Manage PDF Template
							</label>
							<Button secondary href="/settings/templates">
								Open PDF Template
							</Button>
						</div>
					</SettingsBlock>
					<SettingsBlock
						title="Categories"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Manage the categories used for expenses and products. You can
								add, edit, or remove categories here.
							</div>
						}
					>
						<div>
							<Button secondary href="/settings/categories">
								Manage Categories
							</Button>
						</div>
					</SettingsBlock>
					<SettingsBlock
						title="Danger Zone"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Here you can delete all your data or reset your database.
							</div>
						}
					>
						<div>
							<Button danger href="/settings/danger-zone">
								Go to Danger Zone
							</Button>
						</div>
					</SettingsBlock>
				</div>
				<div className="flex justify-start px-6 pb-6">
					<Button
						primary
						onClick={() => {
							doToast({
								promise: (async () => {
									await API.query({
										query: gql(`
											mutation UpdateSettings($settings: SettingsInput!) {
												updateSettings(data: $settings) {
													replyTo
												}
											}
										`),
										variables: {
											settings: {
												company: {
													name: data.companyName || '',
													street: data.companyStreet || '',
													zip: data.companyZip || '',
													city: data.companyCity || '',
													taxId: data.companyTaxId || '',
													vatId: data.companyVatId || '',
													email: data.companyEmail || '',
													phone: data.companyPhone || '',
													web: data.companyWeb || '',
													bankAccountHolder:
														data.companyBankAccountHolder || '',
													bankIban: data.companyBankIban || '',
													bankBic: data.companyBankBic || '',
													countryCode: data.companyCountryCode || 'DE',
													// Add VAT/tax status to mutation payload
													vatStatus: data.vatStatus || 'VAT_ENABLED',
												},
												defaultInvoiceDueDays: Number(
													data.defaultInvoiceDueDays || '0',
												),
												offerValidityDays: Number(
													data.offerValidityDays || '0',
												),
												invoiceNumbersTemplate: data.invoiceNumbersTemplate,
												invoiceNumbersIncrementTemplate:
													data.invoiceNumbersIncrementTemplate,
												invoiceNumbersLast: data.invoiceNumbersLast,
												offerNumbersTemplate: data.offerNumbersTemplate,
												offerNumbersIncrementTemplate:
													data.offerNumbersIncrementTemplate,
												offerNumbersLast: data.offerNumbersLast,
												customerNumbersTemplate: data.customerNumbersTemplate,
												customerNumbersIncrementTemplate:
													data.customerNumbersIncrementTemplate,
												customerNumbersLast: data.customerNumbersLast,
												emailTemplate: data.emailTemplate,
												emailSubjectInvoices: data.emailSubjectInvoices,
												emailSubjectOffers: data.emailSubjectOffers,
												emailSubjectReminder: data.emailSubjectReminder,
												emailSubjectWarning: data.emailSubjectWarning,
												sendFrom: data.sendFrom,
												replyTo: data.replyTo,
												invoiceCompanyLogo: data.invoiceCompanyLogo || '',
												emailCompanyLogo: data.emailCompanyLogo || '',
												defaultInvoiceFooterText: data.defaultInvoiceFooterText,
												currency: data.currency,
												invoiceOutputFormat: data.invoiceOutputFormat || 'PDF',
											},
										},
									});
									reload();
								})(),
								loading: 'Saving settings',
								success: 'Settings saved',
								error: 'Failed to save settings',
							});
						}}
						disabled={!hasChanges}
					>
						Save
					</Button>
				</div>
			</PageContent>
		</>
	);
}
