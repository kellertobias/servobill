'use client';

import React from 'react';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { useUserContext } from '@/hooks/require-login';

/**
 * Sends a test email with the saved sender settings, so administrators can
 * check the SMTP (or SES) configuration. Shows the mail server's answer.
 */
export function TestEmail() {
	const user = useUserContext();
	const [to, setTo] = React.useState<string | null>(null);
	const [sending, setSending] = React.useState(false);
	const [result, setResult] = React.useState<{
		success: boolean;
		message: string;
	} | null>(null);
	const recipient = to ?? user?.email ?? '';

	const send = async () => {
		setSending(true);
		setResult(null);
		try {
			const data = await API.query({
				query: gql(`
					mutation SendTestEmail($to: String!) {
						sendTestEmail(to: $to) {
							success
							message
						}
					}
				`),
				variables: { to: recipient },
			});
			setResult(data.sendTestEmail);
		} catch (error) {
			setResult({ success: false, message: API.getErrorMessage(error) });
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-end gap-2">
				<Input
					className="flex-1"
					label="Send a test email to"
					type="email"
					value={recipient}
					onChange={setTo}
				/>
				<Button secondary onClick={send} disabled={sending || !recipient}>
					{sending ? 'Sending…' : 'Send test email'}
				</Button>
			</div>
			<p className="text-xs text-gray-500">
				Uses the saved sender settings above. Save your changes first.
			</p>
			{result && (
				<p
					className={
						result.success ? 'text-sm text-green-700' : 'text-sm text-red-700'
					}
				>
					{result.message}
				</p>
			)}
		</div>
	);
}
