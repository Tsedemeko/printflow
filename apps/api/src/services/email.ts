import nodemailer from "nodemailer";
import type { EmailCredentials } from "../store.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export class EmailNotConfiguredError extends Error {
  constructor(message = "Email sending is not configured. Add your Gmail address and app password in Settings.") {
    super(message);
    this.name = "EmailNotConfiguredError";
  }
}

export function emailIsConfigured(settings: EmailCredentials): boolean {
  return Boolean(settings.enabled && settings.user && settings.password);
}

// Sends through the owner's own Gmail using an App Password over SMTP.
export async function sendEmail(settings: EmailCredentials, input: SendEmailInput): Promise<{ messageId: string }> {
  if (!emailIsConfigured(settings)) throw new EmailNotConfiguredError();

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: settings.user, pass: settings.password }
  });

  const fromName = settings.fromName || "Finesse Fashion Design Enterprise";
  const result = await transporter.sendMail({
    from: `"${fromName}" <${settings.user}>`,
    to: input.to,
    replyTo: input.replyTo ?? settings.user,
    subject: input.subject,
    text: input.text,
    ...(input.html ? { html: input.html } : {})
  });

  return { messageId: result.messageId };
}
