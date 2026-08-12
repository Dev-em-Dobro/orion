# Prompt-mestre: gerar site do zero

> **Quando usar:** o nicho do cliente **não está** na biblioteca de sites prontos (`01-SITES-PRONTOS/`).
> **Onde colar:** Claude Code (recomendado), lovable, Cursor, Codex. Serve em qualquer um.
> **Resultado:** um `index.html` único, pronto pra abrir, mostrar pro cliente e publicar.
> **Tempo:** 2 a 5 minutos até o primeiro site na tela.
>
> Status: **testado** (ver `_teste/RELATORIO-teste-prompt-mestre.md`).

---

## Como usar em 3 passos

**1. Preencha o bloco de variáveis.** Só o que você sabe. O que não souber, deixe em branco: o prompt manda a IA não inventar.

**2. Cole o prompt inteiro** (bloco de variáveis + prompt) numa conversa nova.

**3. Peça os ajustes** da seção "Os 3 follow-ups" abaixo. É o que transforma "site ok" em "site que fecha cliente".

---

## O prompt (copie daqui pra baixo)

```
# O NEGÓCIO (preencha; o que você não souber, deixe vazio)
- Nicho: [NICHO]
- Nome do negócio: [NOME]
- Cidade / bairro: [CIDADE]
- WhatsApp: [TELEFONE]        (só números, com país e DDD. Ex: 5585999998888)
- Serviço que ele mais quer vender: [SERVICO_PRINCIPAL]
- Maior dor dele hoje: [DOR]  (ex: não tem site, perde cliente no WhatsApp, ninguém acha ele no Google)
- Diferencial real: [DIFERENCIAL]
- Cor da marca: [COR]         (hex, se ele já tiver. Se vazio, escolha uma que combine com o nicho)

# QUEM VOCÊ É
Você é um dev front-end sênior que também escreve copy de resposta direta.
Seu trabalho não é "fazer um site bonito". É fazer um site que faça o cliente local
chamar esse negócio no WhatsApp. O resultado do negócio é o fim, o site é o meio.

# O QUE ENTREGAR
Um arquivo `index.html` ÚNICO, self-contained: CSS e JS inline, sem build, sem framework,
sem lib externa. A única requisição externa permitida é a fonte Ubuntu do Google Fonts.
Tem que abrir com duplo clique e funcionar.

# DESIGN (isto é o que separa site profissional de site genérico)
- Fonte: Ubuntu (Google Fonts), pesos 400/500/700. font-display: swap + preconnect.
- Paleta: UMA cor de marca + neutros. Fundo claro, texto #1a1a1a. Contraste mínimo AA.
- Hierarquia forte: h1 com clamp(2rem, 5vw, 3.5rem), corpo 1.0625rem, altura de linha 1.6.
- Respiro: seções com padding vertical de 80px no desktop e 48px no mobile.
  Conteúdo em max-width 1120px, centralizado.
- Mobile-first. Layout tem que funcionar em 360px de largura.
- Sem imagem de banco de imagens (o link quebra bem na hora da demo).
- NÃO tente desenhar pessoa, rosto ou corpo em SVG. Sai boneco palito e derruba o site inteiro.
  Ícone SVG só pra forma simples e abstrata (relógio, check, local, seta).
- Onde entraria foto, RESERVE o espaço: bloco com gradiente da cor de marca, proporção fixa
  (evita layout shift) e a marca [PLACEHOLDER: foto ...] visível. Fica com cara de espaço
  reservado de propósito, não de site inacabado, e é onde a foto real do cliente entra depois.
- NÃO faça: sombra pesada, borda arredondada exagerada, emoji no lugar de ícone,
  parágrafo longo centralizado, lorem ipsum, "efeito" que não serve pra nada.

# SEÇÕES, nesta ordem
1. Topo enxuto: nome do negócio + botão de WhatsApp.
2. Hero: headline de RESULTADO (não "bem-vindo ao nosso site"), uma linha de apoio,
   CTA primário no WhatsApp e CTA secundário que rola pros serviços.
3. Serviços / benefícios: 3 a 6 cards, cada um com título curto e uma linha de benefício.
4. Prova social: 3 depoimentos. Marque cada um com [PLACEHOLDER: trocar por depoimento real].
5. Sobre: um parágrafo curto, humano, sem "somos uma empresa comprometida com a excelência".
6. Localização e horário: endereço, horário de funcionamento, link do Google Maps (link, não iframe).
7. Rodapé: contato, redes, CNPJ como placeholder.
+ Botão flutuante de WhatsApp visível em TODAS as telas, inclusive mobile,
  apontando pra https://wa.me/[TELEFONE] com mensagem pronta no parâmetro ?text=

# COPY
- Português do Brasil. Tom de quem resolve, não de quem vende. Frases curtas.
- Headline = [resultado] + [pra quem] + [onde].
- PROIBIDO usar travessão (— ou –) em qualquer texto. Use vírgula, ponto ou parênteses.
- PROIBIDO prometer número que não dá pra provar ("aumente 300% suas vendas").
- Sem lorem ipsum. Escreva copy de verdade e marque o que for suposição com [PLACEHOLDER: ...].
- Se eu deixei um campo vazio lá em cima, NÃO INVENTE fato (prêmio, ano de fundação,
  número de clientes). Use benefício honesto e genérico, ou deixe [PLACEHOLDER: ...].

# TÉCNICO
- lang="pt-BR". <title> e <meta name="description"> com serviço + cidade. Open Graph básico.
- HTML semântico: header/main/section/footer, um único h1, alt em tudo que for imagem.
- Performance alvo: PageSpeed mobile 90+. Sem JS pesado. CSS inline.
- Acessibilidade: foco visível no teclado e contraste AA.
- Área de toque de 44px de altura em TODO alvo clicável que não está dentro de uma frase:
  botão, logo do topo, link do menu, link do rodapé, botão flutuante. Isso vale no mobile.
  (Link no meio de um parágrafo pode ser menor.) Não basta aplicar nos botões, é o erro comum.

# ANIMAÇÃO (entrada profissional dos elementos, obrigatória)
O site tem que ter cara de site caro, com os elementos ENTRANDO na tela, não parados.
- Ao rolar, cada bloco aparece com fade + leve subida (translateY de 20px pra 0), duração 0.5s a 0.7s,
  easing suave (cubic-bezier(0.16, 1, 0.3, 1)).
- Stagger: dentro de uma seção, os itens (cards, bullets, depoimentos) entram em cascata, atraso de
  70ms a 100ms entre eles. Nunca todos de uma vez.
- O hero anima no load, sem esperar scroll: nome no topo, headline, linha de apoio e CTA em cascata rápida.
- Microinteração no hover: botão e card sobem de leve (translateY -2px) com sombra, transição 0.2s.
- COMO FAZER: só CSS (transition/transform/opacity) + um IntersectionObserver pequeno em JS puro que põe
  a classe "visivel" quando o elemento entra na tela. Sem biblioteca (nada de AOS, GSAP, framer-motion).
- REGRAS que não podem quebrar (senão vira site amador, lento ou com bug):
  - Anime SÓ transform e opacity. Nunca top/left/height/width/margin (trava, não roda a 60fps).
  - ZERO layout shift: o elemento já ocupa o lugar dele antes de animar (só muda opacity e transform). CLS 0.
  - Respeite prefers-reduced-motion: reduce, desligando toda animação e mostrando tudo estático e visível.
  - Fallback sem JS obrigatório: se o JavaScript não rodar, TODO o conteúdo tem que aparecer normal, nunca
    preso em opacity 0. Faça assim: um script inline no topo adiciona a classe "js" no <html>; o estado
    escondido (opacity 0) só vale dentro de "html.js". Sem JS, nada fica invisível.
  - A animação não segura o LCP: o texto do hero é legível de imediato (a animação parte de um estado já pintado).
  - Nada de exagero: sem bounce, sem zoom grande, sem girar, sem elemento voando de longe. Curto e elegante.

# SEO (o cliente quer aparecer no Google local)
- <title> único e <meta name="description"> (150 a 160 caracteres) com serviço + cidade.
- Open Graph (og:title, og:description, og:type, og:locale). canonical, og:url e og:image dependem
  da URL final: deixe como COMENTÁRIO pronto pra descomentar ao publicar. Não invente URL nem
  placeholder quebrado (uma canonical errada atrapalha o SEO mais que não ter).
- Favicon inline (SVG data-uri, a inicial do negócio na cor de marca). Sem arquivo externo.
- Dados estruturados JSON-LD com o NAP (Name, Address, Phone): nome, telefone, endereço (rua,
  cidade, estado, país), horário e link do mapa. É o que ajuda o negócio a cair no pacote local do
  Google. Use o @type mais específico do schema.org quando fizer sentido (Dentist, Restaurant,
  HealthClub, MedicalClinic...); senão "LocalBusiness". SÓ com dado real que eu te dei; o que faltar
  (rua, CEP, horário), OMITA a chave. NUNCA invente endereço.
- <meta name="robots" content="index, follow">. Um h1 só, títulos sem pular nível.

# SEGURANCA
- Todo link com target="_blank" (mapa, redes, WhatsApp em nova aba) TEM rel="noopener" (fecha o
  window.opener). Use noreferrer também em link pra fora do domínio do cliente.
- NUNCA chave de API, token ou senha no HTML. ID público de pixel/analytics pode; segredo não.
- Só recurso https. Nenhum <script> de terceiro que você não controla além do que eu pedir.
- Se tiver formulário: validação no cliente E no servidor, endpoint https, sem confiar no dado.

# PERFORMANCE (alvo: Lighthouse mobile 90+, CLS ~0)
- CSS 100% inline no <head>. Sem @import, sem CSS morto, sem CDN de CSS.
- Fonte: preconnect + font-display: swap + só os pesos usados. Nada de 9 pesos.
- Imagem: SEMPRE width e height explícitos (evita CLS), loading="lazy" abaixo da dobra, formato leve
  (WebP), dimensão real (não jogue uma imagem de 3000px num espaço de 400px). Sem banco de imagens.
- JS mínimo e inline (só o IntersectionObserver da animação). Zero biblioteca.
- Nada bloqueia a renderização além da fonte. Favicon inline (data-uri) economiza 1 requisição.

# ORDEM DE TRABALHO
Antes do código, me devolva 5 linhas: headline escolhida, cor de marca, as seções,
o CTA e o que você assumiu. NÃO espere minha confirmação, emende direto no código completo.

Depois do código, me entregue:
1. Checklist de personalização por cliente (o que eu troco pra usar isso em outro negócio).
2. Como publicar na Vercel em 3 passos.
3. Autoverificação, responda item a item:
   - tem travessão (— ou –) em algum texto?
   - o link do wa.me está certo, com país e DDD, em todos os botões?
   - tem um h1 só, e os títulos descem sem pular nível (h1, h2, h3, nunca h2 direto pro h4)?
   - todo texto passa em contraste AA, INCLUSIVE o texto secundário, a legenda pequena,
     o texto do placeholder e o texto em cima da cor de marca? (é onde sempre falha)
   - todo aria-label está num elemento com role válido? (aria-label em <div> sem role é erro)
   - as animações usam só transform/opacity, respeitam prefers-reduced-motion e não causam layout shift?
   - se o JavaScript não rodar, todo o conteúdo ainda aparece? (nada preso em opacity 0)
   - abre sem internet (fora a fonte)? funciona em 360px sem rolagem lateral?
   - JSON-LD com NAP real (nome, telefone, endereço que eu dei), sem inventar rua/CEP/horário?
   - todo target="_blank" tem rel="noopener"? nenhuma chave/segredo no HTML? favicon inline?
   - imagens com width/height + loading lazy? Lighthouse Performance mobile 90+ (CLS ~0)?
```

