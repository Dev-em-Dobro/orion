// Termos de Uso — página pública (deploy / LGPD).

import type { Metadata } from "next";
import { PaginaLegal } from "@/components/pagina-legal";
import { OPERADOR_LEGAL } from "@/lib/legal";
import { NOME_PRODUTO } from "@/lib/produto";

export const metadata: Metadata = {
  title: `Termos de Uso · ${NOME_PRODUTO}`,
  description: `Termos de uso do ${NOME_PRODUTO} para alunos.`,
};

export default function TermosPage() {
  const { nome, produto, emailPrivacidade } = OPERADOR_LEGAL;

  return (
    <PaginaLegal titulo="Termos de Uso">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">1. Aceite</h2>
        <p>
          Ao criar conta ou usar o {produto}, você concorda com estes Termos.
          O serviço é oferecido por {nome} (“nós”, “operador”) para alunos em
          contexto educacional/profissional de prospecção de negócios locais.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          2. O que o serviço faz
        </h2>
        <p>
          O {produto} ajuda a: (a) coletar estabelecimentos a partir de
          fontes públicas (ex.: Google Places); (b) diagnosticar presença
          digital; (c) priorizar Leads; (d) gerar textos de Abordagem e
          conteúdos auxiliares via modelos de IA, usando as{" "}
          <strong className="font-medium text-zinc-100">
            chaves de API da plataforma
          </strong>
          , dentro dos limites do seu plano. Contas que já haviam configurado
          chaves próprias continuam podendo usá-las.
        </p>
        <p>
          O único canal de abordagem é o{" "}
          <strong className="font-medium text-zinc-100">WhatsApp</strong>, e o
          envio a terceiros é{" "}
          <strong className="font-medium text-zinc-100">manual</strong>: o app
          prepara o texto e você envia pelo seu próprio aplicativo. O {produto}{" "}
          não dispara mensagem em nome do Lead nem opera servidor de envio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          3. Conta e responsabilidade
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Você é responsável pela segurança da sua conta (login via Google
            e/ou magic link).
          </li>
          <li>
            O uso das APIs de terceiros (Google, provedores de IA) está
            incluído no seu plano, dentro dos limites publicados em{" "}
            <a href="/planos" className="text-primary hover:underline">
              Planos
            </a>
            . Se você optou por usar chaves próprias, é responsável por elas,
            pelos custos cobrados pelos provedores e pelo uso conforme os
            termos deles.
          </li>
          <li>
            Você não deve usar o serviço para spam, assédio, fraude ou qualquer
            finalidade ilegal. Leads são negócios locais com dado público;
            trate a comunicação com ética e conformidade.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          4. Dados e isolamento
        </h2>
        <p>
          Cada conta vê apenas os próprios Leads e dados (multi-tenant por
          usuário). Detalhes do tratamento de dados pessoais estão na{" "}
          <a href="/privacidade" className="text-primary hover:underline">
            Política de Privacidade
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          5. Disponibilidade e beta
        </h2>
        <p>
          O serviço pode estar em beta: funcionalidades, limites e estabilidade
          podem mudar. Não garantimos disponibilidade ininterrupta nem
          resultados comerciais a partir dos Abordagens gerados.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          6. Limitação de responsabilidade
        </h2>
        <p>
          Na máxima extensão permitida pela lei, {nome} não responde por
          lucros cessantes, custos de API de terceiros, bloqueios em contas
          Google/provedores de IA, ou decisões tomadas com base em Diagnósticos
          ou textos gerados. O app é ferramenta de apoio; o uso é seu.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">7. Contato</h2>
        <p>
          Dúvidas sobre estes Termos:{" "}
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
