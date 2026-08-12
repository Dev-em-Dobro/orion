# Personalizar: template Advocacia

**O que é:** site de uma página para escritório de advocacia, num único `index.html` (abre com duplo clique, sem build). Troque os dados fictícios de Almeida & Rocha pelos do seu cliente e publique.

## Checklist de 10 minutos

- [ ] **Nome do escritório:** busque `Almeida` e troque em todos os pontos: `<title>`, meta description, Open Graph, topo, hero, seção Sobre, rodapé e a mensagem do WhatsApp (o `?text=` cita o nome).
- [ ] **WhatsApp:** busque `5541999990002` e troque TODOS os links `wa.me` (topo, hero, como funciona, localização, rodapé e botão flutuante). Formato: só números, com país e DDD. Revise também a mensagem pronta no `?text=` (é texto codificado de URL: espaço vira `%20`).
- [ ] **Cor da marca:** variável `--cor-marca` no `:root` (topo do `<style>`). Ajuste também `--cor-marca-clara` e `--cor-marca-escura` para tons da mesma cor.
- [ ] **Headline:** o `<h1>` do hero e a linha de apoio logo abaixo.
- [ ] **Áreas de atuação:** títulos e descrições dos 4 cards. Use as áreas reais do cliente.
- [ ] **Endereço, horário e Maps:** seção "Localização e horário". Troque o link do Google Maps pelo link exato do escritório (no Maps: Compartilhar, depois Copiar link).
- [ ] **`<title>` e meta description:** mantenha o padrão serviço + cidade.
- [ ] **Lista de `[PLACEHOLDER]` que exigem dado real do cliente:**
  - 3 depoimentos + 3 nomes de clientes (seção Depoimentos)
  - Foto do escritório ou da equipe (seção Sobre)
  - Endereço completo (Localização)
  - Horário de atendimento (Localização)
  - E-mail do escritório (rodapé)
  - Link do Instagram (rodapé)
  - Número de registro na OAB (rodapé)
  - CNPJ (rodapé)

## Aviso: publicidade da OAB

Antes de publicar, revise o texto final com as regras de publicidade da OAB (Provimento 205/2021): nada de promessa de resultado, superlativo ("o melhor escritório") ou valores de honorários. O número de registro na OAB deve aparecer no rodapé. Na dúvida, peça para o advogado validar o texto: ele é o responsável perante a Ordem.

## Publicar na Vercel em 3 passos

1. Crie uma conta gratuita em vercel.com (pode entrar com Google).
2. No terminal, dentro da pasta do site, rode `npx vercel` e aceite as opções padrão.
3. Copie a URL gerada, abra no celular e teste. Para domínio próprio: Settings, depois Domains no painel da Vercel.

## Checagem final

- [ ] **Traço longo:** busque o caractere de travessão e o de meia-risca no arquivo. Use a busca do VS Code e procure pelos caracteres de código Unicode `U+2014` (travessão) e `U+2013` (meia-risca). Tem que dar zero resultados.
- [ ] **Mobile:** abra o DevTools (F12), modo responsivo, largura 360px. Nada de rolagem lateral, botões com área de toque confortável.
- [ ] **WhatsApp:** clique TODOS os botões de WhatsApp (topo, hero, como funciona, localização, rodapé e o flutuante). Cada um deve abrir a conversa certa, com a mensagem pronta e o nome do cliente atualizado.
