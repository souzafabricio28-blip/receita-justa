import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    pass,
    from: process.env.SMTP_FROM || `Receita Justa <${user}>`,
  };
}

export function isEmailConfigured(): boolean {
  return getConfig() !== null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    logger.warn("SMTP não configurado — e-mail não enviado", { to, subject });
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
    logger.info("E-mail enviado", { to, subject });
    return true;
  } catch (err) {
    logger.error("Falha ao enviar e-mail", { to, subject, error: String(err) });
    return false;
  }
}
