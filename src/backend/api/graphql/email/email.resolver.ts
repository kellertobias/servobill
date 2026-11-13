import { IsEmail } from 'class-validator';
import {
	Args,
	ArgsType,
	Authorized,
	Field,
	Mutation,
	ObjectType,
	Resolver,
} from 'type-graphql';
import { CompanyDataSetting } from '@/backend/entities/settings.entity';
import { UserRole } from '@/backend/entities/user.entity';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import type { ConfigService } from '@/backend/services/config.service';
import { EmailType } from '@/backend/services/constants';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { SESService } from '@/backend/services/ses.service';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';

/**
 * Readable error text. Connection errors are often AggregateErrors (IPv4 and
 * IPv6 attempts) with an empty message; their code and inner errors are used.
 */
export const describeEmailError = (error: unknown): string => {
	if (!(error instanceof Error)) {
		return String(error);
	}
	const { code, response } = error as Error & {
		code?: string;
		response?: string;
	};
	const inner =
		error instanceof AggregateError
			? error.errors
					.map((e) => (e instanceof Error ? e.message : String(e)))
					.filter(Boolean)
			: [];
	const parts = [
		error.message,
		response && !error.message.includes(response) ? response : '',
		...inner,
	].filter(Boolean);
	const text = [...new Set(parts)].join('; ');
	if (code && !text.includes(code)) {
		return text ? `${code}: ${text}` : code;
	}
	return text || error.name;
};

@ObjectType('EmailTestResult')
export class EmailTestResult {
	@Field(() => Boolean)
	success!: boolean;

	@Field(() => String, {
		description: 'What was done, or the error reported by the mail server',
	})
	message!: string;
}

@ArgsType()
class SendTestEmailArgs {
	@Field(() => String)
	@IsEmail()
	to!: string;
}

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver()
export class EmailResolver {
	constructor(
		@Inject(SESService) private email: SESService,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(CONFIG_SERVICE) private config: ConfigService,
	) {}

	/**
	 * Sends a test email with the configured sender, so administrators can
	 * check the SMTP / SES setup. Errors from the mail server are returned
	 * instead of thrown, so their details reach the settings page.
	 */
	@Authorized(UserRole.ADMIN)
	@Mutation(() => EmailTestResult)
	async sendTestEmail(
		@Args(() => SendTestEmailArgs) { to }: SendTestEmailArgs,
	): Promise<EmailTestResult> {
		const transport =
			this.config.email.type === EmailType.SMTP
				? `SMTP ${this.config.email.host}:${this.config.email.port}`
				: 'Amazon SES';
		try {
			await this.email.verifyConnection();
			const company =
				await this.settingsRepository.getSetting(CompanyDataSetting);
			const info = await this.email.sendEmail({
				from: company.sendFrom,
				replyTo: company.replyTo,
				to,
				subject: 'Servobill test email',
				html: `<p>This test email was sent by Servobill via ${transport}.</p><p>Your email settings work.</p>`,
			});
			const accepted = (info as { accepted?: unknown[] }).accepted;
			return {
				success: true,
				message: `Sent to ${to} via ${transport}${
					accepted?.length === 0 ? ', but the server accepted no recipient' : ''
				}.`,
			};
		} catch (error) {
			return {
				success: false,
				message: `Sending via ${transport} failed: ${describeEmailError(error)}`,
			};
		}
	}
}
