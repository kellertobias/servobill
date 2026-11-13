import { describe, expect, it } from 'vitest';
import { describeAction, describeEntityType } from './audit-actions';

describe('describeAction', () => {
	it('uses the readable label for known actions', () => {
		expect(describeAction('auth.login')).toBe('Signed in');
		expect(describeAction('auth.login_locked')).toBe(
			'Sign in refused: too many failed attempts',
		);
		expect(describeAction('createInvoice')).toBe('Created invoice');
		expect(describeAction('invoiceAddPayment')).toBe('Recorded payment');
	});

	it('turns unknown action names into words', () => {
		expect(describeAction('archiveInvoice')).toBe('Archive invoice');
		expect(describeAction('auth.password_reset')).toBe(
			'Sign in password reset',
		);
		expect(describeAction('')).toBe('');
	});
});

describe('describeEntityType', () => {
	it('shows entity types as words and hides result types', () => {
		expect(describeEntityType('InventoryItem')).toBe('Inventory item');
		expect(describeEntityType('User')).toBe('User');
		expect(describeEntityType('EmailTestResult')).toBeNull();
		expect(describeEntityType(null)).toBeNull();
	});
});
