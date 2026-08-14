// Tutorial Google Places adaptado ao BYOK (F016).
// Conteúdo derivado de docs/tutorial-google-places.md.

import Link from "next/link";

export const dynamic = "force-dynamic";

const PASSOS = [
  {
    titulo: "Ative o 2FA da conta Google",
    corpo:
      "Sem verificação em duas etapas o Cloud Console bloqueia a criação de projeto. Ative em myaccount.google.com/security.",
  },
  {
    titulo: "Crie um projeto no Google Cloud",
    corpo:
      "Em console.cloud.google.com → seletor de projeto → Novo projeto. Confirme que ele ficou selecionado.",
  },
  {
    titulo: "Ative as APIs",
    corpo:
      "Em APIs e serviços → Biblioteca, ative Places API (New) e PageSpeed Insights API.",
  },
  {
    titulo: "Vincule o faturamento",
    corpo:
      "Maps Platform exige conta de faturamento com cartão, mesmo dentro da cota gratuita. Sem billing a Places API falha. Crie um orçamento/alerta baixo pra não ter surpresa.",
  },
  {
    titulo: "Crie a chave",
    corpo:
      "Credenciais → Criar credenciais → Chave de API. Ela começa com AIza… — copie antes de fechar.",
  },
  {
    // O passo que mais trava aluno: a tela pede DUAS restrições e a intuição
    // erra na primeira. "Sites (referenciadores HTTP)" parece a resposta certa
    // e derruba tudo com 403 — o Orion chama o Google do servidor, onde não
    // existe cabeçalho `Referer`.
    titulo: "Restrições de aplicativo: escolha Nenhuma",
    corpo:
      "Parece errado, mas as outras opções quebram: 'Sites' só vale pra chamada feita pelo navegador, e o Orion chama o Google do servidor — toda busca voltaria 403. 'Endereços IP' exigiria um IP de saída fixo, que a hospedagem não garante. A sua chave não corre risco por isso: ela fica cifrada no banco e nunca chega ao navegador.",
  },
  {
    titulo: "Restrições de API: só as duas",
    corpo:
      "Esta é a que protege de verdade. Marque apenas Places API (New) e PageSpeed Insights API — se a chave vazar, ela não serve pra mais nada.",
  },
  {
    titulo: "Ponha um teto de cota",
    corpo:
      "Em APIs e serviços → Places API (New) → Cotas, limite as requisições por dia. A restrição de API decide QUAL API a chave abre; a cota decide QUANTO ela pode gastar. É o que transforma um vazamento em aborrecimento em vez de fatura.",
  },
  {
    titulo: "Cole em Configuração",
    corpo:
      "Volte ao app → Configuração → slot Google (Places + PageSpeed) → Salvar → Testar chave. Não use mais o .env pra isso.",
  },
] as const;

export default function TutorialGooglePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm text-muted">
        <Link href="/configuracao" className="hover:text-primary">
          ← Configuração
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        Como criar a chave Google
      </h1>
      <p className="mt-2 text-sm text-muted">
        Cada aluno usa a <strong className="text-zinc-300">própria</strong> chave
        de API. O custo da coleta fica na sua conta Google.
      </p>

      <ol className="mt-8 space-y-4">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="card">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              Passo {i + 1}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-zinc-100">
              {p.titulo}
            </h2>
            <p className="mt-2 text-sm text-muted">{p.corpo}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/configuracao" className="btn-primary">
          Voltar e colar a chave
        </Link>
        <a
          href="https://console.cloud.google.com"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost px-3 py-2 text-sm"
        >
          Abrir Google Cloud
        </a>
      </div>
    </main>
  );
}
