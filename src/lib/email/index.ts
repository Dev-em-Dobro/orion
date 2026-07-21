// F014 / ADR-010 — e-mail transacional.
// Local: Mailpit (HTTP). Produção: Resend via SMTP (nodemailer).

import nodemailer from "nodemailer";
import { requireAuthEnv } from "@/lib/auth/env";
import { NOME_PRODUTO } from "@/lib/produto";

type EmailProvider = "mailpit" | "resend";

function getProvider(): EmailProvider {
  const raw = requireAuthEnv("EMAIL_PROVIDER");
  if (raw === "mailpit" || raw === "resend") return raw;
  throw new Error(
    `[email] EMAIL_PROVIDER inválido: "${raw}". Use "mailpit" (local) ou "resend" (produção).`,
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMagicLinkBody(url: string): { text: string; html: string } {
  const safeUrl = escapeHtml(url);
  const text = [
    `Olá,`,
    ``,
    `Use o link abaixo para entrar no ${NOME_PRODUTO} (válido por poucos minutos):`,
    ``,
    url,
    ``,
    `Se você não pediu este acesso, ignore este e-mail.`,
    ``,
    `— ${NOME_PRODUTO} · Dev em Dobro`,
  ].join("\n");

  // HTML table-based (clientes de e-mail). Cores alinhadas ao app (#22c55e).
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Acesso — ${escapeHtml(NOME_PRODUTO)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#22c55e;">
                ${escapeHtml(NOME_PRODUTO)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:600;color:#fafafa;">
                Seu link de acesso
              </h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.55;color:#a1a1aa;">
                Olá — use o botão abaixo para entrar na sua conta. O link vale por poucos minutos.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px;">
              <a href="${safeUrl}"
                 style="display:inline-block;background-color:#22c55e;color:#052e16;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">
                Entrar no ${escapeHtml(NOME_PRODUTO)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${safeUrl}" style="color:#4ade80;text-decoration:underline;">${safeUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 28px 32px;border-top:1px solid #27272a;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#52525b;">
                Se você não pediu este acesso, ignore este e-mail.
              </p>
              <p style="margin:10px 0 0 0;font-size:11px;color:#3f3f46;">
                ${escapeHtml(NOME_PRODUTO)} · Dev em Dobro
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html };
}

async function sendViaMailpit(params: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const base = (
    process.env.MAILPIT_URL?.trim() || "http://127.0.0.1:8025"
  ).replace(/\/$/, "");

  const res = await fetch(`${base}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: { Email: params.from },
      To: [{ Email: params.to }],
      Subject: params.subject,
      Text: params.text,
      HTML: params.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `[email] Mailpit falhou (${res.status}): ${detail || res.statusText}. ` +
        `Suba com: docker compose up -d`,
    );
  }
}

async function sendViaResendSmtp(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const from = requireAuthEnv("RESEND_SMTP_FROM_EMAIL");
  const host = requireAuthEnv("RESEND_SMTP_HOST");
  const port = Number(requireAuthEnv("RESEND_SMTP_PORT"));
  const user = requireAuthEnv("RESEND_SMTP_USER");
  const pass = requireAuthEnv("RESEND_SMTP_PASS");

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(
      `[email] RESEND_SMTP_PORT inválido: "${process.env.RESEND_SMTP_PORT}".`,
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[email] Falha SMTP Resend: ${message}`);
  }
}

export async function sendMagicLinkEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  const subject = `Seu link de acesso — ${NOME_PRODUTO}`;
  const { text, html } = buildMagicLinkBody(params.url);

  if (getProvider() === "mailpit") {
    await sendViaMailpit({
      to: params.to,
      from: requireAuthEnv("EMAIL_FROM"),
      subject,
      text,
      html,
    });
    return;
  }

  await sendViaResendSmtp({
    to: params.to,
    subject,
    text,
    html,
  });
}
