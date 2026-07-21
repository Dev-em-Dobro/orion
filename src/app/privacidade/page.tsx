// Política de Privacidade — página pública (LGPD / deploy).

import type { Metadata } from "next";
import { PaginaLegal } from "@/components/pagina-legal";
import { OPERADOR_LEGAL } from "@/lib/legal";
import { NOME_PRODUTO } from "@/lib/produto";

export const metadata: Metadata = {
  title: `Política de Privacidade · ${NOME_PRODUTO}`,
  description: `Como o ${NOME_PRODUTO} trata dados pessoais e chaves de API (LGPD).`,
};

export default function PrivacidadePage() {
  const { nome, produto, emailPrivacidade } = OPERADOR_LEGAL;

  return (
    <PaginaLegal titulo="Política de Privacidade">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          1. Quem controla os dados
        </h2>
        <p>
          O controlador dos dados tratados no {produto} é {nome}. Contato
          para titulares:{" "}
          <a
            href={`mailto:${emailPrivacidade}`}
            className="text-primary hover:underline"
          >
            {emailPrivacidade}
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          2. Quais dados tratamos
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-zinc-100">Conta:</strong>{" "}
            e-mail, nome (quando o provedor OAuth informar), identificadores de
            sessão e metadados de autenticação (Better Auth).
          </li>
          <li>
            <strong className="font-medium text-zinc-100">
              Chaves de API (BYOK):
            </strong>{" "}
            valores que você cola em Configuração. São{" "}
            <strong className="font-medium text-zinc-100">
              cifrados em repouso
            </strong>{" "}
            (AES-256-GCM com chave-mestra do servidor) e{" "}
            <strong className="font-medium text-zinc-100">
              nunca exibidos em claro
            </strong>{" "}
            de volta na interface. Servem só para chamar os provedores em seu
            nome.
          </li>
          <li>
            <strong className="font-medium text-zinc-100">
              Leads e Diagnósticos:
            </strong>{" "}
            dados de estabelecimentos obtidos de{" "}
            <strong className="font-medium text-zinc-100">
              fontes públicas
            </strong>{" "}
            (ex.: Google Places, PageSpeed) e resultados gerados pelo app
            (scores, textos de Outreach, etc.), sempre isolados à sua conta.
          </li>
          <li>
            <strong className="font-medium text-zinc-100">Uso técnico:</strong>{" "}
            logs de erro/operacionais mínimos necessários para manter o
            serviço (sem gravar o valor das chaves).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          3. Para que usamos
        </h2>
        <p>Finalidades:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>autenticar e manter sua sessão;</li>
          <li>executar as features do produto na sua conta (coleta, diagnóstico, IA);</li>
          <li>segurança, prevenção a abuso e suporte;</li>
          <li>cumprir obrigações legais quando aplicável.</li>
        </ul>
        <p>
          Base legal típica (LGPD): execução de contrato / procedimentos
          preliminares (art. 7º, V) e legítimo interesse para segurança e
          melhoria operacional (art. 7º, IX), sem prejuízo de outras bases
          cabíveis.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          4. Compartilhamento
        </h2>
        <p>
          Compartilhamos dados com subprocessadores necessários ao serviço,
          por exemplo: hospedagem (ex.: Vercel), banco (ex.: Neon), e-mail
          transacional do magic link, e os provedores de API{" "}
          <em>que você escolheu</em> (Google, Anthropic, OpenAI, Google AI,
          ScreenshotOne), quando você dispara uma ação que usa a chave
          correspondente. Não vendemos dados pessoais.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">5. Retenção</h2>
        <p>
          Mantemos os dados enquanto a conta existir e for necessária à
          prestação do serviço. Você pode solicitar exclusão da conta e dos
          dados associados pelo contato acima; atenderemos no prazo legal,
          ressalvadas retenções obrigatórias.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          6. Seus direitos (LGPD)
        </h2>
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção,
          anonimização/bloqueio/eliminação quando cabível, portabilidade e
          informação sobre compartilhamentos, além de revogar consentimento
          quando essa for a base. Também pode reclamar à ANPD.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">7. Segurança</h2>
        <p>
          Adotamos medidas técnicas e organizacionais razoáveis: isolamento
          multi-tenant por usuário, cifra das chaves BYOK, secrets de sessão
          sem default, HTTPS na hospedagem. Nenhum sistema é 100% seguro —
          reporte incidentes para {emailPrivacidade}.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">8. Contato</h2>
        <p>
          Pedidos de titulares e privacidade:{" "}
          <a
            href={`mailto:${emailPrivacidade}`}
            className="text-primary hover:underline"
          >
            {emailPrivacidade}
          </a>
          .
        </p>
      </section>
    </PaginaLegal>
  );
}
