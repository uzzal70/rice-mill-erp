import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private configuration() {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from || (process.env.SMTP_USER && !process.env.SMTP_PASSWORD)) throw new ServiceUnavailableException('Email delivery is not configured.');
    const port = Number(process.env.SMTP_PORT ?? 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ServiceUnavailableException('Email delivery is not configured.');
    return {
      from,
      transport: nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } : undefined,
      }),
    };
  }

  assertConfigured() { this.configuration(); }

  async send(to: string, subject: string, text: string) {
    try {
      const { from, transport } = this.configuration();
      await transport.sendMail({ from, to, subject, text });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable.');
    }
  }
}
