// F033 — catálogo de nichos: o dropdown da busca e o mapa de Tier da F003.
// Fonte: /specs/05-playbook/nichos-alto-valor.md (promover/rebaixar um nicho é
// mudança de estratégia → editar o playbook antes).
//
// Uma fonte só: antes o mapa de Tier vivia em `score/nichos.ts` e a lista de
// termos de busca só existia no playbook, em prosa. Agora o dropdown e o Tier
// leem daqui — e um teste falha se este catálogo divergir do playbook.

import type { Tier } from "./tier";

export type Nicho = {
  /** Identificador na URL e no form. */
  slug: string;
  label: string;
  /** O que vai no `textQuery` do Places. */
  termoBusca: string;
  /**
   * `includedType` do Places. Só quando o nicho mapeia um `primaryType` único
   * e confiável — onde o playbook diz "(varia)", fica ausente e a busca corre
   * sem filtro de tipo.
   *
   * **O valor tem que existir na Table A do Places.** Nome plausível não basta:
   * `psychologist` e `nutritionist` parecem certos, não estão na tabela, e o
   * Google responde 400 derrubando a busca inteira. A lista fechada do que vale
   * está em `/specs/03-contracts/google-places.md` e
   * `tests/unit/nichos-localidades.test.ts` falha se este arquivo sair dela.
   */
  includedType?: string;
  /** Tipos que o Places pode devolver para este nicho (alimenta o Tier). */
  primaryTypes: string[];
  tier: Tier;
};

export const NICHOS: Nicho[] = [
  // ---- Tier ALTO: saúde/estética de ticket alto, jurídico, imobiliário ----
  {
    slug: "dentista",
    label: "Dentista / clínica odontológica",
    termoBusca: "dentista",
    includedType: "dentist",
    primaryTypes: ["dentist", "dental_clinic"],
    tier: "ALTO",
  },
  {
    slug: "clinica-estetica",
    label: "Clínica de estética / harmonização",
    termoBusca: "clínica de estética",
    includedType: "skin_care_clinic",
    primaryTypes: ["skin_care_clinic", "beauty_salon"],
    tier: "ALTO",
  },
  {
    slug: "dermatologista",
    label: "Dermatologista",
    termoBusca: "dermatologista",
    primaryTypes: ["dermatologist", "doctor"],
    tier: "ALTO",
  },
  {
    slug: "clinica-medica",
    label: "Clínica médica / especialista",
    termoBusca: "clínica médica",
    includedType: "medical_clinic",
    primaryTypes: ["medical_clinic", "doctor"],
    tier: "ALTO",
  },
  {
    slug: "fisioterapia",
    label: "Fisioterapia / pilates",
    termoBusca: "fisioterapia",
    includedType: "physiotherapist",
    primaryTypes: ["physiotherapist"],
    tier: "ALTO",
  },
  {
    slug: "psicologo",
    label: "Psicólogo / clínica de psicologia",
    termoBusca: "psicólogo",
    // Sem `includedType`: `psychologist` NÃO existe na Table A do Places e
    // derrubava toda busca deste nicho com 400 (F033, emenda de 2026-08-19).
    // `medical_clinic` é o que o Places devolve de verdade — 59 de 60
    // resultados em GO/PR/SP quando a emenda foi medida. Está aqui pro Tier
    // resolver; `psychologist` fica como leitura, nunca como filtro.
    primaryTypes: ["medical_clinic", "psychologist"],
    tier: "ALTO",
  },
  {
    slug: "nutricionista",
    label: "Nutricionista",
    termoBusca: "nutricionista",
    // Mesmo caso do psicólogo: `nutritionist` não existe na Table A.
    // `consultant` é o que o Places devolve de verdade (59 de 60 em GO/PR/SP).
    // Genérico de propósito — ver a nota no playbook sobre o que isso promove
    // junto, e por que preferimos isso a deixar o nicho inteiro em BAIXO.
    primaryTypes: ["consultant", "nutritionist", "doctor"],
    tier: "ALTO",
  },
  {
    slug: "veterinaria",
    label: "Clínica veterinária / hospital vet",
    termoBusca: "clínica veterinária",
    includedType: "veterinary_care",
    primaryTypes: ["veterinary_care"],
    tier: "ALTO",
  },
  {
    slug: "oftalmologista",
    label: "Oftalmologista / clínica de olhos",
    termoBusca: "oftalmologista",
    primaryTypes: ["doctor"],
    tier: "ALTO",
  },
  {
    slug: "advogado",
    label: "Advogado / escritório de advocacia",
    termoBusca: "advogado",
    includedType: "lawyer",
    primaryTypes: ["lawyer"],
    tier: "ALTO",
  },
  {
    slug: "contador",
    label: "Contador / contabilidade",
    termoBusca: "contabilidade",
    includedType: "accounting",
    primaryTypes: ["accounting"],
    tier: "ALTO",
  },
  {
    slug: "arquiteto",
    label: "Arquiteto / escritório de arquitetura",
    termoBusca: "arquiteto",
    primaryTypes: ["architect"],
    tier: "ALTO",
  },
  {
    slug: "engenharia",
    label: "Engenheiro / engenharia",
    termoBusca: "engenharia",
    primaryTypes: [],
    tier: "ALTO",
  },
  {
    slug: "imobiliaria",
    label: "Imobiliária / corretor de imóveis",
    termoBusca: "imobiliária",
    includedType: "real_estate_agency",
    primaryTypes: ["real_estate_agency"],
    tier: "ALTO",
  },
  {
    slug: "construtora",
    label: "Construtora",
    termoBusca: "construtora",
    primaryTypes: [],
    tier: "ALTO",
  },

  // ---- Tier MÉDIO: movimento alto, ticket/maturidade irregular ----
  {
    slug: "restaurante",
    label: "Restaurante / cafeteria",
    termoBusca: "restaurante",
    includedType: "restaurant",
    primaryTypes: ["restaurant", "cafe"],
    tier: "MEDIO",
  },
  {
    slug: "academia",
    label: "Academia / box de crossfit",
    termoBusca: "academia",
    includedType: "gym",
    primaryTypes: ["gym", "fitness_center"],
    tier: "MEDIO",
  },
  {
    slug: "salao",
    label: "Salão / barbearia / spa",
    termoBusca: "barbearia",
    includedType: "barber_shop",
    primaryTypes: ["hair_salon", "barber_shop", "spa"],
    tier: "MEDIO",
  },
  {
    slug: "pet-shop",
    label: "Pet shop",
    termoBusca: "pet shop",
    includedType: "pet_store",
    primaryTypes: ["pet_store"],
    tier: "MEDIO",
  },
  {
    slug: "otica",
    label: "Ótica",
    termoBusca: "ótica",
    primaryTypes: ["optician"],
    tier: "MEDIO",
  },
  {
    slug: "escola-idiomas",
    label: "Escola de idiomas / curso",
    termoBusca: "escola de idiomas",
    includedType: "school",
    primaryTypes: ["school"],
    tier: "MEDIO",
  },
  {
    slug: "oficina",
    label: "Oficina mecânica / funilaria",
    termoBusca: "oficina mecânica",
    includedType: "car_repair",
    primaryTypes: ["car_repair"],
    tier: "MEDIO",
  },
  {
    slug: "tatuagem",
    label: "Estúdio de tatuagem",
    termoBusca: "estúdio de tatuagem",
    primaryTypes: [],
    tier: "MEDIO",
  },
];

