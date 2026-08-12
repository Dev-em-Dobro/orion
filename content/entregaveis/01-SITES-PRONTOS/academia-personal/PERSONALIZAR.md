# Personalizar: template Academia / Personal (Academia Forja)

## O que é este template

Site de uma página pra academia ou personal trainer, focado em transformar visita em aula experimental grátis agendada pelo WhatsApp. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica.

## Checklist de 10 minutos

- [ ] **Nome da academia:** buscar `Academia Forja` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, seção Sobre, rodapé e nas mensagens do `?text=`).
- [ ] **WhatsApp:** buscar `5561999990006` e trocar em TODOS os links `wa.me` (são 8: topo, hero, planos, horários, sobre, rodapé, CTA final e botão flutuante). Conferir também a mensagem pronta do `?text=` (ela está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS. Ajustar junto `--cor-marca-escura` (hover e gradientes) e `--cor-marca-clara` (texto pequeno sobre o fundo escuro do hero).
- [ ] **Headline:** reescrever o `<h1>` e a linha de apoio do hero com o serviço principal e o bairro do cliente.
- [ ] **Planos e preços:** seção "Planos", trocar cada `[PLACEHOLDER: R$]` (mensal, trimestral, anual) e revisar a linha de benefício de cada plano.
- [ ] **Horários:** seção "Horários e localização", trocar os `[PLACEHOLDER]` de horário (seg a sáb).
- [ ] **Endereço e Maps:** preencher o card "Onde estamos" e trocar o link do botão "Ver no Google Maps" pelo link exato da academia.
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente (é o que aparece no Google).
- [ ] **Placeholders que precisam de dado real do cliente:**
  - Foto da estrutura (hero e seção Estrutura)
  - Preços reais dos planos e o que cada um inclui
  - Horário de funcionamento
  - Endereço completo e link exato do Google Maps
  - 3 depoimentos reais, com autorização de uso, e os nomes dos alunos
  - Tempo de atuação e diferenciais reais (seção Sobre)
  - Instagram e CNPJ (rodapé)

## Cuidado com a copy (regra deste nicho)

Não prometa resultado físico ("perca 10kg", "ganhe massa em 30 dias"). O template já foi escrito com benefício honesto: constância, acompanhamento de perto e treino orientado. Mantenha esse tom quando reescrever.

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `academia-personal` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode `U+2014` (travessão) e `U+2013` (meia-risca). O resultado tem que ser zero. Se o editor não busca por código, cole cada um de uma referência e use a busca normal.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site com a janela em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, planos, horários, sobre, rodapé, CTA final e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
- [ ] Reler a copy e garantir que não sobrou nenhuma promessa de resultado físico.
