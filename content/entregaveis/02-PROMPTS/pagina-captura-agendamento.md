# Prompt: página de captura / agendamento

> **Quando usar:** o cliente não precisa de site institucional, precisa de **uma página que
> capture lead ou marque horário**. Campanha, promoção, link da bio do Instagram, anúncio.
> **Vantagem comercial:** é o entregável mais rápido que existe (uma página só) e por isso é
> a porta de entrada mais fácil de vender pro cliente que ainda não confia em você.

---

## Antes de escrever o prompt, decida: pra onde vai o lead?

| Caminho | Quando usar | Custo |
|---|---|---|
| **WhatsApp direto** (sem formulário) | Padrão. O cliente decide no WhatsApp mesmo | Zero. Comece por aqui |
| **Formulário e-mail** (Formspree / Google Forms) | O cliente quer os dados organizados | Zero no plano free |
| **Agendamento real** (Calendly / agenda do cliente) | Clínica, consultório, serviço com hora marcada | Zero no plano free |
| **Formulário + banco** (Supabase) | O cliente quer CRM depois | Zero no free, mas é Consultoria 4 |

Na dúvida na largada: **WhatsApp direto**. Menos coisa pra quebrar na frente do cliente.

---

## O prompt

```
# O NEGÓCIO
- Nicho: [NICHO]
- Nome: [NOME]
- Cidade: [CIDADE]
- WhatsApp: [TELEFONE]        (só números, com país e DDD. Ex: 5585999998888)
- A oferta desta página: [OFERTA]      (ex: avaliação gratuita, primeira aula experimental,
                                        orçamento em 24h, 20% na primeira visita)
- O que o visitante ganha: [PROMESSA]
- Pra quem é: [PUBLICO]
- Destino do lead: [WHATSAPP | FORMULARIO | CALENDLY]
- Cor da marca: [COR]

# TAREFA
Crie uma página de captura de UMA tela (landing curta), com um único objetivo: [OFERTA].
Não é site institucional. Não tem menu, não tem "sobre nós" longo, não tem link que
tire a pessoa da página. Uma página, uma decisão.

# ENTREGA
Um `index.html` único, self-contained, CSS e JS inline, sem framework.
Única requisição externa permitida: fonte Ubuntu do Google Fonts.

# ESTRUTURA (curta de propósito)
1. Hero: headline da OFERTA + linha de apoio + CTA. O CTA tem que aparecer sem rolar a tela.
2. 3 bullets de "o que você ganha" (benefício, não característica).
3. Prova: 2 depoimentos curtos, marcados [PLACEHOLDER: trocar por real].
4. Como funciona: 3 passos, uma linha cada. Tira o medo do "e depois?".
5. CTA final repetido + a informação de contato.
6. Rodapé mínimo.
- Nada de rodapé gigante, nada de menu de navegação, nada de link externo.

# DESTINO DO LEAD (siga o que eu marquei acima)
- WHATSAPP: todo CTA vai pra https://wa.me/[TELEFONE]?text= com a mensagem pronta
  já escrita da boca do cliente, citando a oferta.
- FORMULARIO: form com nome, WhatsApp e uma pergunta de qualificação. Validação no HTML,
  mensagem de sucesso sem recarregar a página. Me diga onde eu ligo o endpoint.
- CALENDLY: botão que abre o link, e me diga onde eu troco pelo link real.

# DESIGN
- Fonte Ubuntu (Google Fonts), pesos 400/500/700.
- Uma cor de marca + neutros. Contraste AA. O botão de CTA é o elemento mais visível da tela.
- Mobile-first de verdade: 80% desse tráfego vem do Instagram, no celular, em 360px de largura.
- Sem imagem de banco de imagens. Gradiente, bloco de cor, SVG inline.
- Velocidade acima de enfeite. Sem carrossel, sem popup.
- Animação de entrada SIM, mas discreta: hero anima no load (fade + leve subida em cascata rápida),
  os blocos abaixo aparecem ao rolar com fade + translateY. Só CSS + IntersectionObserver, sem biblioteca.
  Anime só transform/opacity, zero layout shift, respeite prefers-reduced-motion, e sem JS o conteúdo
  aparece normal (nada preso em opacity 0). Movimento curto, nada de exagero. O CTA continua visível
  sem rolar mesmo durante a animação.

# COPY
- Português do Brasil, direto, tom de quem resolve.
- PROIBIDO travessão (— ou –). Use vírgula, ponto ou parênteses.
- PROIBIDO escassez inventada ("só hoje", "últimas vagas") se o cliente não tiver isso de verdade.
- PROIBIDO promessa não comprovável.
- NÃO INVENTE fato. O que faltar, marque [PLACEHOLDER: confirmar com o cliente].

# DEPOIS DO CÓDIGO
1. Onde eu troco: link do destino, oferta, cor, telefone.
2. Como publicar na Vercel em 3 passos.
3. Autoverificação: o CTA aparece sem rolar no celular? tem travessão? o link do lead está certo?
```

---

## Follow-ups úteis

- **`me dê 3 versões da headline dessa oferta e aplique a melhor.`**
- **`o CTA sumiu no celular. garanta que ele apareça sem rolar em 360x640.`**
- **`adicione um pixel do Meta / GA4 no lugar certo e me diga onde eu ponho o ID.`**
  (só quando o cliente já anuncia)

---

## Como isso vira dinheiro

Página de captura é o serviço que o cliente entende mais rápido, porque ele já sabe o que quer:
mais gente chamando no WhatsApp. Vende como **primeiro passo**, entrega em um dia, e a confiança
que você ganha aí é o que destrava o site completo, o agente e o sistema depois. A escada começa
pequena de propósito.
