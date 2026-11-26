import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter = null;

/**
 * Appends a timestamped dev mailer preview line to .logs/mailer-preview.log
 * so previews remain inspectable even when stdout is piped by a host runner.
 * @param {string} line
 */
function appendMailerPreviewLog(line) {
  try {
    const logDir = path.resolve(process.cwd(), '.logs');
    fs.mkdirSync(logDir, { recursive: true });
    const entry = `[${new Date().toISOString()}] ${line}\n`;
    fs.appendFileSync(path.join(logDir, 'mailer-preview.log'), entry, { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Non-fatal in read-only filesystems
  }
}

/**
 * Lazily constructs the Gmail SMTP transporter when credentials are present.
 * Falls back to safe console logging in local development when unconfigured.
 */
function getTransporter() {
  if (transporter) return transporter;
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

/**
 * Escapes HTML special characters before interpolating user values into email markup.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wraps email content in C-Grade's obsidian and cinema gold dark-mode template.
 * @param {string} heading
 * @param {string} bodyHtml
 * @returns {string}
 */
function renderCinemaEmailTemplate(heading, bodyHtml) {
  return `
  <!doctype html>
  <html>
    <body style="margin:0;padding:32px 16px;background-color:#09090B;color:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#18181B;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:-0.02em;color:#FAFAFA;">C-Grade</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;font-weight:600;color:#FAFAFA;">${heading}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#A1A1AA;">
            C-Grade Cinema Journal &middot; Curated film reviews, ratings, and watch diaries.
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

/**
 * Sends a branded Welcome email after registration.
 * @param {{ to: string, name: string, username: string }} params
 */
export async function sendWelcomeEmail({ to, name, username }) {
  const safeName = escapeHtml(name);
  const safeUsername = escapeHtml(username);
  const appUrl = env.APP_URL || env.CLIENT_URL;
  const html = renderCinemaEmailTemplate(
    `Welcome to the screening room, ${safeName}`,
    `<p style="margin:0 0 16px;line-height:1.6;color:#D4D4D8;">Your account <strong>@${safeUsername}</strong> is ready. Start logging films, building curated lists, and sharing half-star reviews across world cinema.</p>
     <a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:12px 24px;background-color:#F59E0B;color:#09090B;font-weight:600;text-decoration:none;border-radius:8px;">Open C-Grade</a>`
  );

  const mailer = getTransporter();
  if (!mailer) {
    const line = `[MAILER PREVIEW] Welcome email -> ${to} (@${username})`;
    console.log(line);
    appendMailerPreviewLog(line);
    return { previewed: true };
  }

  return mailer.sendMail({
    from: `"C-Grade Cinema" <${env.GMAIL_USER}>`,
    to,
    subject: 'Welcome to C-Grade',
    html,
  });
}

/**
 * Sends a 15-minute password reset email via Gmail SMTP (or logs a dev preview).
 * @param {{ to: string, name: string, resetUrl: string }} params
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);
  const html = renderCinemaEmailTemplate(
    'Reset your C-Grade password',
    `<p style="margin:0 0 16px;line-height:1.6;color:#D4D4D8;">Hi ${safeName}, we received a request to reset your password. This link expires in <strong>15 minutes</strong>.</p>
     <a href="${safeUrl}" style="display:inline-block;margin:8px 0 20px;padding:12px 24px;background-color:#F59E0B;color:#09090B;font-weight:600;text-decoration:none;border-radius:8px;">Reset Password</a>
     <p style="margin:0;font-size:13px;line-height:1.5;color:#A1A1AA;">If you did not request a reset, you can safely ignore this message.</p>`
  );

  const mailer = getTransporter();
  if (!mailer) {
    const line = `[MAILER PREVIEW] Password reset for ${to}: ${resetUrl}`;
    console.log(line);
    appendMailerPreviewLog(line);
    return { previewed: true, resetUrl };
  }

  return mailer.sendMail({
    from: `"C-Grade Cinema" <${env.GMAIL_USER}>`,
    to,
    subject: 'Reset your C-Grade password (expires in 15 minutes)',
    html,
  });
}

/**
 * Sends a 10-minute 6-digit email verification code before creating a new User account.
 * @param {{ to: string, name: string, code: string, verifyUrl: string }} params
 */
export async function sendEmailVerificationCode({ to, name, code, verifyUrl }) {
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  const safeUrl = escapeHtml(verifyUrl);
  const html = renderCinemaEmailTemplate(
    'Verify your email to join C-Grade',
    `<p style="margin:0 0 16px;line-height:1.6;color:#D4D4D8;">Hi ${safeName}, enter this 6-digit verification code to complete creating your C-Grade account. This code expires in <strong>10 minutes</strong>.</p>
     <div style="margin:18px 0 22px;padding:18px 24px;background-color:#09090B;border:1px solid rgba(251,191,36,0.35);border-radius:10px;text-align:center;">
       <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#FBBF24;">${safeCode}</span>
     </div>
     <a href="${safeUrl}" style="display:inline-block;margin:0 0 20px;padding:12px 24px;background-color:#F59E0B;color:#09090B;font-weight:600;text-decoration:none;border-radius:8px;">Verify Email &amp; Create Account</a>
     <p style="margin:0;font-size:13px;line-height:1.5;color:#A1A1AA;">If you did not try to sign up for C-Grade, you can safely ignore this email—no account has been created.</p>`
  );

  const mailer = getTransporter();
  if (!mailer) {
    const line = `[MAILER PREVIEW] Email verification for ${to}: code=${code} | ${verifyUrl}`;
    console.log(line);
    appendMailerPreviewLog(line);
    return { previewed: true, code, verifyUrl };
  }

  return mailer.sendMail({
    from: `"C-Grade Cinema" <${env.GMAIL_USER}>`,
    to,
    subject: `${code} is your C-Grade verification code`,
    html,
  });
}
