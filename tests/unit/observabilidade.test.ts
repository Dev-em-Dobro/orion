import { afterEach, describe, expect, it } from "vitest";
import {
  beforeSendScrub,
  sentryDsn,
  sentryEnabled,
} from "@/lib/observabilidade/opcoes";

describe("observabilidade opcoes", () => {
  const keys = ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"] as const;
  const snap: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const k of keys) {
      const v = snap[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("sem DSN ⇒ disabled", () => {
    for (const k of keys) {
      snap[k] = process.env[k];
      delete process.env[k];
    }
    expect(sentryEnabled()).toBe(false);
    expect(sentryDsn()).toBeUndefined();
  });

  it("DSN público ativa", () => {
    for (const k of keys) snap[k] = process.env[k];
    delete process.env.SENTRY_DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://x@o.ingest.sentry.io/1";
    expect(sentryEnabled()).toBe(true);
  });

  it("beforeSendScrub remove cookie e authorization", () => {
    const event = beforeSendScrub({
      request: {
        cookies: { a: "1" },
        headers: {
          Cookie: "session=x",
          Authorization: "Bearer secret",
          "Content-Type": "application/json",
        },
      },
    } as never);
    expect(event?.request?.cookies).toBeUndefined();
    expect(event?.request?.headers?.Authorization).toBeUndefined();
    expect(event?.request?.headers?.Cookie).toBeUndefined();
    expect(event?.request?.headers?.["Content-Type"]).toBe(
      "application/json",
    );
  });
});
