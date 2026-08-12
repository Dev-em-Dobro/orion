# Personalizar: template Academia dark + amarelo (Titan Fit)

## O que é este template

Site de uma página pra academia (musculação, crossfit e funcional), no estilo escuro e energético: fundo quase preto, acento amarelo e títulos em caixa alta. Foco em transformar a visita em aula experimental grátis agendada pelo WhatsApp. É a versão "dark" da biblioteca (a "Academia Forja" é a versão clara). Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica.

## Checklist de 10 minutos

- [ ] **Nome da academia:** buscar `Titan Fit` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, seção Sobre, rodapé e nas mensagens do `?text=`).
- [ ] **WhatsApp:** buscar `5521999990008` e trocar em TODOS os links `wa.me` (são 9: topo, hero, tour "como funciona", os 3 planos, CTA forte, rodapé e botão flutuante). Conferir também a mensagem pronta do `?text=` (ela está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS. Ajustar junto `--cor-marca-escura` (hover de botões) e `--cor-marca-clara` (texto pequeno sobre o fundo escuro). Se mudar o amarelo por uma cor clara demais, revise o contraste do texto escuro em cima dela.
- [ ] **Headline:** reescrever o `<h1>` do hero. A palavra em amarelo está no `<span class="destaque">`, troque só ela pra manter o efeito. Ajuste também a linha de apoio logo abaixo.
- [ ] **Programas:** seção "Programas", revisar cada card (título e a linha de benefício). São 6, remova ou adicione conforme as modalidades reais.
- [ ] **Planos e preços:** seção "Planos", trocar cada `[PLACEHOLDER: R$]` (mensal, trimestral, anual), revisar os 3 bullets de cada plano e o texto do selo do plano do meio.
- [ ] **Treinadores:** seção "Equipe", trocar cada `[PLACEHOLDER: nome]` e a especialidade (musculação, crossfit, funcional, personal). São 4 cards.
- [ ] **Horários:** seção "Localização e horário", trocar os `[PLACEHOLDER]` de horário (seg a sáb).
- [ ] **Endereço e Maps:** preencher o card "Onde estamos" e trocar o link do botão "Ver no Google Maps" pelo link exato da academia.
- [ ] **Stats do hero:** trocar os `[PLACEHOLDER: nº]` e `[PLACEHOLDER: anos]` só por números reais. Se não tiver o dado, deixe o placeholder ou apague o bloco `.stats`.
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente (é o que aparece no Google).
- [ ] **Placeholders que precisam de dado real do cliente:**
  - Fotos (hero, sobre, cada programa, tour e cada treinador)
  - Números do hero (alunos ativos, anos, modalidades)
  - Preços reais dos planos e o que cada um inclui
  - Nome e especialidade de cada treinador
  - Horário de funcionamento
  - Endereço completo e link exato do Google Maps
  - 3 depoimentos reais, com autorização de uso, e os nomes dos alunos
  - Tempo de atuação e história (seção Sobre)
  - Instagram e CNPJ (rodapé)

## Cuidado com a copy (regra deste nicho)

Não prometa resultado físico ("perca 10kg", "ganhe massa em 30 dias"). O template já foi escrito com benefício honesto: constância, acompanhamento de perto e treino orientado. Mantenha esse tom quando reescrever. Também não invente número de alunos, anos de casa nem depoimento: use só o que o cliente confirmar.

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `academia-titan` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode `U+2014` (travessão) e `U+2013` (meia-risca). O resultado tem que ser zero. Se o editor não busca por código, cole cada um de uma referência e use a busca normal.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site com a janela em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado.
- [ ] Clicar TODOS os 9 botões de WhatsApp (topo, hero, tour, os 3 planos, CTA forte, rodapé e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
- [ ] Conferir o contraste com o tema escuro: texto secundário claro sobre o fundo preto e texto escuro sobre os botões amarelos precisam continuar legíveis se você mudar a cor.
- [ ] Reler a copy e garantir que não sobrou nenhuma promessa de resultado físico nem número inventado.
