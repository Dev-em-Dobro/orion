import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { sendMagicLinkEmail } from "@/lib/email";

describe("sendMagicLinkEmail", () => {
  const envKeys = [
    "EMAIL_PROVIDER",
    "EMAIL_FROM",
    "MAILPIT_URL",
    "RESEND_SMTP_FROM_EMAIL",
    "RESEND_SMTP_HOST",
    "RESEND_SMTP_PORT",
    "RESEND_SMTP_USER",
    "RESEND_SMTP_PASS",
  ] as const;
  const snap: Partial<Record<(typeof envKeys)[number], string | undefined>> =
    {};

  beforeEach(() => {
    for (const k of envKeys) snap[k] = process.env[k];
    sendMail.mockReset();
    createTransport.mockClear();
  });

  afterEach(() => {
    for (const k of envKeys) {
      const v = snap[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    vi.unstubAllGlobals();
  });

  it("mailpit via fetch", async () => {
    process.env.EMAIL_PROVIDER = "mailpit";
    process.env.EMAIL_FROM = "app@localhost";
    process.env.MAILPIT_URL = "http://mailpit.test";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendMagicLinkEmail({
      to: "a@b.com",
      url: "https://app/login?token=1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://mailpit.test/api/v1/send",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body.Subject).toContain("Orion Lead Hunter");
    expect(body.HTML).toContain("Entrar no Orion Lead Hunter");
    expect(body.HTML).toContain("#22c55e");
  });

  it("mailpit falha HTTP", async () => {
    process.env.EMAIL_PROVIDER = "mailpit";
    process.env.EMAIL_FROM = "app@localhost";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "err",
        text: async () => "boom",
      }),
    );
    await expect(
      sendMagicLinkEmail({ to: "a@b.com", url: "https://x" }),
    ).rejects.toThrow(/Mailpit/);
  });

  it("resend via nodemailer mock", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_SMTP_FROM_EMAIL = "login@x.com";
    process.env.RESEND_SMTP_HOST = "smtp.resend.com";
    process.env.RESEND_SMTP_PORT = "465";
    process.env.RESEND_SMTP_USER = "resend";
    process.env.RESEND_SMTP_PASS = "re_xxx";
    sendMail.mockResolvedValueOnce({});

    await sendMagicLinkEmail({ to: "a@b.com", url: "https://x" });
    expect(createTransport).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.com", from: "login@x.com" }),
    );
  });

  it("provider inválido", async () => {
    process.env.EMAIL_PROVIDER = "ses";
    await expect(
      sendMagicLinkEmail({ to: "a@b.com", url: "https://x" }),
    ).rejects.toThrow(/EMAIL_PROVIDER inválido/);
  });
});
