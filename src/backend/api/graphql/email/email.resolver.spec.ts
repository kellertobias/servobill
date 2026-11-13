import { describe, expect, it } from 'vitest';
import { describeEmailError } from './email.resolver';

describe('describeEmailError', () => {
	it('uses code and inner errors of connection failures', () => {
		const error = Object.assign(
			new AggregateError(
				[
					new Error('connect ECONNREFUSED ::1:2525'),
					new Error('connect ECONNREFUSED 127.0.0.1:2525'),
				],
				'',
			),
			{ code: 'ECONNREFUSED' },
		);
		expect(describeEmailError(error)).toBe(
			'connect ECONNREFUSED ::1:2525; connect ECONNREFUSED 127.0.0.1:2525',
		);
	});

	it('keeps SMTP server responses', () => {
		const error = Object.assign(new Error('Invalid login'), {
			code: 'EAUTH',
			response: '535 5.7.8 Authentication failed',
		});
		expect(describeEmailError(error)).toBe(
			'EAUTH: Invalid login; 535 5.7.8 Authentication failed',
		);
	});

	it('falls back to the code when there is no message', () => {
		const error = Object.assign(new Error(''), { code: 'ETIMEDOUT' });
		expect(describeEmailError(error)).toBe('ETIMEDOUT');
	});

	it('handles non-errors', () => {
		expect(describeEmailError('boom')).toBe('boom');
	});
});
