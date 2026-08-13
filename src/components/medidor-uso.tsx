// F035 — medidor de uso da topbar (fechado: `12 / 60`; aberto: o detalhe).
// Spec: /specs/02-features/F035-planos-e-limites.md ("Medidor de uso")
//
// Fechado mostra o contador que importa — **Leads novos no mês**, que é o teto
// que o aluno esbarra primeiro. Aberto mostra os seis contadores mensais do
// plano. A cota diária da F018 saiu daqui em 2026-08-13: ela deixou de ser
// limite de produto e virou só freio anti-loop, então não é o que o aluno
// precisa acompanhar.

import { cache } from "react";
import { requireUser } from "@/lib/auth/require-user";
import {
  definicao,
  LABEL_OPERACAO_MENSAL,
  OPERACOES_MENSAIS,
  usoDoPlano,
  usoMensalCompleto,
} from "@/lib/planos";
import { MedidorUsoCliente, type ItemMensal } from "./medidor-uso-cliente";

/**
 * Memoizado por request (F028 H5): o medidor é renderizado duas vezes — na
 * topbar do desktop e no cabeçalho do mobile — e só uma das duas aparece por
 * viewport. Sem o `cache()` seriam duas rodadas de consulta pra desenhar uma.
 */
const carregar = cache(async () => {
  try {
    const user = await requireUser();
    const [uso, mensal] = await Promise.all([
      usoDoPlano(user.id),
      usoMensalCompleto(user.id, OPERACOES_MENSAIS),
    ]);
    return { uso, mensal };
  } catch {
    // Sem sessão (login, termos, privacidade): o shell renderiza sem medidor.
    // O middleware é quem cuida do redirect.
    return null;
  }
});

export async function MedidorUso({ className }: { className?: string }) {
  const dados = await carregar();
  if (!dados) return null;

  const { uso, mensal } = dados;
  const def = definicao(uso.plano);

  const itens: ItemMensal[] = mensal.map((u) => ({
    operacao: u.operacao,
    label: LABEL_OPERACAO_MENSAL[u.operacao],
    usado: u.usado,
    limite: u.limite,
  }));

  return (
    <MedidorUsoCliente
      className={className}
      usado={uso.usado}
      limite={uso.limite}
      fracao={uso.fracao}
      restante={uso.restante}
      planoNome={def.nome}
      mensal={itens}
    />
  );
}
