/**
 * Dexter's Lab mail — invite emails over any SMTP. Server-side only.
 * Needs SMTP_URL + MAIL_FROM in .env.local (Gmail works with an app
 * password); invites silently skip sending when unconfigured — the
 * invited member stub still exists and is claimable either way.
 */

import nodemailer from "nodemailer";
import type { Member } from "./model";

export function mailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_URL?.trim() && process.env.MAIL_FROM?.trim(),
  );
}

/**
 * The origin mail links should use — APP_URL when set, so an action taken on
 * a dev server never mails out a localhost link; else the request's origin.
 */
export function appOrigin(requestOrigin: string): string {
  return process.env.APP_URL?.trim().replace(/\/$/, "") || requestOrigin;
}

const ACCENT = "#4F46E5";
const INK = "#16171B";
const MUTED = "#5F6370";

/** Shared branded shell: headline, body copy, one indigo button. */
function mailHtml(
  heading: string,
  body: string,
  cta: string,
  url: string,
): string {
  return `
  <div style="background:#F7F7F9;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #E7E7EC;border-radius:16px;padding:36px;">
      <p style="margin:0 0 24px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">Dexter&rsquo;s Lab</p>
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:600;color:${INK};">${heading}</h1>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${MUTED};">${body}</p>
      <a href="${url}"
         style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 28px;font-size:15px;">
        ${cta}
      </a>
      <p style="margin:28px 0 0;font-size:12px;color:#9CA0AC;">
        If the button doesn&rsquo;t work, open ${url}
      </p>
    </div>
  </div>`;
}

/** Send one branded mail; resolves false (and logs) on failure. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  heading: string;
  body: string;
  cta: string;
  url: string;
}): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    await nodemailer.createTransport(process.env.SMTP_URL).sendMail({
      from: process.env.MAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: mailHtml(opts.heading, opts.body, opts.cta, opts.url),
    });
    return true;
  } catch (err) {
    console.error(`[mail] to ${opts.to} failed:`, err);
    return false;
  }
}

/** Send sign-in invites; resolves to how many actually went out. */
export async function sendInviteEmails(
  emails: string[],
  inviter: Member,
  origin: string,
): Promise<number> {
  if (!mailConfigured() || emails.length === 0) return 0;
  const loginUrl = `${origin}/login`;
  const results = await Promise.all(
    emails.map((to) =>
      sendMail({
        to,
        subject: `${inviter.name} invited you to Dexter's Lab`,
        text: `${inviter.name} invited you to Dexter's Lab — one shared workspace for the team's docs, tasks, and code.\n\nSign in with the Google account this email was sent to: ${loginUrl}`,
        heading: `${inviter.name} invited you to the lab.`,
        body:
          "One shared workspace where the team writes docs, tracks tasks, and keeps the code snippets everyone keeps re-asking for. Sign in with the Google account this email was sent to and you&rsquo;ll land right in the workspace.",
        cta: "Enter the lab",
        url: loginUrl,
      }),
    ),
  );
  return results.filter(Boolean).length;
}
