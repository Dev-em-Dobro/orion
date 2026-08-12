# Prompt: gerar o seu portfólio

> **Quando usar:** no Kickoff (Bloco 5.5) e sempre que quiser atualizar a sua vitrine.
> **Onde colar:** Claude Code (recomendado), lovable, Cursor, Codex. Serve em qualquer um.
> **Resultado:** um `index.html` único com o SEU portfólio, pronto pra publicar e mandar o link
> nas abordagens da semana.
> **A regra que muda o jogo:** *portfólio é prova de capacidade, não histórico de clientes.*
> Você não precisa de cliente pra ter portfólio. Precisa de peças que mostrem que você entrega.

---

## Como usar em 3 passos

**1. Preencha o bloco de variáveis.** Os projetos são os templates que você adaptou e os sites
que você gerou com os prompts (mesmo sem cliente ainda). O que não souber, deixe vazio.

**2. Cole o prompt inteiro** (bloco de variáveis + prompt) numa conversa nova.

**3. Rode os follow-ups** do final. Depois publique (Vercel) e use o link em TODA abordagem.

---

## O prompt (copie daqui pra baixo)

```
# QUEM SOU EU (preencha; o que não souber, deixe vazio)
- Meu nome: [SEU_NOME]
- Cidade: [CIDADE]
- Meu WhatsApp: [SEU_WHATSAPP]     (só números, com país e DDD. Ex: 5585999998888)
- O que eu ofereço: sites e páginas, agentes de atendimento no WhatsApp e sistemas sob medida
- Nichos que eu quero atender: [NICHOS_ALVO]   (ex: dentistas, advogados, barbearias)
- Meus projetos (nome + link do preview + 1 linha do que é): [PROJETOS]
- Links extras (GitHub, LinkedIn, Instagram): [LINKS_EXTRAS]

# QUEM VOCÊ É
Você é um dev front-end sênior que também escreve copy de resposta direta.
Este portfólio NÃO é pra recrutador. É pra DONO DE NEGÓCIO local, que não entende de
tecnologia e decide pelo WhatsApp. O objetivo é um só: ele olhar e me chamar.

# O QUE ENTREGAR
Um arquivo `index.html` ÚNICO, self-contained: CSS e JS inline, sem build, sem framework,
sem lib externa. A única requisição externa permitida é a fonte Ubuntu do Google Fonts.
Tem que abrir com duplo clique e funcionar.

# DESIGN
- Fonte: Ubuntu (Google Fonts), pesos 400/500/700. font-display: swap + preconnect.
- Paleta: UMA cor de destaque + neutros. Fundo claro, texto #1a1a1a. Contraste mínimo AA.
- Hierarquia forte, respiro generoso, mobile-first (funciona em 360px sem rolagem lateral).
- Cada projeto vira um card com: nome, 1 linha de resultado que aquele tipo de entrega gera
  pro negócio, e o link do preview (se houver).
- IMPORTANTE sobre o link do preview: no começo o aluno ainda NÃO publicou os projetos.
  Se um projeto não tem link, NÃO renderize botão "ver o projeto" morto (link vazio, "#" ou
  placeholder clicável). Mostre o card sem botão, com uma marca discreta "preview em breve",
  e deixe o CTA de WhatsApp fazer o trabalho. Só coloque o botão quando o link existir de verdade.
- Sem imagem de banco de imagens. Se não houver screenshot, use um bloco com gradiente da cor
  de destaque + o nome do projeto (limpo e proposital, não inacabado).
- NÃO faça: sombra pesada, emoji no lugar de ícone, parágrafo longo centralizado, lorem ipsum.

# MOTION (animação de entrada, é o que dá o ar profissional)
- Animação SUTIL e curta. O objetivo é sofisticação, não circo. Cada elemento entra com
  fade + subida leve (opacity 0 -> 1, translateY de ~16px -> 0), duração 0.5s a 0.7s, ease-out.
- Só anime opacity e transform (são de GPU, não travam o scroll). NUNCA anime width, height,
  top/left, margin ou box-shadow.
- Hero anima ao carregar a página. As outras seções animam quando entram na tela (scroll),
  com IntersectionObserver. Dentro de um grupo (os 3 cards, os 3 passos), faça um stagger de
  ~80ms entre os itens pra dar ritmo.
- FALLBACK SEM JS (obrigatório): a versão escondida (opacity 0) só pode existir quando o JS
  está ligado. Coloque no <head>, ANTES do CSS, um script inline mínimo que adiciona a classe
  `js` no <html> (document.documentElement.classList.add('js')). Esconda com `.js [data-reveal]`
  e revele com `.js [data-reveal].in`. Sem JS, tudo aparece normal (nunca some conteúdo).
- prefers-reduced-motion: reduce -> desliga tudo (opacity 1, transform none, sem transição).
- O JS é um IntersectionObserver curto, inline, que adiciona `.in` e para de observar o
  elemento. Sem biblioteca. Não pese a página por causa de enfeite.

# SEÇÕES, nesta ordem
1. Topo enxuto: meu nome + botão de WhatsApp.
2. Hero: headline de RESULTADO pro dono de negócio (não "olá, eu sou dev"). Fórmula:
   [o que o negócio dele ganha] + [com o quê] + [onde]. Linha de apoio de 1 frase.
   CTA primário no WhatsApp.
3. O que eu faço por você: 3 cards (site/página, agente de atendimento no WhatsApp,
   sistema sob medida), cada um com uma linha de BENEFÍCIO pro negócio, não de tecnologia.
4. Projetos: os cards dos projetos listados acima.
5. Como funciona: 3 passos simples (conversa no WhatsApp, proposta, entrega). Tira o medo do "e depois?".
6. Quem sou: parágrafo curto, humano, na primeira pessoa. Sem currículo, sem sopa de siglas.
7. CTA final + rodapé mínimo com contatos.
+ Botão flutuante de WhatsApp em todas as telas, apontando pra
  https://wa.me/[SEU_WHATSAPP] com mensagem pronta no ?text= (da boca do dono: "Oi, vi teu
  portfólio e queria saber sobre um site pro meu negócio").

# COPY
- Português do Brasil COM acentuação correta. NÃO escreva "negocio", "voce", "tecnica",
  "servico": é "negócio", "você", "técnica", "serviço". Texto sem acento parece amador.
- Tom de quem resolve, não de quem vende. Frases curtas.
- PROIBIDO usar travessão (— ou –) em qualquer texto, INCLUSIVE em comentário de código.
  Use vírgula, ponto ou parênteses.
- PROIBIDO promessa não comprovável ("aumento 300% suas vendas").
- HONESTIDADE INEGOCIÁVEL: se um projeto é demonstração (sem cliente pago), chame de
  "projeto de demonstração". NUNCA apresente peça de estudo como trabalho pago, NUNCA
  invente cliente, depoimento ou resultado. Prova de capacidade fecha mais que case inventado.
- Se eu deixei um campo vazio, NÃO INVENTE fato sobre mim. Marque [PLACEHOLDER: ...].

# TÉCNICO
- lang="pt-BR". <title> e <meta name="description"> com "sites, agentes de WhatsApp e
  sistemas" + cidade. Open Graph básico.
- HTML semântico, um único h1, alt em tudo que for imagem.
- Performance alvo: PageSpeed mobile 90+. Acessibilidade: foco visível e contraste AA.
- Área de toque de 44px em todo alvo clicável fora de frase (botões, links de menu e rodapé).
- A animação de entrada não pode causar layout shift (CLS 0): o elemento só se move em
  transform, o espaço dele no layout já está reservado.

# SEO (pra ser achado no Google)
- <title> único e <meta name="description"> de 150 a 160 caracteres, com "sites, agentes de
  WhatsApp e sistemas" + a cidade.
- Open Graph (og:title, og:description, og:type) preenchido. Como canonical, og:url e og:image
  dependem da URL final (que ainda não existe), deixe-os como COMENTÁRIO pronto pra descomentar ao
  publicar, com o modelo da URL. Não suba tag com URL inventada nem placeholder quebrado.
- Favicon inline (SVG data-uri simples, a inicial na cor de destaque). Sem arquivo externo.
- Dados estruturados JSON-LD do tipo "ProfessionalService": nome, cidade, telefone e a lista de
  serviços. Só dado real que eu te dei; a chave que faltar (ex: url antes de publicar), OMITA.
- <meta name="robots" content="index, follow">. Um h1 só, títulos sem pular nível (h1, h2, h3).

# SEGURANCA
- Todo link com target="_blank" TEM rel="noopener noreferrer" (senão a aba aberta acessa a sua
  página via window.opener). Vale pros previews de projeto e pros links de WhatsApp em nova aba.
- NUNCA coloque chave de API, token ou senha no HTML. ID público de pixel/analytics pode; segredo não.
- Só recurso https. Nenhum <script> de terceiro que você não controla. O único JS é o seu, inline.
- Se um dia adicionar formulário, valide no cliente E no servidor e mande pra um endpoint https.

# PERFORMANCE (alvo: Lighthouse mobile 90+ em Performance, CLS ~0)
- CSS 100% inline no <head>. Sem @import, sem CSS morto, sem CDN de CSS.
- Fonte: preconnect + font-display: swap + só os pesos usados (400/500/700). Nada de 9 pesos.
- Imagem (quando houver): width e height explícitos (evita CLS), loading="lazy" abaixo da dobra,
  formato leve. Sem imagem de banco. Aqui os blocos de gradiente já evitam a requisição.
- JS mínimo e inline (só o IntersectionObserver). Zero biblioteca, zero <script> de terceiro.
- Nada que bloqueie a renderização além da fonte. O texto do hero é legível de imediato.
- Favicon inline (data-uri) pra não gastar uma requisição.

# ORDEM DE TRABALHO
Antes do código, me devolva 5 linhas: headline escolhida, cor de destaque, as seções,
o CTA e o que você assumiu. NÃO espere minha confirmação, emende direto no código completo.

Depois do código, me entregue:
1. Como publicar na Vercel em 3 passos.
2. Onde eu adiciono um projeto novo depois (arquivo e lugar).
3. Autoverificação, responda item a item:
   - tem travessão (— ou –) em algum texto, inclusive comentário de CSS?
   - sobrou alguma palavra sem acento que deveria ter (negocio, voce, servico, pagina)?
   - o wa.me está certo, com país e DDD, em todos os botões?
   - ficou algum botão "ver projeto" morto (sem link real)? se sim, tire o botão.
   - algum projeto de demonstração ficou parecendo trabalho pago? algum fato inventado sobre mim?
   - contraste AA em TODO texto, inclusive o secundário e o que fica sobre a cor de destaque?
   - funciona em 360px sem rolagem lateral?
   - com o JS desligado, algum conteúdo fica invisível (preso em opacity 0)? não pode.
   - a animação respeita prefers-reduced-motion e só usa opacity/transform?
   - todo target="_blank" tem rel="noopener"? tem alguma chave/segredo exposto no HTML?
   - o JSON-LD só tem dado real (sem inventar url)? canonical/og:url ficaram como comentário?
   - Lighthouse mobile de Performance fica 90+ (CSS inline, sem lib, sem imagem pesada, CLS ~0)?
```

