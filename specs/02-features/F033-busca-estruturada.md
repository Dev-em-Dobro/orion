# F033 — Busca estruturada de Leads (localidade e nicho controlados)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase C)

Substitui a seção **Input (UI)** da [F001](F001-coleta-de-leads.md); o resto da
F001 (paginação, dedupe por `place_id`, cota) continua valendo.

> **Correção de 2026-08-11 — a busca estava quebrada desde a entrega.** O
> schema virou o da F033 (`nicho`, `uf`, `municipio`, `bairro`, `quantidade`),
> mas a leitura do `FormData` na Server Action continuou a da F001
> (`termo`, `localizacao`). Todo campo chegava vazio; o Zod reclamava do
> primeiro e a tela mostrava o literal **"Required"**. Nenhuma busca funcionou.
>
> Passou porque nada verificava que os dois lados usavam o mesmo vocabulário: a
> validação vivia dentro da action, onde não havia teste. Agora mora em
> `src/lib/leads/busca.ts`, e `tests/unit/leads-busca.test.ts` lê os `name=` do
> próprio formulário e exige que cada campo de `CAMPOS_BUSCA` exista lá.
>
> Junto veio um segundo problema: `FormData.get` devolve `null` para campo
> ausente, e o `required_error` do Zod só dispara em `undefined`. Sem
> `invalid_type_error`, faltar um campo produzia "Expected string, received
> null". Todo campo obrigatório declara as duas mensagens.

## Objetivo
Trocar os dois campos de texto livre (`termo` + `localizacao`) por uma busca
**estruturada**: `UF → município → bairro (opcional)` e **nicho em dropdown**.

Não é só ergonomia — é correção de um erro silencioso do score. A
[F003](F003-score-e-priorizacao.md) deriva o **Tier de nicho** da `categoria`
que o Places devolve, e "categoria não mapeada → BAIXO". Quando o aluno digita
"clínica" e o Places classifica como `point_of_interest`, o Lead cai em Tier
BAIXO **sem ninguém perceber** — um dentista de alto valor afunda na fila. Com
nicho controlado, sabemos o Tier **antes** da busca e podemos pedir ao Places
exatamente o tipo certo.

## Conceitos

### Nicho (novo, controlado)
Lista fechada derivada do [playbook de nichos](../05-playbook/nichos-alto-valor.md)
— que passa a ser a **fonte única** também do dropdown, não só do mapa de Tier.
Cada entrada tem:

| Campo | Exemplo |
|-------|---------|
| `slug` | `dentista` |
| `label` | "Dentista / clínica odontológica" |
| `termoBusca` | `"dentista"` (o que vai no `textQuery`) |
| `includedType` | `dentist` (quando há um `primaryType` único e confiável) |
| `tier` | `ALTO` |

O dropdown é **agrupado por Tier** ("Alto valor" primeiro), com o Tier visível
em cada opção — a UI vira playbook: o aluno aprende onde está o dinheiro só de
abrir a lista. Última opção: **"Outro (digitar)"**, que reabre o campo livre —
nada do que dá pra fazer hoje é perdido.

### Localidade
- **UF** — 27 unidades federativas (constante em código).
- **Município** — base do IBGE, **estática**, gerada uma vez por script. Não é
  chamada de API em runtime: é um JSON versionado no repo.
- **Bairro** — texto livre opcional (não existe base confiável e gratuita de
  bairros; entra direto no `textQuery`).

Fora do Brasil fica de fora (ver Fora do escopo): o `regionCode: "BR"` do
contrato já assume Brasil hoje.

### Quantidade

> **Mudança de 2026-08-13 — teto de 100 por busca.** Os botões passam de
> `20 · 40 · 60` para **`20 · 60 · 100`** (padrão **20**), e **100 é o teto
> duro**: não existe caminho que colete mais que isso de uma vez.

Traduzem-se em páginas do Places (`PLACES_PAGE_SIZE = 20`):

| Botão | Páginas lidas | Descartados | Custo Places |
|-------|---------------|-------------|--------------|
| 20 | 1 | 0 | $0,035 |
| 60 | 3 | 0 | $0,105 |
| 100 | 5 | 0 | $0,175 |

