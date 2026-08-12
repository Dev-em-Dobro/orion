# Personalizar: template Estética / Salão de Beleza

**O que é este template:** um site de uma página só (`index.html`), pronto pra estética e salão de beleza, focado em fazer o cliente final agendar pelo WhatsApp. Troque os dados de exemplo (Studio Ana Beleza) pelos do seu cliente e publique.

## Checklist de 10 minutos

- [ ] **Nome do negócio:** trocar "Studio Ana Beleza" no `<title>`, na meta description, no Open Graph, no topo, no hero, na seção Sobre, no rodapé e na mensagem do WhatsApp.
- [ ] **WhatsApp:** trocar `5581999990005` em TODOS os links `wa.me` (topo, hero, Como agendar, rodapé e botão flutuante) e revisar a mensagem do `?text=` (o texto vai codificado: espaço vira `%20`, acento vira código tipo `%C3%A1`).
- [ ] **Cor da marca:** trocar `--cor-marca` no `:root` (e `--cor-marca-escura`, uma versão mais escura da mesma cor, usada no hover e no gradiente).
- [ ] **Headline:** reescrever o `<h1>` e a linha de apoio com o resultado + público + bairro do seu cliente.
- [ ] **Serviços e preços:** ajustar os 5 cards (título, linha de benefício) e preencher os 5 `[PLACEHOLDER: R$]`.
- [ ] **Endereço, horário e Maps:** preencher rua e número, dias e horários, e trocar o link do botão "Ver rota no Google Maps" pelo link real do negócio no Maps.
- [ ] **Title e meta description:** manter o formato serviço + cidade (ex: "Design de sobrancelha em Boa Viagem, Recife").
- [ ] **Placeholders que exigem dado real do cliente:**
  - 1 foto do hero (espaço do studio ou atendimento, com autorização)
  - 3 fotos de antes e depois (sempre com autorização da cliente)
  - 3 depoimentos reais + 3 nomes das clientes
  - Endereço completo
  - Dias e horários de funcionamento
  - @ do Instagram
  - CNPJ

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com e, com o Node instalado, rode `npx vercel login` no terminal.
2. Entre na pasta do site (a que tem o `index.html`) e rode `npx vercel`. Aceite as opções padrão.
3. Rode `npx vercel --prod` e pronto: o link que aparecer é o site no ar. Mande pro cliente.

## Checagem final (antes de mandar pro cliente)

- [ ] **Caçar o travessão:** busque o caractere de traço longo (travessão) e o de meia-risca no arquivo. No VS Code: `Ctrl+F`, ative o modo regex (ícone `.*`) e busque `\u2014|\u2013` (são os códigos Unicode do traço longo e da meia-risca, sem precisar digitar os caracteres). Tem que dar ZERO resultados. Se achar, troque por vírgula, ponto ou parênteses.
- [ ] **Testar em 360px:** abra o site, aperte `F12`, ative o modo responsivo e ajuste a largura pra 360px. Não pode ter rolagem lateral nem texto cortado.
- [ ] **Clicar TODOS os botões de WhatsApp:** topo, hero, Como agendar, rodapé e o botão flutuante. Cada um tem que abrir a conversa no número certo, com a mensagem pronta preenchida.
