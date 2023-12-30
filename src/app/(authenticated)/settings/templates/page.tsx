'use client';

import React from 'react';

import { PageContent } from '@/components/page';
import { useLoadData } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { LoadingSkeleton } from '@/components/loading';
import { NotFound } from '@/components/not-found';
import { Button } from '@/components/button';
import { doToast } from '@/components/toast';
import { Input } from '@/components/input';

import { backoff } from '@/common/exponential-backoff';

function TemplateSettings({
	data,
	onSave,
}: {
	data: {
		template: string;
		styles: string;
	};
	onSave: (data: { template: string; styles: string }) => void;
}) {
	const [template, setTemplate] = React.useState(data.template);
	const [styles, setStyles] = React.useState(data.styles);

	return (
		<div className="px-6 grid grid-cols-3 gap-6">
			<div>
				<label className="block text-sm font-medium leading-6 text-gray-900 mb-3">
					Instructions
				</label>

				<div className="prose prose-sm mb-6">
					<p>
						Here you can setup the invoice template. The template is rendered
						within the <code>&lt;body&gt;...&lt;/body&gt;</code> tags of an html
						document. The styles are rendered within the{' '}
						<code>&lt;style&gt;...&lt;/style&gt;</code> tags in the head section
						of the same html document.
					</p>
					<p>
						The syntax used is handlebars. You can use the following variables
						inside the template:
						<ul>
							<li>
								<code>{'{{company}}'}</code> In this scope you have access to
								the company object. You can access any property of the company
								object by using dot notation. For example{' '}
								<code>{'{{company.name}}'}</code> will render the company name.
								The following keys exist: <code>name</code>, <code>street</code>
								, <code>city</code>, <code>zip</code>, <code>phone</code>,{' '}
								<code>email</code>, <code>web</code>, <code>logo</code>,{' '}
								<code>taxId</code>, <code>vatId</code>,{' '}
								<code>bank.accountHolder</code>, <code>bank.iban</code>,{' '}
								<code>bank.bic</code>.
							</li>
							<li>
								<code>{'{{invoice}}'}</code> In this scope you have access to
								the invoice object. You can access any property of the invoice
								object by using dot notation. For example{' '}
								<code>{'{{invoice.invoiceNumber}}'}</code> will render the
								invoice number.
							</li>
							<li>
								<code>{'{{customer}}'}</code> In this scope you have access to
								the customer object. You can access any property of the customer
								object by using dot notation. For example{' '}
								<code>{'{{customer.name}}'}</code> will render the customer
								name. The following keys exist: <code>name</code>,{' '}
								<code>street</code>, <code>city</code>, <code>zip</code>,{' '}
								<code>taxId</code>, <code>vatId</code>.
							</li>
						</ul>
					</p>
					<p>
						Also you have the following helpers:
						<ul>
							<li>
								<code>{'{{date <field> <format>}}'}</code> Where {'<field>'} is
								the path to a field that holds a date and {'<format>'} is the
								format to use. For example{' '}
								<code>{'{{date invoice.invoicedAt "DD.MM.YYYY"}}'}</code> will
								render the invoicedAt date in the format DD.MM.YYYY.
							</li>
							<li>
								<code>{'{{nl2br <field>}}'}</code> Where {'<field>'} is the path
								to a field that holds text. This will make sure that newlines
								are converted to <code>{'<br />'}</code> tags.
							</li>
							<li>
								<code>{'{{foldmarks}}'}</code> Renders foldmarks for a german
								windowed envelope.
							</li>
							<li>
								<code>{'{{#withTax}}...{{/withTax}}'}</code> can be used to wrap
								parts of the HTML that is only required if the invoice has at
								least one item with a tax rate higher than 0%
							</li>
							<li>
								<code>{'{{#ifInvoice}}...{{/ifInvoice}}'}</code> and{' '}
								<code>{'{{#ifOffer}}...{{/ifOffer}}'}</code> can be used to wrap
								parts of the HTML that should be only shown on invoices or
								offers.
							</li>
						</ul>
					</p>
					<p>
						If you want to preview your template as HTML, you can clone the
						repository and run the following command:
						<pre className="bg-gray-100 p-3 rounded-md text-sm text-slate-800">
							<span className="text-slate-400">#!/bin/bash</span>
							<br />
							npm ci
							<br />
							npm run template
							<br />
							<br />
							<span className="text-slate-400">
								# Now open your browser at http://localhost:2998
								<br />
								# And edit the files
								<br /># invoice-template-example.{'{html,css}'}
							</span>
						</pre>
					</p>
				</div>
			</div>
			<div className="col-span-2">
				<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
					HTML Template (Body)
				</label>
				<Input
					value={template}
					textarea
					placeholder="Your HTML Template goes here"
					onChange={(data) => setTemplate(data)}
					className="mb-3"
				/>

				<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
					Styles (CSS)
				</label>
				<Input
					value={styles}
					textarea
					placeholder="Your CSS Styles go here"
					onChange={(data) => setStyles(data)}
					className="mb-3"
				/>

				<div className="flex justify-end gap-2 p-3 fixed bottom-0 left-0 right-0 bg-gray-900/95 shadow border-t border-t-gray-300/50">
					<Button
						primary
						header
						onClick={() => onSave({ template, styles })}
						disabled={data.template === template && data.styles === styles}
					>
						Save
					</Button>

					<Button
						secondary
						onClick={async () => {
							doToast({
								promise: (async () => {
									const url = await API.query({
										query: gql(`
										mutation TestRenderTemplatePDF($template: String!, $styles: String!) {
											testRenderTemplate(template: $template, styles: $styles, pdf: true)
										}
									`),
										variables: {
											template,
											styles,
										},
									}).then((res) => res.testRenderTemplate);
									// Wait 5 seconds for the page to be available
									await new Promise((resolve) => setTimeout(resolve, 5000));

									await backoff(
										async () => {
											// Wait for page to be available
											const res = await fetch(url);
											if (res.status !== 200) {
												return null;
											}

											// Download the file
											const blob = await res.blob();
											const a = document.createElement('a');
											a.href = URL.createObjectURL(blob);
											a.download = 'preview.pdf';
											a.click();
											return url;
										},
										{
											delay: 2000,
										},
									);
								})(),
								loading: 'Generating PDF Preview',
								success: 'Done',
								error: 'Failed to generate PDF preview',
							});
						}}
					>
						PDF Preview
					</Button>
				</div>
			</div>
		</div>
	);
}

export default function TemplateHomePage() {
	const { data, loading, reload } = useLoadData(async () => {
		const data = await API.query({
			query: gql(`
					query GetTemplateSettings {
						template {
							pdfTemplate
							pdfStyles
						}
					}
				`),
		}).then((res) => ({
			template: res.template.pdfTemplate,
			styles: res.template.pdfStyles,
		}));
		return data;
	});

	if (loading || !data) {
		return (
			<PageContent
				title="Settings - PDF Template"
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
				title="Settings - PDF Template"
				noPadding
				contentClassName="overflow-hidden pt-6"
				fullWidth
			>
				<TemplateSettings
					data={data}
					onSave={(data) => {
						doToast({
							promise: (async () => {
								await API.query({
									query: gql(`
										mutation UpdateTemplate($settings: InvoiceTemplateInput!) {
											updateTemplate(data: $settings) {
												pdfTemplate
											}
										}
									`),
									variables: {
										settings: {
											pdfTemplate: data.template,
											pdfStyles: data.styles,
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
				/>
			</PageContent>
		</>
	);
}