**Os três caem em fronteira de página** — nenhum resultado pago é jogado fora.
Foi o critério de escolha: `25 · 50 · 100` daria números mais redondos na tela,
mas 25 pagaria 2 páginas pra entregar 25 e 50 pagaria 3 pra entregar 50, e o
piso da busca dobraria de $0,035 pra $0,070. Como
[11 — Custos](../11-custos-e-precificacao.md) mostra, a busca é o insumo caro do
Orion (uma busca ≈ 4 Abordagens) e o free tier do Google são 1.000 requisições
por mês — o piso decide quantos alunos Free cabem sem custo (~330 com 1 página,
~165 com 2).

`PLACES_MAX_PAGES = 5` deixa de ser só limite de segurança e passa a ser o teto
efetivo da opção maior.

O que a mudança original resolve continua valendo: antes da F033 **toda** coleta
paginava 5× (~100 estabelecimentos), o aluno querendo ou não. Agora é escolha
explícita, e o padrão é o menor.

## Montagem da consulta
```
textQuery   = [nicho.termoBusca, bairro?, municipio, uf].join(" ")   // "dentista Batel Curitiba PR"
includedType = nicho.includedType   // omitido quando o nicho não tem tipo único, ou no modo "Outro"
regionCode   = "BR"
languageCode = "pt-BR"
maxResultCount = 20 (por página)
```

`includedType` é campo suportado pelo Text Search da Places API (New) e
**restringe** o resultado àquele tipo. Efeitos: menos ruído, e `primaryType`
previsível → Tier confiável. **Não muda o SKU cobrado** (o SKU é definido pela
FieldMask, que não muda) — a confirmar contra a tabela de preços vigente antes
de ligar em produção. O contrato
[google-places](../03-contracts/google-places.md) é atualizado com o campo.

Se a busca com `includedType` voltar **vazia**, a lib repete **uma vez** sem o
campo e avisa na UI ("nenhum resultado com o tipo exato; ampliamos a busca") —
assim o filtro nunca deixa o aluno sem resposta.

## UI
```
[ Brasil ▾ ] [ PR ▾ ] [ Curitiba ▾ ] [ Bairro (opcional) ] [ Dentista ▾ ] [ Buscar ]
 Quantidade  (20)  60   100                       20 coletados · 14 sem site
```
- Município **desabilitado** até escolher a UF ("Escolha o estado primeiro").
- Município com busca por digitação (são até ~850 numa UF).
- A última busca fica lembrada (UF + município) via query string na URL — o
  aluno costuma buscar vários nichos na mesma cidade.
- Depois da busca, o resumo mostra `N coletados · N sem site`, e os resultados
  aparecem como cards ([F032](F032-interface-do-orion.md)) já triados
  ([F025](F025-fila-do-dia.md)).

## Modelo de dados
**Nenhuma mudança.** A busca não é persistida; `Lead.categoria` continua vindo
do `primaryType` do Places (o nicho escolhido é entrada, não campo do domínio).

## Emenda 2026-08-14 — o formulário para de apagar o que o aluno escolheu

Três defeitos do formulário de busca, achados em uso:

**1. Nicho vinha pré-selecionado.** O `<select>` abria já no primeiro item da
lista (`NICHOS[0]`). Quem não reparasse no campo buscava *dentista* achando que
tinha escolhido — e o erro só aparecia depois de a consulta ao Google ser
cobrada. Agora começa vazio, com **"Selecione o nicho"** e `required`.

**2. Cidade e bairro sumiam a cada busca.** Eram campos **não controlados**, e
`<form action>` do React limpa campo não controlado quando a ação termina. Nicho,
UF e quantidade sobreviviam (estado de cliente) e cidade/bairro/texto livre não —
o que dava a impressão de "reset aleatório". Todos passam a ser controlados.
Trocar de UF continua limpando a cidade, de propósito: "Porto Alegre" com o
estado em SP é busca que não acha nada e não diz por quê.

