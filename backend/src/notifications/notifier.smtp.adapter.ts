import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Notifier, NotifyInput } from 'src/shared/ports/notifier.port';

// Adaptador SMTP del puerto Notifier. Replica el patron de
// password-reset.service.ts (createTransport + sendMail) sin tocar ese archivo.
@Injectable()
export class NotifierSmtpAdapter implements Notifier {
  constructor(private readonly configService: ConfigService) {}

  async notify(input: NotifyInput): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    await transporter.sendMail({
      from: `"Prescripto" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    });
  }
}
