import * as ses from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
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
  private client: ses.SESClient | undefined;
  private transporter: nodemailer.Transporter;

  constructor(@Inject(CONFIG_SERVICE) private readonly configuration: ConfigService) {
    if (this.configuration.email.type === EmailType.SES) {
      const sesOptions = {
        ...(this.configuration.endpoints.ses
          ? {
              endpoint: this.configuration.endpoints.ses,
            }
          : {}),
        region: this.configuration.region,
        credentials:
          this.configuration.email.accessKeyId && this.configuration.email.secretAccessKey
            ? {
                accessKeyId: this.configuration.email.accessKeyId,
                secretAccessKey: this.configuration.email.secretAccessKey,
              }
            : undefined,
      };
      this.client = new ses.SESClient(sesOptions);
      this.transporter = nodemailer.createTransport({
        SES: { ses: this.client, aws: ses },
      });
      this.logger.info('SES client initialized', {
        region: this.configuration.region,
        endpoint: this.configuration.endpoints.ses,
      });
    } else {
      // SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: this.configuration.email.host,
        port: this.configuration.email.port,
        secure: this.configuration.email.port === 465,
        auth: {
          user: this.configuration.email.user,
          pass: this.configuration.email.password,
        },
      } as SMTPTransport.Options);
      this.logger.info('SMTP client initialized', {
        host: this.configuration.email.host,
        port: this.configuration.email.port,
        user: this.configuration.email.user,
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
    // If using SMTP and no from address is provided, use the configured default
    const fromAddress =
      this.configuration.email.type === EmailType.SMTP && !from
        ? this.configuration.email.from
        : from;

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(
        {
          from: fromAddress,
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
        }
      );
    });
  }
}
