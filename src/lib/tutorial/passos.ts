// F039 — os cinco passos do tutorial guiado, e a regra de "feito".
// Spec: /specs/02-features/F039-primeiros-passos.md
//
// Sem Next e sem Prisma de propósito: quem consulta o banco é
// `consultar.ts`, e o que decide o estado de cada passo é a função pura daqui.
// É ela que os testes exercitam (AC3 a AC7).

import { APROFUNDAR_EXPLICACAO } from "@/lib/leads/aprofundamento";

export type PassoId =
  | "chaves"
  | "buscar"
  | "aprofundar"
  | "abordar"
  | "funil";

export type Passo = {
  id: PassoId;
  titulo: string;
  /** O que é, em uma frase. */
  oQueE: string;
  /** Por que existe — a frase que faz o aluno querer fazer. */
  porQue: string;
  /** Onde se faz. Só o passo atual mostra o botão (ver "UI" na spec). */
  acao: { href: string; label: string };
};

/**
 * Os números da base do aluno que decidem cada passo. Um objeto e não cinco
 * argumentos: a ordem de cinco booleanos é exatamente o tipo de coisa que se
 * troca sem o compilador reclamar.
 */
export type FatosDoAluno = {
  /** Quantas chaves essenciais faltam (F016). No modo Orion é sempre 0. */
  chavesFaltando: number;
  /** F018 — no modo Orion o passo das chaves **não entra na lista**. */
  modoOrion: boolean;
  leads: number;
  /** F025 — `score_estimado = false`: score confirmado por Diagnóstico. */
  leadsConfirmados: number;
  abordagensGeradas: number;
  abordagensEnviadas: number;
  /** Leads em estágio **além** de `contatado` — ver passo 5 na spec. */
  leadsAlemDeContatado: number;
};

export type PassoComEstado = Passo & {
  feito: boolean;
  /** O primeiro não feito. Único com botão. */
  atual: boolean;
  /** Uma linha com o número da base, ou com o que falta. */
  detalhe: string | null;
};

export type EstadoDosPassos = {
  passos: PassoComEstado[];
  feitos: number;
  total: number;
  concluido: boolean;
};

/** "1 Lead" / "2 Leads" — sem o "(s)" que aparece na tela como gagueira. */
function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Catálogo. A ordem do array **é** a ordem do trabalho — não há campo `ordem`
 * pra sair de sincronia com ela.
 */
export const PASSOS: Passo[] = [
  {
    id: "chaves",
    titulo: "Ligue as chaves",
    oQueE:
      "O Orion trabalha com duas chaves: a do Google, que acha os estabelecimentos e mede os sites, e a de IA, que escreve a Abordagem.",
    porQue:
      "Sem elas nenhum botão do app funciona — a busca não roda e o texto não sai.",
    acao: { href: "/configuracao", label: "Ir para Configuração" },
  },
  {
    id: "buscar",
    titulo: "Busque estabelecimentos",
    oQueE:
      "Escolha o nicho e a cidade. O Orion traz os negócios do Google e já faz a Triagem: quem tem site ruim ou não tem site sobe na lista.",
    porQue:
      "É daqui que vem todo o resto. Comece por um nicho de alto valor perto de você — atender presencialmente é vantagem sua.",
    acao: { href: "/leads", label: "Fazer a primeira busca" },
  },
  {
    id: "aprofundar",
    titulo: "Aprofunde os melhores",
    // A melhor explicação do termo no app inteiro já existe e cita o tamanho do
    // lote e o custo em cota. Reusada, não reescrita: se o lote mudar, esta
    // tela muda junto.
    oQueE: APROFUNDAR_EXPLICACAO,
    porQue:
      "Score chutado pela Triagem não sustenta uma conversa. Depois do Diagnóstico você chega sabendo o que está quebrado no negócio do cara.",
    acao: { href: "/", label: "Ir para a Fila do dia" },
  },
  {
    id: "abordar",
    titulo: "Aborde o primeiro da fila",
    oQueE:
      "Abra o Lead, vá na aba Abordagem e gere o texto. Ele sai da Dor que o Diagnóstico achou naquele negócio, não de um modelo genérico.",
    porQue:
      "Mande pelo WhatsApp e marque como enviada — é a marcação que move o Lead pro funil e liga a cobrança de follow-up.",
    acao: { href: "/", label: "Ir para a Fila do dia" },
  },
  {
    id: "funil",
    titulo: "Registre o que aconteceu",
    oQueE:
      "Respondeu? Virou proposta? Fechou? Arraste o card do Lead para a coluna certa no Funil.",
    porQue:
      "É o que fecha o ciclo: o Dashboard só diz a verdade sobre o seu mês se o funil estiver em dia — e é de lá que sai a sua taxa de conversão.",
    acao: { href: "/funil", label: "Abrir o Funil" },
  },
];

