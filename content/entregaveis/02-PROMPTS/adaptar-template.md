# Prompt: adaptar um template pro cliente X

> **Quando usar:** o nicho **tem** template em `01-SITES-PRONTOS/` (ou você tem um site que já
> fez pra outro cliente) e você quer adaptar em vez de gerar do zero. É o caminho **mais rápido**
> e o que você vai usar em 80% dos casos.
> **Regra:** adaptar não é trocar o nome. É trocar o nome, a cor, a copy e as provas.
> Se você só trocar o nome, seus 5 clientes vão ter o mesmo site e alguém vai perceber.

---

## O prompt

```
# CONTEXTO
Eu tenho um template de site pronto (código anexo / na pasta [PASTA]).
Quero adaptar ele pro cliente abaixo, sem refazer do zero.

# O CLIENTE
- Nicho: [NICHO]
- Nome: [NOME]
- Cidade / bairro: [CIDADE]
- WhatsApp: [TELEFONE]        (só números, com país e DDD. Ex: 5585999998888)
- Serviço principal: [SERVICO_PRINCIPAL]
- Maior dor dele hoje: [DOR]
- Cor da marca: [COR]          (se vazio, mantenha a do template)
- Endereço e horário: [ENDERECO_HORARIO]

# TAREFA
1. Primeiro LEIA o template e me diga em 5 linhas: quais seções existem, onde está a cor
   de marca, onde estão os links de WhatsApp e o que é conteúdo fixo vs. o que é do cliente.
2. Depois adapte, nesta ordem de prioridade:
   a. Todos os pontos de contato (wa.me, telefone, e-mail, mensagem do ?text=).
   b. Nome do negócio em TODOS os lugares (topo, hero, sobre, rodapé, <title>, Open Graph).
   c. Cor de marca (mexa na variável do :root, não em cada regra de CSS).
   d. Copy: headline, serviços e sobre, focados na dor [DOR]. Não reaproveite o texto do template.
   e. Endereço, horário e link do Maps.
   f. <title> e <meta description> com serviço + cidade.
3. Depoimentos: deixe como [PLACEHOLDER: pedir depoimento real ao cliente].
   NUNCA publique depoimento inventado.

# REGRAS
- Mantenha a fonte Ubuntu e a estrutura que já funciona. Não "melhore" o layout sem eu pedir.
- Mantenha as animações de entrada do template (fade + subida com stagger). Se o template não tiver,
  adicione: só CSS + IntersectionObserver, transform/opacity, respeitando prefers-reduced-motion, e
  sem JS o conteúdo aparece normal (nunca preso em opacity 0).
- PROIBIDO travessão (— ou –) em qualquer texto novo.
- NÃO INVENTE fato sobre o cliente. O que faltar, marque [PLACEHOLDER: confirmar].
- Se o template tiver seção que não faz sentido pro nicho, me AVISE antes de remover.

# DEPOIS
1. Liste tudo que você trocou (arquivo e linha).
2. Liste o que ficou como [PLACEHOLDER] e eu preciso pedir pro cliente.
3. Autoverificação: sobrou algum vestígio do negócio anterior (nome, telefone, cidade, cor)?
   Faça uma busca e me mostre o resultado.
```

---

## O passo que ninguém faz (e é o que te diferencia)

Depois de adaptar, rode:

```
Procure no código inteiro por qualquer vestígio do template original:
nome antigo, telefone antigo, cidade antiga, e-mail antigo, texto de exemplo.
Me mostre cada ocorrência com arquivo e linha.
```

Mandar pro cliente um site com o telefone do template é o erro que mais queima confiança.
Custa 10 segundos checar.

---

## Amarração com o portfólio

Cada template adaptado **já é uma peça do seu portfólio**, mesmo antes de ter cliente.
Adapte 2 ou 3 pra nichos que você quer atacar, publique os previews e você tem portfólio hoje.
*Portfólio é prova de capacidade, não histórico de clientes.*
