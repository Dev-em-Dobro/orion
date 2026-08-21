// F033 — leitura e validação do formulário de busca estruturada.
//
// Mora em `lib/` de propósito. Enquanto isto vivia dentro da Server Action,
// nada garantia que os nomes lidos do `FormData` batessem com os do
// formulário — e por um tempo não bateram: o schema já era o da F033
// (`nicho`, `uf`, `municipio`, …) e a leitura ainda era a da F001
// (`termo`, `localizacao`). Todo campo chegava vazio e a busca morria com o
// "Required" cru do Zod, sem pista nenhuma pro aluno.
//
// Aqui dá pra testar sem Next e sem Prisma, então o desencontro fica preso.

import { z } from "zod";
import { QUANTIDADES } from "./aprofundamento";

/** Nomes dos campos em `src/app/(orion)/leads/coletar-form.tsx`. */
export const CAMPOS_BUSCA = [
  "nicho",
  "termoLivre",
  "uf",
  "municipio",
  "bairro",
  "quantidade",
] as const;

export type CampoBusca = (typeof CAMPOS_BUSCA)[number];

/**
 * Cada campo obrigatório precisa das **duas** mensagens. `required_error` só
 * dispara em `undefined`; campo que veio do `FormData` sem valor chega como
 * `null` e cai em `invalid_type_error`. Sem os dois, o Zod devolve o literal
 * "Expected string, received null" — que já vazou pra tela como "Required".
 */
function obrigatorio(mensagem: string) {
  return z.string({
    required_error: mensagem,
    invalid_type_error: mensagem,
  });
}

export const buscaSchema = z.object({
  nicho: obrigatorio("Escolha um nicho").trim().min(1, "Escolha um nicho"),
  termoLivre: z.string().trim().max(80, "Termo muito longo").optional(),
  uf: obrigatorio("Escolha o estado").trim().length(2, "Escolha o estado"),
  municipio: obrigatorio("Escolha a cidade")
    .trim()
    .min(2, "Escolha a cidade")
    .max(80, "Nome de cidade muito longo"),
  bairro: z.string().trim().max(80, "Bairro muito longo").optional(),
  quantidade: z.coerce
    .number({
      required_error: "Escolha quantos Leads buscar",
      invalid_type_error: "Escolha quantos Leads buscar",
    })
    .int("Quantidade inválida")
    .refine(
      (q) => QUANTIDADES.includes(q as (typeof QUANTIDADES)[number]),
      "Quantidade inválida",
    ),
});

export type Busca = z.infer<typeof buscaSchema>;

/** Só o `get` — assim o teste passa um objeto simples, sem montar FormData. */
type LeitorDeCampos = { get(nome: string): FormDataEntryValue | null };

/**
 * `?? undefined` nos opcionais: `FormData.get` devolve `null` quando o campo
 * não veio, e `.optional()` do Zod aceita `undefined`, não `null`.
 */
export function lerBusca(formData: LeitorDeCampos) {
  return buscaSchema.safeParse({
    nicho: formData.get("nicho"),
    termoLivre: formData.get("termoLivre") ?? undefined,
    uf: formData.get("uf"),
    municipio: formData.get("municipio"),
    bairro: formData.get("bairro") ?? undefined,
    quantidade: formData.get("quantidade"),
  });
}

/** Primeira mensagem de erro, já amigável — nunca o texto cru do Zod. */
export function primeiroErro(
  resultado: ReturnType<typeof lerBusca>,
): string | null {
  if (resultado.success) return null;
  return resultado.error.issues[0]?.message ?? "Input inválido";
}
