import { describe, expect, it } from "vitest";
import { linkWhatsapp } from "@/lib/outreach/whatsappLink";

describe("linkWhatsapp", () => {
  it("usa api.whatsapp.com (não wa.me) e preserva emoji no text", () => {
    const url = linkWhatsapp("41999998888", "Oi! 👋 Percebi que…");
    expect(url).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?phone=5541999998888&text=/);
    expect(url).not.toContain("wa.me");
    expect(url).toContain(encodeURIComponent("👋"));
  });

  it("sem telefone → null", () => {
    expect(linkWhatsapp(null, "oi")).toBeNull();
    expect(linkWhatsapp("abc", "oi")).toBeNull();
  });
});
