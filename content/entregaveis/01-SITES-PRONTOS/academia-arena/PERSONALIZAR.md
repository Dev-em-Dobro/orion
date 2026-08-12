# Personalizar: template Academia dark (Arena Fitness)

## O que é este template

Site de uma página pra academia, no estilo escuro e forte (baseado no design "Zymzoo"), focado em transformar visita em aula experimental agendada pelo WhatsApp. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica.

Este template usa **duas fontes do Google** de propósito, pra manter o estilo da academia: **Oswald** (títulos em caixa alta) e **Barlow** (corpo). Ficam num único link no `<head>`. Se quiser trocar, mude o `<link>` das fontes e o `font-family` no CSS.

## Checklist de 10 minutos

- [ ] **Nome da academia:** buscar `Arena Fitness` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, rodapé e nas mensagens do `?text=`).
- [ ] **WhatsApp:** buscar `5541999990012` e trocar em TODOS os links `wa.me` (topo, hero, planos, CTA final, contato, rodapé e botão flutuante). Conferir também a mensagem pronta do `?text=` (está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS. Ajustar junto `--cor-marca-escura` (hover).
- [ ] **Headline:** reescrever o `<h1>` do hero com o serviço e o bairro do cliente.
- [ ] **Modalidades e programas:** revisar os cards de "Escolha o seu treino" e a faixa de modalidades.
- [ ] **Planos e preços:** seção "Planos", trocar cada `[PLACEHOLDER: R$]` (mensal, trimestral, anual) e revisar os benefícios de cada plano.
- [ ] **Equipe:** trocar os `[PLACEHOLDER: nome]` e as fotos dos professores.
- [ ] **Horários e endereço:** seção "Horários e localização" e rodapé; trocar o link do botão "Ver no Google Maps" pelo link exato.
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente.
- [ ] **Placeholders que precisam de dado real:** fotos (atleta do hero, modalidades, programas, professores, tour), preços dos planos, horários, endereço, 3 depoimentos reais (com autorização) e os nomes, Instagram, CNPJ.

## Cuidado com a copy (regra deste nicho)

Não prometa resultado físico ("perca 10kg", "ganhe massa em 30 dias"). O template já foi escrito com benefício honesto: constância, acompanhamento de perto e treino orientado. Mantenha esse tom.

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `academia-arena` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode `U+2014` (travessão) e `U+2013` (meia-risca). O resultado tem que ser zero.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Conferir o contraste do texto sobre o fundo escuro e sobre o amarelo (tem que continuar legível).
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, planos, CTA, contato, rodapé e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
- [ ] Reler a copy e garantir que não sobrou nenhuma promessa de resultado físico.
