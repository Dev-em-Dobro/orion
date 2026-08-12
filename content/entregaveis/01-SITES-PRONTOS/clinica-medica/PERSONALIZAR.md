# Personalizar: template Clínica Médica (Clínica Vitalis)

## O que é este template

Site de uma página pra clínica médica ou consultório com várias especialidades, focado em transformar visita em consulta agendada pelo WhatsApp. Um `index.html` único, sem build e sem dependência: você troca os dados, abre no navegador e publica. O hero ocupa a tela toda (foto com overlay) e tem um formulário de agendamento que abre o WhatsApp com a mensagem pronta.

## Checklist de 10 minutos

- [ ] **Nome da clínica:** buscar `Clínica Vitalis` e trocar em todos os lugares (aparece no `<title>`, meta description, Open Graph, topo, hero, seção Sobre, rodapé e nas mensagens do `?text=`).
- [ ] **WhatsApp:** buscar `5585999990009` e trocar em TODOS os links `wa.me` (topo, hero, seção Precisa de ajuda, rodapé e botão flutuante) E também na linha `var numeroWhats = '5585999990009';` dentro do `<script>` (é o número que o formulário usa pra montar o link). Conferir também a mensagem pronta do `?text=` (ela está em URL encode: espaço vira `%20`, acento vira código).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` do CSS. Ajustar junto `--cor-marca-forte` (fundos teal e hero), `--cor-marca-escura` (hover, gradientes e faixa de depoimentos) e `--cor-marca-clara` (texto pequeno sobre fundo escuro). O rodapé usa `--marinho`.
- [ ] **Headline:** reescrever o `<h1>` e a linha de apoio do hero com o serviço principal e a cidade do cliente.
- [ ] **Especialidades:** seção "Nossas especialidades", confirmar as especialidades reais e trocar os títulos e frases dos 6 cards (e o `[PLACEHOLDER: confirmar as especialidades reais]`). Atualizar também a lista de especialidades do rodapé.
- [ ] **Equipe:** seção "Conheça a equipe", trocar em cada card `[PLACEHOLDER: nome]`, `[PLACEHOLDER: especialidade]` e `[PLACEHOLDER: CRM]`. Use dado real do médico e o CRM correto.
- [ ] **Horários:** seção "Localização e horário", trocar os `[PLACEHOLDER]` de horário (seg a sáb e domingo).
- [ ] **Endereço e Maps:** preencher o endereço no card "Onde estamos" (e na seção "Precisa de ajuda?") e trocar o link do botão "Ver no Google Maps" pelo link exato da clínica.
- [ ] **Title e meta description:** atualizar com serviço + cidade do cliente (é o que aparece no Google).
- [ ] **Placeholders que precisam de dado real do cliente:**
  - Foto da equipe médica (hero)
  - Foto da recepção ou do ambiente (seção Sobre e Precisa de ajuda)
  - Especialidades reais e imagens de cada uma
  - Nome, especialidade e CRM de cada médico (seção Equipe)
  - Foto do corpo clínico (seção Nossos médicos)
  - 3 depoimentos reais, com autorização de uso, e os nomes dos pacientes
  - Títulos e imagens dos artigos (seção Dicas de saúde)
  - Telefone fixo, endereço completo e horário de funcionamento
  - Link exato do Google Maps
  - Instagram e CNPJ (rodapé)
  - Nome e CRM do responsável técnico (rodapé)

## Cuidado com a copy (regra deste nicho: publicidade médica)

Antes de publicar, revise TODO o texto com as regras de publicidade médica do CFM (Conselho Federal de Medicina). Em resumo, é proibido:

- Prometer cura, resultado garantido ou usar superlativo ("a melhor clínica", "os melhores médicos").
- Sensacionalismo, promessa de recuperação e comparação com concorrentes.
- Imagens de antes e depois.

O template já foi escrito com tom informativo e acolhedor, sem promessa de resultado. Mantenha esse tom quando reescrever. Preencha o responsável técnico e o CRM no rodapé (é obrigatório) e confirme o registro de cada médico da equipe.

## Como funciona o formulário do WhatsApp

O formulário de agendamento (bloco teal "Agende sua consulta") NÃO usa backend e NÃO envia nada pra servidor nenhum. Quando o paciente preenche nome, especialidade e período e clica em enviar, um pequeno script monta uma mensagem com esses dados e abre o WhatsApp da clínica (`wa.me`) com a mensagem pronta, pra ele só tocar em enviar. Por isso o número do WhatsApp precisa estar certo também dentro do `<script>` (linha `var numeroWhats`).

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com GitHub ou e-mail).
2. No painel, clique em "Add New" > "Project" e envie a pasta `clinica-medica` (ou rode `npx vercel` dentro da pasta pelo terminal).
3. Confirme o deploy e copie o link `.vercel.app` gerado. É esse link que você manda pro cliente aprovar.

## Checagem final (antes de mandar pro cliente)

- [ ] Conferir que não sobrou travessão nem meia-risca: no editor, ative a busca e procure pelos caracteres de código Unicode U+2014 (travessão) e U+2013 (meia-risca). O resultado tem que ser zero. Se o editor não busca por código, cole cada um de uma referência e use a busca normal.
- [ ] Buscar `PLACEHOLDER`: também tem que dar zero antes de publicar.
- [ ] Abrir o site com a janela em 360px de largura (DevTools > modo responsivo) e conferir que nada estoura pro lado e que o hero continua ocupando a tela.
- [ ] Clicar TODOS os botões de WhatsApp (topo, hero, Precisa de ajuda, rodapé e o flutuante) e conferir que abrem a conversa certa, com a mensagem pronta.
- [ ] Preencher o formulário de agendamento e enviar: conferir que abre o WhatsApp com nome, especialidade e período na mensagem, e no número certo.
- [ ] Abrir o link do Google Maps e conferir que cai no endereço certo.
- [ ] Reler a copy com as regras de publicidade médica do CFM e garantir que não sobrou promessa de cura, superlativo, nem nada inventado (médico, prêmio, número de pacientes). Preencher responsável técnico e CRM.