/** Regra de "feito" de cada passo. Uma linha por passo, e nada além disso. */
function estaFeito(id: PassoId, f: FatosDoAluno): boolean {
  switch (id) {
    case "chaves":
      return f.chavesFaltando === 0;
    case "buscar":
      return f.leads > 0;
    case "aprofundar":
      return f.leadsConfirmados > 0;
    // Gerar texto não é abordar: o que conta é o envio marcado.
    case "abordar":
      return f.abordagensEnviadas > 0;
    // `contatado` sai de graça ao marcar a Abordagem como enviada — se o passo
    // parasse ali, ele se daria por feito junto com o 4, sem o aluno tocar no
    // funil. Ver "passo 5" na spec.
    case "funil":
      return f.leadsAlemDeContatado > 0;
  }
}

/** A linha de número (feito) ou de pendência (não feito). */
function detalheDo(id: PassoId, f: FatosDoAluno, feito: boolean): string | null {
  switch (id) {
    // No modo Orion este passo nem chega aqui: ele sai da lista em
    // `passosComEstado`. Sobra o BYOK, onde configurar é trabalho de verdade.
    case "chaves":
      return feito
        ? "Chaves configuradas."
        : `${plural(f.chavesFaltando, "chave essencial", "chaves essenciais")} faltando.`;
    case "buscar":
      return feito ? `${plural(f.leads, "Lead", "Leads")} na sua base.` : null;
    case "aprofundar":
      if (feito) return `${plural(f.leadsConfirmados, "Lead", "Leads")} com score confirmado.`;
      return f.leads > 0
        ? `${plural(f.leads, "Lead", "Leads")} esperando Diagnóstico.`
        : null;
    case "abordar":
      if (feito) {
        return `${plural(f.abordagensEnviadas, "Abordagem enviada", "Abordagens enviadas")}.`;
      }
      // O erro mais provável do aluno novo: gerou o texto, mandou pelo
      // WhatsApp e não voltou pra marcar. Sem a marcação o Lead não entra no
      // funil e a Central de Tarefas (F031) não cobra nada.
      return f.abordagensGeradas > 0
        ? `${plural(f.abordagensGeradas, "Abordagem gerada", "Abordagens geradas")} e nenhuma marcada como enviada.`
        : null;
    case "funil":
      return feito
        ? `${plural(f.leadsAlemDeContatado, "Lead andou", "Leads andaram")} no funil.`
        : null;
  }
}

/**
 * Os passos com estado. **Passo feito não some** (a sequência é a aula): o que
 * muda é o destaque, que vai pro primeiro não feito.
 *
 * A exceção é o passo das chaves no modo Orion, que sai da lista inteira. Não
 * é passo feito, é passo que nunca existiu pra esse aluno — ele saía marcado
 * com "Chaves da plataforma — nada a fazer aqui", que é um item de tutorial
 * ensinando a não fazer nada. O contador vira "de 4".
 */
export function passosComEstado(fatos: FatosDoAluno): EstadoDosPassos {
  const doAluno = PASSOS.filter(
    (p) => !(p.id === "chaves" && fatos.modoOrion),
  );

  const feitos = doAluno.map((p) => estaFeito(p.id, fatos));
  const indiceAtual = feitos.indexOf(false);

  const passos: PassoComEstado[] = doAluno.map((passo, i) => ({
    ...passo,
    feito: feitos[i] ?? false,
    atual: i === indiceAtual,
    detalhe: detalheDo(passo.id, fatos, feitos[i] ?? false),
  }));

  return {
    passos,
    feitos: feitos.filter(Boolean).length,
    total: doAluno.length,
    concluido: indiceAtual === -1,
  };
}