---

## Os 3 follow-ups (é aqui que vira wow)

Depois que o portfólio aparecer, mande **um de cada vez**:

1. **`a headline está falando de mim. reescreva 3 opções falando do RESULTADO do dono de negócio e aplique a melhor.`**
   O erro nº 1 de portfólio é falar de si. O dono quer saber o que ELE ganha.
2. **`revise como se fosse um dono de barbearia sem paciência. o que está técnico demais? simplifique.`**
   Se tem palavra que o dono não usa no dia a dia, troca.
3. **`me mostre onde ficou algum travessão, fato inventado ou projeto de demonstração parecendo trabalho pago, e corrija.`**
   Fecha o padrão de marca e a honestidade antes de publicar.

> Gerou um template novo com o prompt-mestre? Adicione no portfólio:
> `adicione o projeto [NOME] com o link [URL] na seção de projetos, no mesmo padrão dos outros.`

---

## Checklist antes de publicar

- [ ] WhatsApp certo em **todos** os `wa.me/` (país + DDD, sem traço)
- [ ] Todo projeto de demonstração está nomeado como demonstração
- [ ] Zero travessão (buscar `—` e `–` com Ctrl+F, tem que dar zero)
- [ ] Nenhum fato inventado sobre você (prêmio, anos de experiência, nº de clientes)
- [ ] Publicado na Vercel e o link abre no celular
- [ ] Link do portfólio salvo pra colar em TODA abordagem da semana

---

## Regra de uso na aula (Bloco 5.5)

Fazer **junto, ao vivo**: cada aluno cola o prompt, preenche as variáveis com os próprios dados e
gera. As peças são os templates prontos + o que ele gerar com o prompt-mestre. Sai da aula com o
portfólio criado; publicar e polir entra na missão da semana. A frase de amarração:
*"Portfólio é prova de capacidade, não histórico de clientes."*
