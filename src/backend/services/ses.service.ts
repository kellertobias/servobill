import * as ses from '@aws-sdk/client-sesv2';
import nodemailer, { type Transporter } from 'nodemailer';
import type SESTransport from 'nodemailer/lib/ses-transport';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Inject, Service } from '@/common/di';
import { Span } from '../instrumentation';
import type { ConfigService } from './config.service';
import { EmailType } from './constants';
import { CONFIG_SERVICE } from './di-tokens';
import { Logger } from './logger.service';

/**
 * Service for sending emails using either AWS SES or SMTP
 */
@Service()
export class SESService {
	private logger = new Logger('SESService');
	private client: ses.SESv2Client | undefined;
	private transporter: Transporter<
		SESTransport.SentMessageInfo | SMTPTransport.SentMessageInfo
	>;

	constructor(
		@Inject(CONFIG_SERVICE) private readonly configuration: ConfigService,
	) {
		if (this.configuration.email.type === EmailType.SES) {
			const sesOptions = {
				...(this.configuration.endpoints.ses
					? {
							endpoint: this.configuration.endpoints.ses,
						}
					: {}),
				region: this.configuration.region,
				credentials:
					this.configuration.email.accessKeyId &&
					this.configuration.email.secretAccessKey
						? {
								accessKeyId: this.configuration.email.accessKeyId,
								secretAccessKey: this.configuration.email.secretAccessKey,
							}
						: undefined,
			};
			this.client = new ses.SESv2Client(sesOptions);
			this.transporter = nodemailer.createTransport({
				SES: {
					sesClient: this.client,
					SendEmailCommand: ses.SendEmailCommand,
				},
			} as any);
			this.logger.info('SES client initialized', {
				region: this.configuration.region,
				endpoint: this.configuration.endpoints.ses,
			});
		} else {
			// SMTP configuration
			const smtp = this.configuration.email;
			this.transporter = nodemailer.createTransport({
				host: smtp.host,
				port: smtp.port,
				secure: smtp.secure ?? smtp.port === 465,
				requireTLS: !!smtp.requireTLS,
				// Relays inside a private network often need no login
				...(smtp.user
					? { auth: { user: smtp.user, pass: smtp.password } }
					: {}),
				tls: { rejectUnauthorized: smtp.rejectUnauthorized !== false },
			} as SMTPTransport.Options);
			this.logger.info('SMTP client initialized', {
				host: smtp.host,
				port: smtp.port,
				user: smtp.user || '(no authentication)',
			});
		}
	}

	@Span('SESService.sendEmail')
	public sendEmail({
		from,
		replyTo,
		to,
		subject,
		html,
		attachments,
	}: {
		from: string;
		replyTo?: string;
		to: string;
		subject: string;
		html: string;
		attachments?: {
			filename: string;
			content: Buffer | string;
		}[];
	}): Promise<SESTransport.SentMessageInfo | SMTPTransport.SentMessageInfo> {
		const { from: fromAddress, replyTo: replyToAddress } = this.resolveSender(
			from,
			replyTo,
		);

		return new Promise((resolve, reject) => {
			this.transporter.sendMail(
				{
					from: fromAddress,
					to,
					subject,
					replyTo: replyToAddress,
					html,
					attachments,
				},
				(err, info) => {
					if (err) {
						reject(err);
					} else {
						resolve(info);
					}
				},
			);
		});
	}

	/**
	 * Sender and Reply-To for a message. With SMTP the configured SMTP_FROM
	 * (and SMTP_FROM_NAME) is used when no sender is given, or always when
	 * SMTP_ENFORCE_FROM is set; the requested sender then becomes Reply-To.
	 */
	public resolveSender(
		from: string | undefined,
		replyTo: string | undefined,
	): { from: string | { name: string; address: string }; replyTo?: string } {
		const email = this.configuration.email;
		if (email.type !== EmailType.SMTP || !email.from) {
			return { from: from || '', replyTo };
		}
		const configured = email.fromName
			? { name: email.fromName, address: email.from }
			: email.from;
		if (!from) {
			return { from: configured, replyTo };
		}
		if (email.enforceFrom && from.toLowerCase() !== email.from.toLowerCase()) {
			return { from: configured, replyTo: replyTo || from };
		}
		return { from, replyTo };
	}

	/**
	 * Checks that the mail server can be reached and accepts the login.
	 * SES has no such check and always reports success.
	 */
	@Span('SESService.verifyConnection')
	public async verifyConnection(): Promise<void> {
		if (this.configuration.email.type !== EmailType.SMTP) {
			return;
		}
		await this.transporter.verify();
	}
}
