# F044 — Estatísticas de prospecção para o Builders Club

## Status
Em implementação — 2026-11-26. Consumidor: Desafio 45 dias do Builders Club
(F050 no repo `comunidade-builders-club`, fatia B, até 7/12/2026).

## Objetivo
O Builders Club mede as **abordagens frias** dos membros no Desafio 45 dias.
Elas vivem no Orion. Este endpoint devolve **só contagens** por Aluno, para o
Builders mostrar metas, farol e painel da equipe — sem copiar Leads e sem
juntar os bancos.

## Princípios
- **Bancos separados.** O Builders nunca lê o banco do Orion; consulta este
  endpoint com um segredo compartilhado.
- **Somente leitura.** Nada é gravado no Orion por esta rota.
- **Nenhum dado de Lead sai.** Só números agregados por dia e por status.
- **Isolamento entre contas.** Cada resultado considera apenas Leads e
  Abordagens do `user_id` do e-mail pedido. Um e-mail nunca soma dados de
  outra conta.

## Contrato
`POST /api/integracoes/builders/estatisticas`

Header: `Authorization: Bearer {BUILDERS_INTEGRATION_SECRET}`

Corpo (JSON):
```json
{ "emails": ["ana@exemplo.com"], "desde": "2026-12-01", "ate": "2027-01-14" }
```
- `emails`: 1 a **500** itens; normalizados (trim + minúsculas) e
  deduplicados. Item que não é e-mail → 400.
- `desde`/`ate`: datas `AAAA-MM-DD` no fuso `America/Sao_Paulo`, inclusivas,
  `desde ≤ ate`, janela de no máximo 120 dias.

Resposta 200:
```json
{
  "resultados": [
    {
      "email": "ana@exemplo.com",
      "encontrado": true,
      "dias": [{ "data": "2026-12-02", "abordagens": 4, "retornos": 1 }],
      "funil": { "respondeu": 2, "qualificado": 1, "proposta": 0, "ganho": 0 }
    },
    { "email": "sem-conta@exemplo.com", "encontrado": false, "dias": [], "funil": { "respondeu": 0, "qualificado": 0, "proposta": 0, "ganho": 0 } }
  ]
}
```
- Um resultado por e-mail pedido, na ordem normalizada e sem duplicatas.
- `dias` só traz dias com algum envio, em ordem crescente.

Erros: 401 sem header ou segredo errado (comparação em tempo constante);
503 se `BUILDERS_INTEGRATION_SECRET` não estiver configurado; 400 corpo
inválido; 405 para outros métodos (padrão do Next).

## Regras de contagem
Base: `Abordagem` com `enviado = true` e `enviado_em` preenchido, do mesmo
`user_id` do Aluno. Dia = `enviado_em` convertido para `America/Sao_Paulo`.

- **Abordagem (primeira)**: o envio mais antigo de cada Lead **em toda a
  história** da conta. Conta no dia dele, se cair dentro da janela.
- **Retorno**: qualquer envio seguinte ao mesmo Lead. Se o primeiro envio
  aconteceu **antes** de `desde`, todos os envios do Lead dentro da janela são
  retornos (nunca viram "abordagem" por causa do corte da janela).
- Empate de horário no mesmo Lead: desempata pelo `id`; só um é a primeira.
- **Retroativo**: como `enviado_em` é gravado desde a F006, envios anteriores
  à integração contam normalmente.
- Abordagem gerada e não enviada (`enviado = false`) **não** conta.

## Funil
Retrato do **status atual** dos Leads da conta que tiveram **algum envio
dentro da janela**: `respondeu`, `qualificado`, `proposta`, `ganho` contam o
Lead no status atual **ou em qualquer status adiante** no caminho de venda
(ex.: um Lead `ganho` conta em respondeu, qualificado, proposta e ganho).
`perdido` e `descartado` não contam.

Limitação conhecida: o Orion guarda só `status_em` do status atual, não o
histórico de cada mudança; por isso o funil é um retrato, não uma linha do
tempo.

## Vínculo por e-mail
`User.email` comparado em minúsculas. Contas sem `User` → `encontrado: false`.
Nada indica ao chamador **por que** não achou.

## Configuração
| Variável | Valor |
|----------|-------|
| `BUILDERS_INTEGRATION_SECRET` | Segredo forte (≥ 32 caracteres), um por ambiente; o mesmo valor configurado no Builders |

## Desempenho
Uma consulta agregada por chamada (SQL com `ROW_NUMBER()` por Lead), filtrada
pelos `user_id` encontrados. Sem worker nem fila. O Builders mantém cache de
~10 min.

## Critérios de aceitação
- [ ] Sem header ou com segredo errado → 401; sem segredo configurado → 503
- [ ] Mais de 500 e-mails, data inválida ou janela invertida → 400
- [ ] E-mail sem conta → `encontrado: false`
- [ ] Primeiro envio de cada Lead = abordagem; envios seguintes = retornos
- [ ] Lead com primeiro envio antes de `desde` só gera retornos na janela
- [ ] Abordagem não enviada não conta
- [ ] Contagens de uma conta nunca incluem Leads de outra
- [ ] Dia calculado em `America/Sao_Paulo` (23:30 de segunda ≠ terça)
- [ ] Resposta não contém nome, telefone, e-mail ou id de Lead
