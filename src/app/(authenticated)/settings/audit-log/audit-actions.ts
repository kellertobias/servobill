/**
 * Readable names for the actions stored in the audit log. Mutations are
 * logged with their GraphQL name, sign in events with an `auth.` prefix.
 */
const ACTION_LABELS: Record<string, string> = {
	// Sign in
	'auth.login': 'Signed in',
	'auth.login_failed': 'Sign in failed',
	'auth.login_locked': 'Sign in refused: too many failed attempts',
	'auth.logout': 'Signed out',

	// Users and own account
	createUser: 'Added user',
	updateUser: 'Changed user',
	deleteUser: 'Deleted user',
	setUserPassword: "Changed a user's password",
	changeOwnPassword: 'Changed own password',
	setOwnProfilePicture: 'Changed own profile picture',
	removeOwnProfilePicture: 'Removed own profile picture',

	// Invoices and offers
	createInvoice: 'Created invoice',
	updateInvoice: 'Changed invoice',
	copyInvoice: 'Copied invoice',
	deleteInvoice: 'Deleted invoice',
	invoiceDeleteDraft: 'Deleted invoice draft',
	invoiceSend: 'Sent invoice',
	cancelScheduledInvoiceSend: 'Cancelled scheduled sending',
	invoiceAddPayment: 'Recorded payment',
	invoiceCancelUnpaid: 'Cancelled unpaid invoice',
	invoiceAddComment: 'Commented on invoice',
	invoicePdf: 'Created invoice PDF',
	importInvoices: 'Imported invoices',
	purgeInvoices: 'Deleted all invoices',
	deleteInvoiceAttachmentActivity: 'Removed attachment from invoice',
	setInvoiceActivityAttachmentEmailFlag: 'Changed email attachment setting',

	// Customers and products
	createCustomer: 'Added customer',
	updateCustomer: 'Changed customer',
	deleteCustomer: 'Deleted customer',
	createProduct: 'Added product',
	updateProduct: 'Changed product',
	deleteProduct: 'Deleted product',

	// Expenses and receipts
	createExpense: 'Added expense',
	updateExpense: 'Changed expense',
	deleteExpense: 'Deleted expense',
	purgeExpenses: 'Deleted all expenses',
	extractReceipt: 'Imported receipt',

	// Files
	requestUpload: 'Started file upload',
	confirmUpload: 'Uploaded file',
	attachUpload: 'Attached file',
	deleteAttachment: 'Deleted file',

	// Inventory
	createInventoryItem: 'Added inventory item',
	updateInventoryItem: 'Changed inventory item',
	deleteInventoryItem: 'Deleted inventory item',
	createInventoryType: 'Added inventory type',
	updateInventoryType: 'Changed inventory type',
	deleteInventoryType: 'Deleted inventory type',
	createInventoryLocation: 'Added inventory location',
	updateInventoryLocation: 'Changed inventory location',
	deleteInventoryLocation: 'Deleted inventory location',
	addInventoryCheck: 'Recorded inventory check',
	addInventoryNote: 'Added inventory note',

	// Settings and system
	updateSettings: 'Changed settings',
	updateExpenseSettings: 'Changed expense categories',
	updateTemplate: 'Changed PDF template',
	updateBackupSettings: 'Changed backup settings',
	testRenderTemplate: 'Previewed PDF template',
	generateReportPdf: 'Created report PDF',
	sendTestEmail: 'Sent test email',
	sendTestEvent: 'Sent test event',
};

/** Splits `createFooBar` / `foo_bar.baz` into "Create foo bar baz". */
const humanize = (action: string): string => {
	const words = action
		.replace(/^auth\./, 'sign in ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[._-]+/g, ' ')
		.trim()
		.toLowerCase();
	return words ? words.charAt(0).toUpperCase() + words.slice(1) : action;
};

/** Readable label for an audit log action, e.g. `createInvoice` → "Created invoice". */
export const describeAction = (action: string): string =>
	ACTION_LABELS[action] ?? humanize(action);

/**
 * Readable name for the affected entity. GraphQL result type names such as
 * `EmailTestResult` are not useful to show and are hidden.
 */
export const describeEntityType = (
	entityType: string | null | undefined,
): string | null => {
	if (!entityType || /(Result|Response|Payload)$/.test(entityType)) {
		return null;
	}
	return humanize(entityType);
};
