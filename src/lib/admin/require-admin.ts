// F043 — gate do painel admin.

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { emailEhAdminPermitido } from "./env";

export type AdminActor = {
  id: string;
  email: string;
  role: string;
};

/**
 * Exige admin. Self-heal: e-mail em BOOTSTRAP_ADMIN_EMAIL / ADMIN_EMAILS
 * recebe `role=admin` se ainda estiver `user`.
 */
export const requireAdmin = cache(async function requireAdmin(): Promise<AdminActor> {
  const user = await requireUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true },
  });
  if (!row) {
    redirect("/");
  }

  let role = row.role;
  if (role !== "admin" && emailEhAdminPermitido(row.email)) {
    await prisma.user.update({
      where: { id: row.id },
      data: { role: "admin" },
    });
    role = "admin";
  }

  if (role !== "admin") {
    redirect("/");
  }

  return { id: row.id, email: row.email, role };
});

export async function usuarioEhAdmin(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });
  if (!row) return false;
  if (row.role === "admin") return true;
  if (!emailEhAdminPermitido(row.email)) return false;
  await prisma.user.update({
    where: { id: userId },
    data: { role: "admin" },
  });
  return true;
}
