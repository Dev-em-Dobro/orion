# F033 — Busca estruturada de Leads (localidade e nicho controlados)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase C)

Substitui a seção **Input (UI)** da [F001](F001-coleta-de-leads.md); o resto da
F001 (paginação, dedupe por `place_id`, cota) continua valendo.

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
Botões `20 · 40 · 60` (padrão **20**), como na referência. Traduzem-se em
páginas do Places: 1, 2 ou 3 (`PLACES_PAGE_SIZE = 20`). O teto atual
`PLACES_MAX_PAGES = 5` continua sendo o limite duro de segurança.

Isso resolve um problema real de custo: hoje **toda** coleta pagina até 5×
(~100 estabelecimentos, SKU Enterprise), o aluno querendo ou não. Passa a ser
escolha explícita.

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
 Quantidade  (20)  40   60                        20 coletados · 14 sem site
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

## Critérios de aceitação
- [ ] **AC1** — Selecionar UF habilita o select de município com os municípios
      daquela UF; sem UF, o de município fica desabilitado com dica.
- [ ] **AC2** — Buscar "Dentista · PR · Curitiba" monta
      `textQuery = "dentista Curitiba PR"` com `includedType = "dentist"`.
- [ ] **AC3** — Com bairro preenchido, ele entra no `textQuery` antes do
      município.
- [ ] **AC4** — Nicho "Outro (digitar)" reabre o campo livre e busca sem
      `includedType` — o comportamento de hoje continua disponível.
- [ ] **AC5** — Quantidade 20/40/60 lê no máximo 1/2/3 páginas do Places
      (verificado com fetch mockado contando chamadas).
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
