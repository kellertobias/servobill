import { describe, expect, it, vi } from 'vitest';
import type { AuditLogEntity } from '@/backend/entities/audit-log.entity';
import { AuditLogService, sanitizeForAudit } from './audit-log.service';

describe('sanitizeForAudit', () => {
	it('redacts secrets at any depth', () => {
		expect(
			sanitizeForAudit({
				data: { email: 'a@b.c', password: 'secret-1', nested: { apiKey: 'k' } },
				currentPassword: 'x',
				newPassword: null,
				clientSecret: 'y',
				token: 't',
			}),
		).toEqual({
			data: {
				email: 'a@b.c',
				password: '[redacted]',
				nested: { apiKey: '[redacted]' },
			},
			currentPassword: '[redacted]',
			newPassword: null,
			clientSecret: '[redacted]',
			token: '[redacted]',
		});
	});

	it('shortens long strings and arrays and stops at a maximum depth', () => {
		const long = 'x'.repeat(1000);
		const result = sanitizeForAudit({
			file: long,
			items: Array.from({ length: 25 }, (_, i) => i),
			a: { b: { c: { d: { e: 1 } } } },
		}) as Record<string, unknown>;
		expect(result.file).toBe(`${'x'.repeat(300)}… (1000 characters)`);
		expect(result.items).toHaveLength(21);
		expect((result.items as unknown[])[20]).toBe('… 5 more');
		expect(result.a).toEqual({ b: { c: { d: '…' } } });
	});

	it('converts dates to ISO strings', () => {
		expect(sanitizeForAudit({ at: new Date(Date.UTC(2026, 0, 1)) })).toEqual({
			at: '2026-01-01T00:00:00.000Z',
		});
	});
});

describe('AuditLogService', () => {
	it('stores sanitized details', async () => {
		const record = vi.fn<(entry: AuditLogEntity) => Promise<void>>();
		const service = new AuditLogService({ record, list: vi.fn() });
		await service.record({
			action: 'setUserPassword',
			success: true,
			details: { args: { id: 'u1', password: 'new-password' } },
		});
		expect(record).toHaveBeenCalledOnce();
		expect(record.mock.calls[0][0].details).toEqual({
			args: { id: 'u1', password: '[redacted]' },
		});
	});

	it('never throws when the audit log cannot be written', async () => {
		const service = new AuditLogService({
			record: vi.fn().mockRejectedValue(new Error('database down')),
			list: vi.fn(),
		});
		await expect(
			service.record({ action: 'createInvoice', success: true }),
		).resolves.toBeUndefined();
	});
});
