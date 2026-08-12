# Personalizar: template Pet shop / Veterinária (Patas & Cia)

## O que é este template

Site de uma página pra pet shop ou clínica veterinária, focado em transformar visita em agendamento de banho e tosa ou consulta pelo WhatsApp. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica.

## Checklist de 10 minutos

- [ ] **Nome do negócio:** buscar `Patas` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, seção Sobre e rodapé).
- [ ] **WhatsApp:** buscar `5582999990007` e trocar em TODOS os links `wa.me` (topo, hero, serviços, "como funciona", sobre, rodapé e botão flutuante). Conferir também a mensagem pronta do `?text=` (ela está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS. Ajustar junto `--cor-marca-escura` (a mesma cor mais escura, usada em botão e texto pra garantir contraste) e `--cor-marca-suave` (fundo claro derivado da marca).
- [ ] **Headline:** reescrever o `<h1>` e a linha de apoio do hero com o serviço principal e o bairro do cliente.
- [ ] **Serviços e preços:** revisar títulos, linhas de benefício e trocar cada `[PLACEHOLDER: R$]` (banho e tosa, consulta veterinária, vacinas, hotelzinho).
- [ ] **Endereço, horário e Maps:** preencher a seção "Onde estamos" e trocar o link do Google Maps pelo link exato do negócio.
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente (é o que aparece no Google).
- [ ] **Placeholders que precisam de dado real do cliente:**
  - Preços reais dos serviços
  - Confirmar se oferece hotelzinho e leva-e-traz (removê-los se não oferece)
  - Horário de funcionamento
  - Endereço completo e link exato do Google Maps
  - Fotos do espaço e de pets atendidos (com autorização do tutor)
  - 3 depoimentos reais, com autorização de uso, e os nomes dos tutores
  - Tempo de atuação e a equipe (seção Sobre)
  - Instagram e CNPJ (rodapé)

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `petshop-vet` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode `U+2014` (travessão) e `U+2013` (meia-risca). O resultado tem que ser zero. Se o editor não busca por código, cole cada um de uma referência e use a busca normal.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site com a janela em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, serviços, "como funciona", sobre, rodapé e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