---

## Os 3 follow-ups (é aqui que vira wow)

Depois que o site aparecer, mande **um de cada vez**:

1. **`o hero está fraco. me dê 3 opções de headline focadas na dor [DOR] e aplique a melhor.`**
   A primeira headline quase nunca é a melhor. Essa é a que mais muda a conversão.
2. **`revise como se fosse o dono do negócio olhando pela primeira vez. o que está genérico? corrija.`**
   A IA é boa crítica do próprio trabalho quando você pede o papel certo.
3. **`me mostre onde ficou algum travessão, promessa não comprovável ou texto inventado, e corrija.`**
   Fecha o padrão de marca antes de mandar pro cliente.

> Se o cliente já tem logo ou cor: `use a cor [HEX] como cor de marca e ajuste a paleta toda em volta dela.`

---

## Checklist de personalização (o que trocar pra reusar em outro cliente)

- [ ] Nome do negócio (topo, hero, rodapé, `<title>`)
- [ ] Número do WhatsApp: **todos** os `wa.me/` e a mensagem do `?text=`
- [ ] Cor de marca (é uma variável CSS só, no `:root`)
- [ ] Headline e linha de apoio do hero
- [ ] Serviços: títulos e benefícios
- [ ] Depoimentos: trocar os `[PLACEHOLDER]` por reais **antes de publicar**
- [ ] Endereço, horário e link do Maps
- [ ] `<title>` e `description` com serviço + cidade
- [ ] Rodar o `Ctrl+F` do travessão: buscar `—` e `–`, tem que dar zero

