# Personalizar: template Salão de beleza (Salão Aurora)

## O que é este template

Site de uma página pra salão de beleza / cabeleireiro (baseado no design "Saloni"), elegante, focado em transformar visita em horário marcado pelo WhatsApp. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica.

Este template usa **três fontes do Google** de propósito, pra manter o estilo do salão: **Playfair Display** (títulos serifados), **Great Vibes** (o texto manuscrito) e **Jost** (corpo). Ficam num único link no `<head>`. Se quiser trocar, mude o `<link>` das fontes e os `font-family` no CSS.

## Checklist de 10 minutos

- [ ] **Nome do salão:** buscar `Salão Aurora` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, sobre, rodapé e nas mensagens do `?text=`).
- [ ] **WhatsApp:** buscar `5511999990011` e trocar em TODOS os links `wa.me`, no telefone do topo e no `numeroWhats` do formulário (procure `5511999990011` no arquivo, tem que trocar em todas). Conferir a mensagem do `?text=` (URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` (roxo). O tom do hero é `--rose`; ajuste se quiser outra paleta.
- [ ] **Headline:** reescrever o `<h1>` do hero.
- [ ] **Serviços e preços:** revisar os 6 cards de serviço e trocar cada `A partir de [PLACEHOLDER: R$]`.
- [ ] **Pacotes:** seção escura de pacotes, trocar cada `[PLACEHOLDER: R$]` e revisar o que cada um inclui.
- [ ] **Equipe:** trocar os `[PLACEHOLDER: nome]` e as fotos das profissionais.
- [ ] **Horário e endereço:** seção "Venha nos visitar" e rodapé; trocar o link "Ver no Google Maps" pelo link exato do salão.
- [ ] **Title e meta description:** atualizar com serviço + cidade.
- [ ] **Placeholders que precisam de dado real:** fotos (destaque do hero, ambiente, galeria, equipe), preços, horários, endereço, 3 depoimentos reais (com autorização) e os nomes, Instagram, CNPJ.

## Como funciona o formulário

O formulário "Agende em um minuto" NÃO envia pra nenhum servidor. Ao enviar, ele monta a mensagem (nome + serviço + período) e abre o WhatsApp já preenchido, é só a cliente apertar enviar. Sem backend, sem custo, sem configuração.

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com Google ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `salao-beleza` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode `U+2014` (travessão) e `U+2013` (meia-risca). O resultado tem que ser zero.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Testar o formulário: preencher e conferir que ele abre o WhatsApp com a mensagem certa.
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, pacotes, contato, rodapé e o flutuante) e conferir que abrem a conversa certa.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
