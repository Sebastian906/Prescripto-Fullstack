// backend/src/auth/password-reset.service.ts (createTransport + sendMail
// {from, to, subject, html}) without importing nodemailer here.
// The SMTP adapter lives in infra and reads SMTP_HOST/PORT/USER/PASS +
// EMAIL_FROM via ConfigService. No change to password-reset.service.ts.

export interface NotifyInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface Notifier {
  notify(input: NotifyInput): Promise<void>;
}

export const NOTIFIER = Symbol('Notifier');
