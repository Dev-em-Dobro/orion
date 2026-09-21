// Comparação de token de webhook em tempo constante (F019, F041).
//
// Mora aqui e não em `env-servidor.ts` porque precisa de `node:crypto` e
// `Buffer`: aquele módulo é importado pelo instrumentation e roda no Edge, que
// não aceita o scheme `node:`. Quem importa este arquivo precisa declarar
// `runtime = "nodejs"` — o que as duas rotas de webhook já fazem.

import { timingSafeEqual } from "node:crypto";

/**
 * `recebido === esperado` sem que o tempo de resposta conte quantos caracteres
 * bateram antes de divergir.
 *
 * O **tamanho** do token ainda escapa pelo retorno antecipado, e isso é
 * inevitável: `timingSafeEqual` exige buffers do mesmo tamanho, então comparar
 * tamanho é pré-requisito, não descuido. O que se protege é o conteúdo.
 */
export function tokenValido(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
