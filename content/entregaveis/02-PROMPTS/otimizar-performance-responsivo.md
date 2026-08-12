# Prompt: otimizar performance e responsivo

> **Quando usar:** duas situações, e a segunda é a que dá dinheiro.
> 1. Você gerou o site e quer garantir que está rápido antes de entregar.
> 2. **O cliente já tem site e ele está lento.** Isso é gancho de venda, não é serviço técnico.
>
> **Por que isso importa comercialmente:** o Orion mostra o diagnóstico de PageSpeed do lead.
> Site lento é cliente perdido pra ele, e é o teu gancho. *"Isso aqui é dinheiro saindo pela porta."*

---

## O prompt (otimizar um site que você gerou)

```
# TAREFA
Otimize o site abaixo pra performance e responsividade, sem mudar o visual nem a copy.
Alvo: PageSpeed mobile 90+.

# CHECKLIST (faça item a item e me diga o que mudou em cada um)
1. Fonte: Ubuntu com preconnect + font-display: swap. Só os pesos usados (400/500/700).
   Nenhuma outra fonte carregada.
2. CSS: inline no <head>, sem @import, sem CSS morto. Me diga quantos bytes ficou.
3. JS: se tiver script que não é essencial, remova. O resto, defer.
   Zero biblioteca externa. (O IntersectionObserver da animação de entrada é leve e ESSENCIAL, pode ficar.)
4. Imagens: width e height explícitos em todas (evita layout shift).
   Formato moderno, loading="lazy" em tudo que não está na primeira tela.
   Se tiver imagem de banco de imagens, troque por gradiente ou SVG inline.
5. Layout shift: reserve espaço pra tudo que carrega depois. CLS alvo: 0.
6. Responsivo: teste mentalmente em 360px, 768px e 1440px. Nenhuma rolagem horizontal
   em nenhuma delas. Nenhum texto abaixo de 1rem no corpo.
7. Toque: todo botão e link com área mínima de 44x44px no mobile.
8. Acessibilidade: contraste AA, foco visível no teclado, alt em imagem, um h1 só.
9. Animação: se tem animação de entrada, ela usa só transform/opacity (nunca top/left/width/height),
   não causa layout shift (CLS 0), respeita prefers-reduced-motion: reduce, e sem JS o conteúdo aparece
   normal (nunca preso em opacity 0). Se algo disso falhar, conserte sem tirar a animação.

# DEPOIS
1. Me diga o que estava pesando e quanto cada correção economizou.
2. Me diga o que AINDA limita a nota e por quê (seja honesto, não maquie).
3. Me dê o comando pra eu testar: link do PageSpeed e o que olhar no resultado.
```

---

## O prompt (diagnóstico do site atual do cliente, o gancho de venda)

Este é o que você usa **antes de abordar**. Não é pra consertar, é pra você chegar sabendo.

```
Analise este site: [URL]
O dono é um(a) [NICHO] em [CIDADE].

Me devolva, em linguagem de DONO DE NEGÓCIO, não de programador:
1. Os 3 problemas que mais fazem ele PERDER CLIENTE (não os 3 problemas técnicos).
   Pra cada um, explique em uma frase o que isso custa em cliente perdido.
2. O que dá pra resolver em 1 dia e o que precisa de refação.
3. Uma mensagem curta de WhatsApp que eu mando pro dono mostrando UM problema concreto,
   no tom de quem quer ajudar, não de quem quer vender.

REGRAS DA MENSAGEM:
- Curta, pessoal, sem textão.
- PROIBIDO travessão (— ou –).
- Não humilhe o site dele. Aponte o problema e o custo, com respeito.
- Não prometa número que não dá pra provar.
- Termine com uma pergunta fácil de responder.
```

---

## Como ler o PageSpeed sem ser técnico

| Nota mobile | O que significa | O que você fala pro dono |
|---|---|---|
| 90+ | Rápido | Não é o problema dele. Procure outro gancho |
| 50 a 89 | Lento | "Seu site demora pra abrir no celular, e boa parte das pessoas desiste antes" |
| Abaixo de 50 | Muito lento | "No celular seu site está quase inutilizável. É cliente batendo na porta e indo embora" |

Teste em: `pagespeed.web.dev`. Sempre mostre a aba **mobile**, é de onde vem o tráfego dele.

> **Honestidade:** se o site do cara está bom, fale que está bom. Você não perde a venda por isso,
> você ganha a confiança. O gancho vira outro (ele não tem agente no WhatsApp, não tem página
> de captura, não aparece no Google). Princípio nº 1: resultado do cliente acima de tudo.
