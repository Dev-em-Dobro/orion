# Tutorial — Sua chave do Google Places (para alunos)

Cada aluno usa a **própria** chave de API. Assim o uso e qualquer cobrança
ficam na **sua** conta Google, isolados dos demais. Este guia mostra como:

1. criar a chave no Google Cloud,
2. entender como funcionam os créditos/cobrança (pra não tomar susto),
3. colar a chave em **Configuração** no app (BYOK — [F016](../specs/02-features/F016-configuracao-de-chaves.md)),
4. **nunca** deixar a chave vazar (não comitar o `.env` do servidor).

> No app hospedado, você cola a chave na UI. O `.env` é só do servidor
> (banco, auth, chave-mestra BYOK) — não das keys de Places do aluno.

---

## Antes de começar: ative o 2FA

O Google só deixa **criar um projeto** no Cloud Console se a sua conta tiver
**verificação em duas etapas (2FA)** ligada. Ative em
[myaccount.google.com/security](https://myaccount.google.com/security) antes
de continuar — sem isso o console bloqueia a criação do projeto.

---

## Passo 1 — Criar um projeto no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com).
2. Na barra do topo, clique no seletor de projeto → **Novo projeto**.
3. Dê um nome (ex.: `prospeccao`) e clique em **Criar**.
4. Depois de criado, confirme que ele está **selecionado** na barra do topo.

## Passo 2 — Ativar as APIs

Em **APIs e serviços → Biblioteca**, procure e clique em **Ativar** em cada uma:

- **Places API (New)** — é ela que busca os estabelecimentos.
- **PageSpeed Insights API** — mede a performance dos sites (essa é **gratuita**).

## Passo 3 — Ativar o faturamento (billing)

O Google Maps Platform exige uma **conta de faturamento com cartão**, mesmo
pra usar dentro da cota gratuita. Sem billing, a Places API responde com erro.

1. Vá em **Faturamento** → **Vincular conta de faturamento** → cadastre um cartão.
2. Isso **não cobra nada sozinho**. Você só é cobrado se **passar da cota
   gratuita** (veja o Passo 4).

## Passo 4 — Como funcionam os créditos / a cobrança

Desde **1º de março de 2025** o Google **mudou** o modelo:

- **Acabou** o antigo crédito único de **US$200/mês**.
- Agora **cada API tem sua própria cota gratuita mensal** (o "free tier por SKU"):
  - APIs **Essentials**: ~**10.000** chamadas grátis/mês
  - APIs **Pro**: ~**5.000** chamadas grátis/mês
  - APIs **Enterprise**: ~**1.000** chamadas grátis/mês
- A cobrança é feita pela **faixa mais alta** de campo que você pede.

### Onde esta ferramenta se encaixa

A busca desta ferramenta traz **nome, endereço, telefone, site, categoria,
nota e nº de avaliações**. Os campos de **telefone, site, nota e nº de
avaliações** colocam cada busca na faixa **Enterprise** do *Text Search*.
Na prática:

- **1.000 buscas grátis por mês.**
- Cada busca traz **até 20 estabelecimentos** de uma vez — ou seja, 1.000
  buscas podem render até ~20.000 estabelecimentos/mês, de graça.
- Passou de 1.000 buscas no mês, o custo é da ordem de **US$35 por 1.000
  buscas** adicionais. Confira o valor exato atualizado nos links do fim.

> Pra prospecção normal, 1.000 buscas/mês é **bastante** — dificilmente você
> encosta no limite.

### Proteja-se de surpresas (recomendado)

- **Orçamento com alerta:** em **Faturamento → Orçamentos e alertas**, crie
  um orçamento baixo (ex.: R$5) com alerta por e-mail. Você é avisado antes
  de qualquer gasto relevante.
- **Limite de cota:** em **APIs e serviços → Places API (New) → Cotas**, dá
  pra limitar o número de requisições por dia. Assim, mesmo que algo dispare
  muitas buscas, ele para antes de gerar custo.
- A **PageSpeed Insights API é gratuita** (não entra no billing do Maps; tem
  só um limite de requisições por período).

## Passo 5 — Criar a chave de API

1. Vá em **APIs e serviços → Credenciais → Criar credenciais → Chave de API**.
2. Copie a chave gerada (começa com `AIza...`).
3. **Restrinja a chave** (importante pra segurança): clique em **Editar/​Restringir**:
   - **Restrições de API:** deixe marcadas **apenas** a *Places API (New)* e a
     *PageSpeed Insights API*. Se a chave vazar, ela não serve pra mais nada.

## Passo 6 — Colar a chave no app (BYOK)

Na **Fase 2** a chave **não** vai no `.env` do aluno pra Places/PageSpeed —
ela fica em **Configuração** (`/configuracao`), cifrada, só da sua conta.

1. Abra o app, faça login e vá em **Configuração**.
2. No card **Google (Places + PageSpeed)**, cole a chave → **Salvar** →
   **Testar chave**.
3. (Opcional, local/dev do time) variáveis de servidor no `.env` seguem
   sendo `DATABASE_URL`, `BYOK_MASTER_KEY`, `BETTER_AUTH_*` — veja
   [`.env.example`](../.env.example).

Guia resumido também dentro do app: `/configuracao/tutorial-google`.

## Passo 7 — NUNCA comite o `.env`

A regra de ouro: **o `.env` é seu e fica só na sua máquina.**

- O `.env` guarda a **sua** chave. Se ela for parar no GitHub, qualquer pessoa
  pode copiar e **gerar cobrança na sua conta**.
- Este projeto **já ignora** o `.env` no [`.gitignore`](../.gitignore) — o git
  não versiona esse arquivo. Confirme rodando `git status`: o `.env` **não
  deve aparecer** na lista.
- O único arquivo versionado é o **`.env.example`** (o modelo, sem chaves).
- De novo: essa configuração é **local**. Não precisa publicar nada.

### E se a chave vazar?

Se você comitou a chave sem querer ou desconfia que ela vazou:

1. Vá em **APIs e serviços → Credenciais**.
2. **Exclua** (ou **regenere**) a chave imediatamente e crie uma nova.
   Trocar a chave invalida a antiga na hora.
3. Coloque a chave nova no `.env` e siga usando.

---

## Links oficiais

- [Preços do Google Maps Platform](https://mapsplatform.google.com/pricing/)
- [Uso e faturamento da Places API](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Mudanças de março/2025 (fim do crédito de US$200)](https://developers.google.com/maps/billing-and-pricing/march-2025)
- [Campos de dados e faixas (Essentials/Pro/Enterprise)](https://developers.google.com/maps/documentation/places/web-service/data-fields)
- [Google Cloud Console](https://console.cloud.google.com)