---

## Erros comuns (e o que fazer)

| O que acontece | Por quê | Como resolver |
|---|---|---|
| Site genérico, cara de template 2015 | Você não preencheu `[DOR]` nem `[SERVICO_PRINCIPAL]` | Preencha e rode o follow-up 1 |
| Imagens quebradas | A IA puxou foto de banco de imagem | `troque toda imagem externa por gradiente ou SVG inline` |
| Veio em vários arquivos, com build | Você usou uma ferramenta que default pra framework | `refaça em um index.html único, self-contained, sem framework` |
| Apareceu travessão | O modelo escorregou | Follow-up 3. É rápido |
| WhatsApp não abre | Número sem país/DDD | Formato `5585999998888`, sem `+`, sem espaço, sem traço |

---

## Regra de uso na aula

**Bloco 3b (mostrar):** cola o prompt, gera 1 site ao vivo, mostra funcionando e libera a biblioteca.
**Bloco 5.5 (fazer junto):** cada aluno escolhe um nicho que não tem template, cola este prompt e
gera o próprio, ao vivo — vira mais um template dele e uma peça do portfólio. **Como entregar de
verdade (adaptar pro cliente, publicar, cobrar) é a Consultoria 2.** A frase de amarração: *"o
template cobre o comum, o prompt cobre o resto. Você nunca fica na mão."*
