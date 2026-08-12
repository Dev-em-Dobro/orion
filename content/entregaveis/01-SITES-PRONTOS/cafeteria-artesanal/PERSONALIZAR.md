# Personalizar: template Cafeteria Artesanal (Café Sereno)

## O que é este template

Site de uma página pra cafeteria de café especial, com visual artesanal (papel texturizado, tipografia manuscrita e seções variadas), focado em transformar visita em pedido pelo WhatsApp. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica. É a versão "feita à mão" da biblioteca (a outra cafeteria é a marrom aconchegante padrão).

## As 3 fontes deste template (de propósito)

Este template usa TRÊS famílias do Google Fonts pra dar o ar artesanal, e não só a Ubuntu:

- **Playfair Display** (serif elegante): todos os títulos (`h1`, `h2`, `h3`, logo, nomes de item do cardápio).
- **Caveat** (manuscrita): só nos toques curtos, como o "Fresco e artesanal" da hero, a frase da faixa de foto e alguns destaques de título (classe `.script` no HTML).
- **Ubuntu**: corpo, botões e toda a interface.

**Onde trocar:** as três vêm num único `<link>` no `<head>` (a linha do `fonts.googleapis.com/css2?family=...`). Se quiser voltar ao padrão da biblioteca (só Ubuntu), troque esse link e, no CSS, ajuste as regras `font-family:'Playfair Display'...` e `font-family:'Caveat'...` pra `'Ubuntu'`. Mas o charme deste template vem justamente da mistura das três.

## Checklist de 10 minutos

- [ ] **Nome do negócio:** buscar `Café Sereno` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, faixas, seção Sobre, rodapé e nas mensagens do `?text=`).
- [ ] **WhatsApp:** buscar `5551999990010` e trocar em TODOS os links `wa.me` (topo, hero, faixa dos grãos, CTA final, rodapé e botão flutuante). Conferir também a mensagem pronta do `?text=` (está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS (caramelo/terracota). Ajustar junto `--cor-marca-escura` (hover) e `--cor-marca-clara` (texto pequeno sobre o fundo espresso). O acento verde suave é `--cor-sage`.
- [ ] **Headline:** reescrever o `<h1>` do hero e a linha de apoio com o serviço e o bairro do cliente.
- [ ] **Cardápio e preços:** seção "Nosso cardápio", trocar cada `[PLACEHOLDER: R$]` e revisar os nomes e descrições dos itens (são 8 discos).
- [ ] **Faixa dos grãos e faixa de foto:** revisar o texto do "café do mês" e a frase manuscrita da faixa de foto grande.
- [ ] **Horários:** seção "Contato", trocar os `[PLACEHOLDER]` de horário (seg a dom).
- [ ] **Endereço e Maps:** preencher o card "Onde estamos" e trocar o link do botão "Ver no Google Maps" pelo link exato da cafeteria.
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente (é o que aparece no Google).
- [ ] **Placeholders que precisam de dado real do cliente:**
  - Foto do copo (hero), do balcão/preparo (experiência), dos grãos, do ambiente (faixa de foto)
  - Preços reais e cardápio completo do dia
  - Horário de funcionamento
  - Endereço completo e link exato do Google Maps
  - 3 depoimentos reais, com autorização de uso, e os nomes dos clientes
  - Instagram e CNPJ (rodapé)

## Cuidado com a copy

Mantenha o tom calmo e honesto do template (café feito na hora, pausa, cantinho de bairro). Não invente prêmio, ano de fundação nem número de clientes: se não tiver o dado, deixe o `[PLACEHOLDER]`.

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `cafeteria-artesanal` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode U+2014 (travessão) e U+2013 (meia-risca). O resultado tem que ser zero. Se o editor não busca por código, cole cada um de uma referência e use a busca normal.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site com a janela em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, faixa dos grãos, CTA final, rodapé e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
- [ ] Reler a copy e garantir que não sobrou nenhuma promessa ou fato inventado.
