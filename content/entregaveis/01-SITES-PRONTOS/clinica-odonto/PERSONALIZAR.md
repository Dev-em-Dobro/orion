# Personalizar: template Clínica Odontológica (Sorriso Prime)

## O que é este template

Site de uma página pra clínica odontológica, focado em transformar visita em agendamento de avaliação pelo WhatsApp. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica.

## Checklist de 10 minutos

- [ ] **Nome da clínica:** buscar `Sorriso Prime` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, seção Sobre e rodapé).
- [ ] **WhatsApp:** buscar `5511999990001` e trocar em TODOS os links `wa.me` (topo, hero, seção avaliação, convênios, localização, rodapé e botão flutuante). Conferir também a mensagem pronta do `?text=` (ela está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS. Ajustar junto `--cor-marca-escura` (hover e textos de destaque) e `--cor-marca-fundo` (fundos claros).
- [ ] **Headline:** reescrever o `<h1>` e a linha de apoio do hero com o serviço principal e a cidade do cliente.
- [ ] **Serviços:** revisar os 4 cards da seção Tratamentos (títulos e frases de benefício).
- [ ] **Endereço, horário e Maps:** preencher a seção "Localização e horário" e trocar o link do botão "Ver no Google Maps" pelo link exato da clínica.
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente (é o que aparece no Google).
- [ ] **Placeholders que precisam de dado real do cliente:**
  - Foto da fachada ou recepção (hero)
  - Lista completa de tratamentos (card "Outros tratamentos")
  - Lista de convênios aceitos
  - Formas de pagamento e parcelamento
  - 3 depoimentos reais, com autorização de uso, e os nomes dos pacientes
  - Foto do consultório ou da equipe (seção Sobre)
  - Tempo de atuação, formação da equipe e diferenciais reais (seção Sobre)
  - Endereço completo e horário de funcionamento
  - Link exato do Google Maps
  - Instagram e e-mail de contato (rodapé)
  - CNPJ
  - Nome e CRO do responsável técnico

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `clinica-odonto` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Buscar o caractere de travessão e o de meia-risca no arquivo: no editor, ative a busca por regex e procure por `\u2014|\u2013` (são os códigos Unicode desses dois traços longos, escritos assim de propósito pra não colocar o caractere aqui). O resultado tem que ser zero.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site com a janela em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, avaliação, convênios, localização, rodapé e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
