# Personalizar: template Barbearia (Barbearia Norte)

## O que é este template

Site de uma página pra barbearia, focado em transformar visita em horário marcado pelo WhatsApp. Hero escuro com acento âmbar pra dar a vibe do nicho, resto do site em fundo claro. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica.

## Checklist de 10 minutos

- [ ] **Nome da barbearia:** buscar `Barbearia Norte` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, seção Sobre, rodapé, `aria-label` do botão flutuante e nas mensagens do `?text=`).
- [ ] **WhatsApp:** buscar `5531999990003` e trocar em TODOS os links `wa.me` (topo, hero, serviços, sobre, rodapé e botão flutuante). Conferir também a mensagem pronta do `?text=` (ela está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS. Ajustar junto `--cor-marca-escura` (hover e gradientes), `--cor-marca-clara` (acento sobre o fundo escuro do hero) e `--cor-marca-texto` (âmbar escuro pra texto pequeno em fundo claro).
- [ ] **Headline:** reescrever o `<h1>` e a linha de apoio do hero.
- [ ] **Serviços e preços:** seção "Serviços e preços", trocar cada `[PLACEHOLDER: R$]` (corte, barba, combo corte + barba, sobrancelha).
- [ ] **Horários:** tabela da seção "Localização e horários", trocar cada `[PLACEHOLDER: horário]` (seg a sáb).
- [ ] **Endereço e Maps:** preencher a seção "Localização e horários" e o rodapé, e trocar o link "Ver no Google Maps" pelo link exato da barbearia.
- [ ] **Fotos:** trocar os blocos `[PLACEHOLDER: foto ...]` da galeria (espaço, corte finalizado, corte + barba).
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente (é o que aparece no Google).
- [ ] **Placeholders que precisam de dado real do cliente:**
  - Preços reais dos serviços
  - Horário de funcionamento
  - Endereço completo e link exato do Google Maps
  - Fotos do espaço e de cortes (galeria)
  - 3 depoimentos reais, com autorização de uso, e os nomes dos clientes
  - Tempo de casa e a equipe (seção Sobre)
  - Instagram e CNPJ (rodapé)

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `barbearia` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode `U+2014` (travessão) e `U+2013` (meia-risca). O resultado tem que ser zero. Se o editor não busca por código, cole cada um de uma referência e use a busca normal.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site com a janela em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Conferir o contraste do texto no hero escuro e no acento âmbar (tem que continuar legível).
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, serviços, sobre, rodapé e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