export const NICHOS_POR_SLUG = new Map(NICHOS.map((n) => [n.slug, n]));

/** Grupos do dropdown — alto valor primeiro, que é onde está o dinheiro. */
export const GRUPOS_NICHO: { titulo: string; tier: Tier }[] = [
  { titulo: "Alto valor", tier: "ALTO" },
  { titulo: "Médio", tier: "MEDIO" },
];

/** Escape hatch: mantém a busca livre da F001 disponível. */
export const NICHO_OUTRO = "outro";

/**
 * `primaryType` do Places → rótulo em português.
 *
 * O campo `categoria` do Lead guarda o `primaryType` cru que o Google devolve
 * (`dentist`, `beauty_salon`, `car_repair`), então a UI mostrava inglês. O mapa
 * sai do próprio catálogo: `primaryTypes` já lista o que o Places devolve para
 * cada nicho, e `label` é o nome que o aluno escolheu no dropdown.
 *
 * O primeiro nicho que reivindica um tipo ganha o rótulo — alguns tipos são
 * compartilhados (`doctor` aparece em Dermatologista e Clínica médica), e como
 * `NICHOS` segue a ordem do playbook, o mais específico vem antes.
 */
const ROTULO_POR_TIPO = new Map<string, string>();
for (const nicho of NICHOS) {
  for (const tipo of nicho.primaryTypes) {
    if (!ROTULO_POR_TIPO.has(tipo)) ROTULO_POR_TIPO.set(tipo, nicho.label);
  }
}

/**
 * Rótulo de exibição de uma categoria. Sem correspondência no catálogo — e o
 * Places devolve centenas de tipos — devolve o tipo cru legível
 * (`hair_salon` → `Hair salon`): melhor que esconder o dado.
 */
export function rotuloCategoria(categoria: string): string {
  const conhecido = ROTULO_POR_TIPO.get(categoria);
  if (conhecido) return conhecido;
  const limpo = categoria.replaceAll("_", " ").trim();
  if (limpo.length === 0) return categoria;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

export type { Tier };
