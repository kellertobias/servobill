import * as ses from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import SESTransport from 'nodemailer/lib/ses-transport';

import { Span } from '../instrumentation';

import type { ConfigService } from './config.service';
import { CONFIG_SERVICE } from './di-tokens';

import { Inject, Service } from '@/common/di';

@Service()
export class SESService {
	private client: ses.SESClient;

	constructor(
		@Inject(CONFIG_SERVICE) private readonly configuration: ConfigService,
	) {
		const sesOptions = {
			...(this.configuration.endpoints.ses
				? {
						endpoint: this.configuration.endpoints.ses,
					}
				: {}),
			region: this.configuration.region,
			credentials:
				this.configuration.ses.accessKeyId &&
				this.configuration.ses.secretAccessKey
					? {
							accessKeyId: this.configuration.ses.accessKeyId,
							secretAccessKey: this.configuration.ses.secretAccessKey,
						}
					: undefined,
		};
		this.client = new ses.SESClient(sesOptions);
	}

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
	}): Promise<SESTransport.SentMessageInfo> {
		const transporter = nodemailer.createTransport({
			SES: { ses: this.client, aws: ses },
		});

		return new Promise((resolve, reject) => {
			transporter.sendMail(
				{
					from,
					to,
					subject,
					replyTo,
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
}
