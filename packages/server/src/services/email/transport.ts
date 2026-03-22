// ============================================================================
// EMAIL TRANSPORT
// Nodemailer transport configured from config.email settings.
// ============================================================================

import nodemailer from "nodemailer";
import { config } from "../../config";
import { logger } from "../../utils/logger";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth:
    config.email.user && config.email.password
      ? { user: config.email.user, pass: config.email.password }
      : undefined,
});

/**
 * Send an email. Non-blocking — logs errors but does not throw.
 */
export async function sendMail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> {
  try {
    const recipients = Array.isArray(to) ? to.join(", ") : to;
    await transporter.sendMail({
      from: config.email.from,
      to: recipients,
      subject,
      html,
    });
    logger.info(`Email sent to ${recipients}: "${subject}"`);
  } catch (err) {
    logger.error("Failed to send email:", err);
  }
}
