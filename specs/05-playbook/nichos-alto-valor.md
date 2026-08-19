# Playbook — Nichos de Alto Valor

## Status
Proposta — 2026-06-12

## Por que este documento existe
A visão de produto mira "negócios locais que precisam de um dev". Mas
*precisar* não é o mesmo que *valer a pena abordar*. Um negócio de bairro
sem verba, mesmo com site horrível, raramente fecha. O alavancador da taxa
de fechamento **não é o canal de coleta — é qual estabelecimento se mira**.

Este playbook define **quais nichos priorizar** e **quais termos buscar** na
F001, e serve de fonte para o **Tier de nicho** usado no cálculo de score
(ver [F003](../02-features/F003-score-e-priorizacao.md)).

> Regra de bolso da priorização:
> **mirar quem tem Dor real E dinheiro E percebe a perda de cliente.**

## Critérios de um nicho de alto valor
Um nicho entra no Tier ALTO quando combina:
1. **Ticket alto / LTV alto** — o valor de um cliente novo paga um projeto de dev com folga.
2. **Dependência de captação online** — o cliente *procura no Google/Instagram* antes de comprar.
3. **Verba e mentalidade de ROI** — já gasta com presença digital, anúncio ou ferramenta.
4. **Costuma ter site ausente, amador ou lento** — há Dor concreta a resolver.

## Tiers

### Tier ALTO — mirar primeiro
Saúde e estética de ticket alto, jurídico/serviços profissionais e imobiliário.

| Nicho (busca)                     | `primaryType` provável do Places   |
|-----------------------------------|------------------------------------|
| Dentista / clínica odontológica   | `dentist`, `dental_clinic`         |
| Clínica de estética / harmonização| `beauty_salon`, `skin_care_clinic` |
| Dermatologista                    | `doctor`, `dermatologist`          |
| Clínica médica / especialista     | `doctor`, `medical_clinic`         |
| Fisioterapia / pilates            | `physiotherapist`                  |
| Psicólogo / clínica de psicologia | `medical_clinic`, `psychologist`   |
| Nutricionista                     | `consultant`, `nutritionist`, `doctor` |
| Clínica veterinária / hospital vet| `veterinary_care`                  |
| Oftalmologista / clínica de olhos | `doctor`                           |
| Advogado / escritório de advocacia| `lawyer`                           |
| Contador / contabilidade          | `accounting`                       |
| Arquiteto / escritório de arquitetura | `architect`                    |
| Engenheiro / engenharia           | (varia — confirmar no retorno)     |
| Imobiliária / corretor de imóveis | `real_estate_agency`               |
| Construtora                       | (varia — confirmar no retorno)     |

### Tier MÉDIO — abordar com seletividade
Movimento alto, mas margem/ticket de projeto menor ou maturidade digital irregular.

| Nicho (busca)                  | `primaryType` provável do Places         |
|--------------------------------|------------------------------------------|
| Restaurante / cafeteria        | `restaurant`, `cafe`                     |
| Academia / box de crossfit     | `gym`, `fitness_center`                  |
| Salão / barbearia premium / spa| `hair_salon`, `barber_shop`, `spa`       |
| Pet shop                       | `pet_store`                              |
| Ótica                          | `optician`, `store`                      |
| Escola de idiomas / curso      | `school`                                 |
| Oficina mecânica / funilaria   | `car_repair`                             |
| Estúdio de tatuagem            | (varia — confirmar no retorno)           |

> **`consultant` é ALTO por causa da Nutricionista, e isso pega mais gente.**
> Nutricionista volta do Places como `consultant` em 59 de 60 resultados
> (medido em GO/PR/SP, 2026-08-19), e sem esse mapa o nicho inteiro caía em
> BAIXO contrariando a linha acima. O tipo é genérico: **qualquer** Lead que o
> Places classifique como `consultant` passa a entrar como ALTO, inclusive
> vindo de Arquiteto ou Engenharia, que buscam sem `includedType`. Foi escolha
> consciente — Tier errado no nicho certo custa mais que Tier generoso em nicho
> vizinho, porque o primeiro esconde Lead bom e o segundo só adianta triagem.
> Se aparecer consultor genérico demais na Fila, o conserto é dar
> `includedType` a Arquiteto/Engenharia, não rebaixar a Nutricionista.

> **A coluna `primaryType` é o que o Places *devolve*, não o que a gente
> *manda*.** Parte destes nomes (`psychologist`, `nutritionist`,
> `dermatologist`, `architect`, `optician`) não existe na Table A da Places API:
> serve como leitura de "o que esperar no retorno", mas **não pode virar
> `includedType`** na busca — mandar um deles derruba a consulta com 400 (F033,
> emenda de 2026-08-19). A lista dos que valem como filtro está no
> [contrato](../03-contracts/google-places.md#includedtype-f033); nicho sem tipo
> na Table A busca só pelo termo, e é assim mesmo.

### Tier BAIXO — deprioriza (default para nicho não mapeado)
Baixa verba, baixa percepção de Dor, alta sensibilidade a preço.
Ex.: lanchonete, mercadinho/mercearia, bar, food truck, comércio de bairro
genérico. Tudo que **não** estiver mapeado em ALTO ou MÉDIO cai aqui por
padrão (conservador — o operador pode promover um nicho por spec).

## Sinal de porte/movimento — `num_avaliacoes`
Dentro de um mesmo nicho, o número de avaliações no Google é um proxy barato
de **fluxo de cliente e tempo de casa** — logo, de verba e de "cliente a
perder". Faixas usadas no Valor (ver F003):

| `num_avaliacoes` | Leitura                          |
|------------------|----------------------------------|
| 0–20             | incipiente / pouco movimento     |
| 21–80            | porte médio                      |
| 81–300           | estabelecido, bom movimento      |
| 300+             | referência local, alto movimento |

Um Lead Tier ALTO com 300+ avaliações **e sem site** é o alvo ideal.

## Como usar hoje (sem esperar código)
1. Na F001, busque pelos termos da coluna "Nicho (busca)" do Tier ALTO,
   uma cidade por vez (ex.: `dentista`, `Curitiba PR`).
2. Rode o Diagnóstico (F002) nos retornos.
3. Até a F003 entrar, priorize manualmente: Tier ALTO + muitas avaliações +
   Diagnóstico ruim primeiro.

Quando a F003 estiver implementada, o score faz essa ordenação sozinho.

## Manutenção
- Este arquivo é a **fonte única** do mapa nicho → Tier. A F003 lê deste mapa
  (na prática, o mapa vira uma constante em `src/lib/score/`).
- **A partir da [F033](../02-features/F033-busca-estruturada.md)** ele é também
  a fonte do **dropdown de nicho** da busca: cada linha das tabelas acima vira
  uma entrada de `src/lib/nichos/catalogo.ts` (`slug`, `label`, `termoBusca`,
  `includedType`, `tier`), e o mapa de Tier da F003 passa a ler **desse mesmo
  catálogo** — uma fonte só, sem duplicação. Um teste falha se o catálogo e
  este documento divergirem (F033 AC7).
- A coluna `primaryType` deixa de ser só documentação: vira o `includedType`
  enviado ao Places. Onde estiver escrito "(varia — confirmar no retorno)", o
  nicho entra **sem** `includedType`.
- Os `primaryType` acima são prováveis; **confirmar contra o que o Places
  realmente devolve** e ajustar. Tipo não mapeado → Tier BAIXO.
- Promover/rebaixar um nicho é mudança de estratégia → **editar este arquivo
  antes** de mexer no código (regra do projeto).
