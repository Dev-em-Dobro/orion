// F035 — o interruptor da UI de planos.
// Spec: /specs/02-features/F035-planos-e-limites.md ("Pausa de 2026-08-17")
//
// `false` desde 2026-08-17: todo mundo entra no Free, e enquanto não existe
// plano pago configurado na Hubla não há nada pra comparar nem pra assinar.
// Com isso `/planos` responde 404 e nenhuma tela diz "plano" — o que continua
// aparecendo é o uso (`usado / limite`), que é verdade sem plano nenhum.
//
// Ligar de volta é trocar por `true`. Nada foi apagado: cada ponto de exibição
// pergunta por esta constante. Os limites são cobrados do mesmo jeito nos dois
// estados — isto é exibição, não regra.
//
// Sem import de propósito: Client Component lê daqui, e o barrel `@/lib/planos`
// puxaria Prisma pro bundle do navegador.

// Anotado como `boolean` de propósito: sem isso o tipo é o literal `false` e o
// TypeScript trata metade dos ramos guardados como código morto — que é o ramo
// que precisa continuar sendo checado, porque é ele que volta.
export const PLANOS_NA_UI: boolean = false;
