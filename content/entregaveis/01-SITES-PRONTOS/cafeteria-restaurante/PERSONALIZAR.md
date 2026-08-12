# Personalizar: template Cafeteria / Restaurante (Café do Largo)

## O que é este template

Site de uma página pra cafeteria ou restaurante de bairro, focado em fazer o cliente pedir pelo WhatsApp pra retirada. Todos os dados são fictícios de propósito: você troca pelos dados reais do seu cliente e entrega.

## Checklist de 10 minutos

- [ ] **Nome do negócio**: trocar "Café do Largo" no topo, no hero, na seção Sobre, no rodapé, no `<title>`, na `<meta name="description">` e nas tags `og:title` / `og:description`. Use o "buscar e substituir" do editor.
- [ ] **WhatsApp**: trocar `5511999990004` em TODOS os links `wa.me` (topo, hero, cardápio, banner final, rodapé e botão flutuante). Trocar também a mensagem pronta dentro do `?text=` de cada link (ela está codificada pra URL, espaços viram `%20`).
- [ ] **Cor da marca**: trocar o valor de `--cor-marca` no `:root` (uma linha só, o resto da paleta se ajusta sozinho).
- [ ] **Headline e linha de apoio**: dentro da section do hero. Foque no resultado pro cliente final, não em "bem-vindo ao nosso site".
- [ ] **Cardápio e preços**: trocar os itens de exemplo pelos reais e substituir todos os `[PLACEHOLDER: R$]` pelos preços do cliente.
- [ ] **Horários**: na seção "Horários e como chegar", trocar os 3 `[PLACEHOLDER: horários]`.
- [ ] **Endereço e Maps**: trocar `[PLACEHOLDER: endereço completo]` (aparece na seção Como chegar e no rodapé) e trocar o link do botão "Abrir no Google Maps" pelo link exato do negócio do cliente.
- [ ] **Title e meta description**: confirmar que ficaram com o serviço + a cidade do cliente (ex: "café da manhã e brunch em Pinheiros, São Paulo").
- [ ] **Lista de [PLACEHOLDER]**: buscar `[PLACEHOLDER` no arquivo. Precisam de dado real do cliente:
  - 9 preços do cardápio
  - link do iFood (se o cliente tiver; se não tiver, apague a linha)
  - 3 fotos (ambiente, pratos do brunch, balcão/vitrine): substitua o bloco de gradiente por `<img>` com `alt`
  - 3 depoimentos reais + 3 nomes de clientes
  - 1 detalhe real da história do café (seção Sobre)
  - 3 horários
  - endereço completo (2 lugares) + link exato do Maps
  - @ do Instagram
  - CNPJ

## Publicar na Vercel em 3 passos

1. Crie uma conta grátis em vercel.com e instale o Node.js no seu computador.
2. No terminal, dentro da pasta que contém o `index.html`, rode `npx vercel` e faça login quando ele pedir (aceite as opções padrão).
3. Rode `npx vercel --prod` e copie o link final. Pronto, é esse link que você manda pro cliente.

## Checagem final (2 minutos)

- [ ] Abra a busca do editor e procure o caractere de travessão (o traço longo) e o de meia-risca (o traço médio). Dica: no VS Code, procure pelos caracteres de código Unicode `U+2014` (travessão) e depois `U+2013` (meia-risca). As duas buscas têm que dar zero resultado.
- [ ] Abra o site, aperte F12, ative o modo responsivo e teste em 360px de largura: não pode ter rolagem lateral e tudo tem que continuar legível.
- [ ] Clique TODOS os botões de WhatsApp (topo, hero, cardápio, banner final, rodapé e o botão flutuante): cada um tem que abrir a conversa com o número certo e a mensagem pronta preenchida.
