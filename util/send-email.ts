import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";
import { config } from "@/config/config";

const mailConfig = {
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
};

const transporter = nodemailer.createTransport(mailConfig);

/**
 * Send SMTP mail (same provision as driverjobs-be utils/send-email.ts)
 */
export function sendSmtpMail(
  emails: string[],
  subject: string,
  text?: string,
  htmlBody?: string,
  attachments?: Attachment[]
): Promise<void> {
  return transporter
    .sendMail({
      from: `"No-reply" <${config.email.email}>`,
      to: emails.join(", "),
      subject,
      text: text ?? undefined,
      html: htmlBody ?? undefined,
      attachments,
    })
    .then((info) => {
      console.log(`[EMAIL] Message sent: ${info.messageId}`);
    })
    .catch((e) => {
      console.error("[EMAIL] Error sending mail:", e);
      throw e;
    });
}

export const sendEmail = sendSmtpMail;
