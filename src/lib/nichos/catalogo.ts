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
    includedType: "psychologist",
    primaryTypes: ["psychologist"],
    tier: "ALTO",
  },
  {
    slug: "nutricionista",
    label: "Nutricionista",
    termoBusca: "nutricionista",
    includedType: "nutritionist",
    primaryTypes: ["nutritionist", "doctor"],
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

export type { Tier };
