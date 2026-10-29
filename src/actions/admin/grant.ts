"use server";

// F043 — actions do painel admin.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  estenderTrialAdmin,
  grantAcessoAdmin,
  grantAcessoBulkAdmin,
  grantTrialAdmin,
  requireAdmin,
  revokeAcessoAdmin,
  revokeTrialAdmin,
} from "@/lib/admin";
import { diasCortesiaPro } from "@/lib/planos/trial";

function revalidateAdmin() {
  revalidatePath("/admin");
}

const emailSchema = z.string().trim().min(3);

export async function grantAcessoAction(formData: FormData) {
  await requireAdmin();
  const email = emailSchema.parse(formData.get("email"));
  const comTrial = formData.get("comTrial") === "on";
  await grantAcessoAdmin(email, { comTrial });
  revalidateAdmin();
}

export async function grantAcessoBulkAction(formData: FormData) {
  await requireAdmin();
  const texto = z.string().parse(formData.get("emails") ?? "");
  const comTrial = formData.get("comTrial") === "on";
  await grantAcessoBulkAdmin(texto, { comTrial });
  revalidateAdmin();
}

export async function revokeAcessoAction(formData: FormData) {
  await requireAdmin();
  const email = emailSchema.parse(formData.get("email"));
  await revokeAcessoAdmin(email);
  revalidateAdmin();
}

export async function grantTrialAction(formData: FormData) {
  await requireAdmin();
  const email = emailSchema.parse(formData.get("email"));
  await grantTrialAdmin(email);
  revalidateAdmin();
}

export async function revokeTrialAction(formData: FormData) {
  await requireAdmin();
  const email = emailSchema.parse(formData.get("email"));
  await revokeTrialAdmin(email);
  revalidateAdmin();
}

export async function estenderTrialAction(formData: FormData) {
  await requireAdmin();
  const email = emailSchema.parse(formData.get("email"));
  const diasRaw = formData.get("dias");
  const dias =
    diasRaw && String(diasRaw).trim()
      ? Number(diasRaw)
      : diasCortesiaPro();
  await estenderTrialAdmin(email, dias);
  revalidateAdmin();
}
