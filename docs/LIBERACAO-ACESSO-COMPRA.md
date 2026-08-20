# Liberação de acesso — Hubla e TMB

Resumo para quem não é técnico: o que acontece quando alguém compra e como o acesso abre no **Builders Club** e no **Orion**.

---

## Em uma frase

Quando a compra é **confirmada** na Hubla ou na TMB, o sistema recebe um aviso automático e **libera o e-mail** do comprador. No primeiro login com **esse mesmo e-mail**, a pessoa já entra com acesso liberado — sem alguém da equipe precisar cadastrar na mão.

---

## As duas lojas

| Onde comprou | O que é |
|--------------|---------|
| **Hubla** | Cartão / checkout online (produto Builders Club) |
| **TMB** | Boleto parcelado (ofertas da Mentoria Freela) |

As duas falam com nossos sistemas por **webhook**: um “telefone” que a loja liga sozinha quando a venda muda de status.

---

## O que cada plataforma libera

### Builders Club (comunidade)
- Feed, aulas, comentários, materiais da comunidade.
- Compra Hubla (produto Club) **ou** compra TMB Mentoria → acesso **pago** na comunidade.

### Orion (ferramenta de prospecção)
- Conta + verificação de compra (entregáveis / ativação).
- Mesma lógica: Hubla **ou** TMB Mentoria → e-mail autorizado no Orion.

**DevQuest** (campanhas por temporada) **não** entra nessa automação: a liberação continua em lote / lista, porque a venda é sazonal.

---

## Passo a passo (visão do aluno)

1. A pessoa **compra** na Hubla ou na TMB (Mentoria).
2. A loja marca a venda como **efetivada / paga** (na TMB: pedido efetivado e situação financeira em dia).
3. A loja avisa automaticamente:
   - o **Builders Club**, e
   - o **Orion** (cada um tem o seu endereço de aviso).
4. O sistema **anota o e-mail** da compra como autorizado.
5. A pessoa faz login no Club e/ou no Orion com **o mesmo e-mail da compra**.
6. Pronto: acesso liberado.

Se ela ainda não tinha conta, a liberação fica “esperando”; no **primeiro login** com aquele e-mail, o acesso já nasce liberado.

---

## O que a equipe não precisa fazer (no fluxo normal)

- Não precisa colar e-mail na allowlist à mão a cada venda Hubla/TMB Mentoria.
- Não precisa “ativar” aluno um a um depois da compra confirmada.

Ainda pode haver exceção (e-mail errado, compra com e-mail diferente do login, estorno) — aí o suporte ajuda.

---

## Se a compra for cancelada ou ficar inadimplente

A loja avisa de novo → o sistema **tira** a liberação automática (a pessoa pode continuar logada, mas sem o acesso completo / compra ativa).

---

## Checklist rápido para o time

| Situação | O que conferir |
|----------|----------------|
| Comprou e não liberou | Usou o **mesmo e-mail** da compra no login? |
| Boleto TMB | A venda está **efetivada** e **adimplente** (não só boleto gerado)? |
| DevQuest | Não é automático — é liberação de temporada. |
| Hubla vs TMB | As duas liberam Club + Orion; só mudam a “loja”. |

---

*Atualizado em agosto/2026 — automação Hubla + TMB Mentoria nos dois produtos.*
