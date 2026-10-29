import { afterEach, describe, expect, it } from "vitest";
import { emailEhAdminPermitido, emailsAdminPermitidos } from "@/lib/admin/env";

const ORIG = {
  bootstrap: process.env.BOOTSTRAP_ADMIN_EMAIL,
  admins: process.env.ADMIN_EMAILS,
};

afterEach(() => {
  if (ORIG.bootstrap === undefined) delete process.env.BOOTSTRAP_ADMIN_EMAIL;
  else process.env.BOOTSTRAP_ADMIN_EMAIL = ORIG.bootstrap;
  if (ORIG.admins === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ORIG.admins;
});

describe("emailsAdminPermitidos", () => {
  it("junta bootstrap + CSV", () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = "Admin@Dev.com";
    process.env.ADMIN_EMAILS = "a@x.com, b@x.com";
    expect([...emailsAdminPermitidos()].sort()).toEqual([
      "a@x.com",
      "admin@dev.com",
      "b@x.com",
    ]);
    expect(emailEhAdminPermitido("ADMIN@dev.com")).toBe(true);
    expect(emailEhAdminPermitido("outro@x.com")).toBe(false);
  });
});