**3. O campo de cidade abria torto.** Era `<input list>` + `<datalist>`, e quem
desenha o painel do `datalist` é o navegador: com as ~500 cidades de uma UF, o
Chrome abre um painel do tamanho do conteúdo, encostado onde couber — às vezes
ao **lado** do campo. `datalist` não é estilizável, então não havia CSS que
resolvesse. Trocado por um combobox próprio (`src/components/combobox.tsx`):
painel ancorado **embaixo** do campo, teto de altura com rolagem, navegação por
setas/Enter/Escape (padrão de combobox da WAI-ARIA). **Sem lib nova** → sem ADR.

### Critérios de aceitação da emenda
- [ ] **AC9** — O nicho começa em "Selecione o nicho" e a busca não envia sem
      escolha.
- [ ] **AC10** — Depois de buscar, nicho, UF, cidade, bairro e quantidade
      continuam preenchidos como estavam.
- [ ] **AC11** — O painel de cidade abre abaixo do campo, com altura máxima e
      rolagem, e é operável por teclado.

## Critérios de aceitação
- [ ] **AC1** — Selecionar UF habilita o select de município com os municípios
      daquela UF; sem UF, o de município fica desabilitado com dica.
- [ ] **AC2** — Buscar "Dentista · PR · Curitiba" monta
      `textQuery = "dentista Curitiba PR"` com `includedType = "dentist"`.
- [ ] **AC3** — Com bairro preenchido, ele entra no `textQuery` antes do
      município.
- [ ] **AC4** — Nicho "Outro (digitar)" reabre o campo livre e busca sem
      `includedType` — o comportamento de hoje continua disponível.
- [ ] **AC5** — Quantidade 20/60/100 lê no máximo 1/3/5 páginas do Places
      (verificado com fetch mockado contando chamadas).
- [ ] **AC5b** — **100 é teto duro**: `quantidade` fora de {20, 60, 100} é
      rejeitada no schema da busca, não só ausente na UI. Nenhum caminho coleta
      mais de 100 numa chamada.
- [ ] **AC6** — Busca com `includedType` sem resultado refaz **uma** vez sem o
      campo e sinaliza isso na UI.
- [ ] **AC7** — A lista de nichos do dropdown bate 1:1 com o playbook
      (teste que compara as duas fontes e falha se divergirem).
- [ ] **AC8** — O JSON de municípios **não** vai pro bundle do cliente: o
      select carrega só a UF escolhida, via route handler.
- [ ] **AC9** — Input inválido (UF inexistente, município que não pertence à
      UF) → `{ erro }` na UI, sem chamar o Places nem consumir cota.
- [ ] **AC10** — Cota, dedupe por `place_id` e tratamento de erro do Places
      continuam como na F001 (sem regressão).

## Decisões de implementação
- `src/lib/nichos/catalogo.ts` — lista derivada do playbook (`slug`, `label`,
  `termoBusca`, `includedType`, `tier`). O mapa de Tier da F003 passa a **ler
  daqui**, eliminando a duplicação atual entre playbook e `src/lib/score/`.
- `scripts/gerar-municipios.mts` — script pontual (padrão do
  `seed-hubla-compradores.mts`, roda com `tsx`) que baixa a lista do IBGE e
  grava `src/lib/localidades/municipios.json` (~5.570 registros: nome, UF).
  **Roda uma vez**, não em build nem em runtime.
- `src/app/api/localidades/[uf]/route.ts` — devolve os municípios de uma UF.
- `textSearch` ganha `opcoes?: { includedType?: string; paginas?: number }`,
  mantendo a assinatura atual compatível.
- Sem lib nova (o JSON é dado, não dependência) → **sem ADR**.

## Fora do escopo (F033)
- Países além do Brasil (a referência tem seletor de país; o `regionCode` do
  contrato é `BR`).
- Base de bairros / CEP / geocoding / raio em km.
- Busca por múltiplos nichos ou múltiplas cidades de uma vez.
- Buscas salvas, agendadas ou repetidas automaticamente (esbarra no ADR-002).
- Mudar Tier de nicho — isso é editar o playbook, que continua sendo a fonte.

## Custo estimado
**$0** de infra nova. Em Places, tende a **reduzir** custo: a coleta padrão cai
de até 5 páginas para 1 (20 resultados), e o aluno escolhe pagar mais só quando
quer mais.
