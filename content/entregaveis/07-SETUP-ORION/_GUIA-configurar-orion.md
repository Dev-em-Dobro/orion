# Como configurar o Orion (passo a passo, sem travar)

O Orion precisa de uma **chave de API do Google** pra funcionar. É ela que dá acesso a duas coisas:

- **Places API (New)** = busca os negócios por termo e cidade (a lista de leads).
- **PageSpeed Insights API** = faz o diagnóstico de site lento (o que te dá o gancho de abordagem).

A chave é gratuita pra o uso da Consultoria. Leva uns 5 minutos pra criar. Siga na ordem.

---

## Antes de tudo: o medo do cartão de crédito (resolvido)

Essa é a dúvida número 1 da turma. Direto ao ponto:

- O Google **pede um cartão** só pra ativar o faturamento da conta. É padrão, não é golpe.
- Ele **não cobra na hora**. Você ganha um crédito inicial de cortesia e ainda tem uma **cota grátis todo mês**.
- O uso do Orion fica **tranquilamente dentro do que é grátis**. Você não vai fazer nem perto de mil consultas por mês. **Na prática, não paga nada.**
- Não tem cartão de crédito? Funciona com **cartão de débito**, ou peça ao banco um **cartão virtual** com saldo zerado (ou de centavos) só pra o cadastro.
- E mesmo que um dia passasse do limite grátis: se você fechar **um** cliente com a ferramenta, ela já se pagou muitas vezes.

> Resumo: cadastra o cartão sem medo. É pra liberar o acesso, não pra cobrar.

---

## Passo a passo

### 1. Entre no Google Cloud Console
Acesse **console.cloud.google.com** e faça login com sua conta Google (pode ser seu Gmail normal).

### 2. Crie um projeto
No topo, clique no seletor de projetos e em **"Novo projeto"**. Dê um nome (ex.: `orion-leads`) e crie. Depois, selecione esse projeto.

### 3. Ative o faturamento (billing)
No menu, vá em **Faturamento** e vincule uma forma de pagamento (o cartão de que falamos acima). Sem isso, a busca de leads não funciona. Lembre: é só pra liberar, não cobra.

### 4. Ative as 2 APIs que o Orion usa
Ative as duas, uma de cada vez. Links diretos (com o projeto certo selecionado, clique em **"Ativar"**):

- **Places API (New):** https://console.cloud.google.com/apis/library/places.googleapis.com
- **PageSpeed Insights API:** https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com

> Atenção: é a **Places API (New)**, a versão nova. Ative exatamente essa.

### 5. Crie a chave de API
Vá em **APIs e serviços > Credenciais > Criar credenciais > Chave de API**. O Google vai gerar um código comprido (a sua chave). **Copie e guarde.**

### 6. (Opcional) Restrinja a chave com cuidado
Você pode restringir a chave pra ela não ser usada por terceiros. Se fizer isso:
- Em **Restrições de API**, marque as duas: **Places API (New)** e **PageSpeed Insights API**. Se esquecer uma, o Orion quebra.
- Na dúvida, deixe **sem restrição** pra testar primeiro, e restrinja depois que estiver funcionando.

### 7. Cole no Orion e teste
Abra o Orion, vá na configuração da chave, cole a chave e clique em **testar**. Deu certo? Já pode buscar seus primeiros leads.

Orion: **/** (acesso liberado no Kickoff, login por convite).

---

## Deu erro? Os 4 problemas mais comuns

**"REQUEST_DENIED" / "serviço negado" / "requires billing to be enabled"**
A API não foi ativada, ou o faturamento não está ligado. Volte aos passos 3 e 4, confirme que **as duas APIs** estão ativadas e o faturamento vinculado. Espere 2 ou 3 minutos e teste de novo.

**A chave nova não funciona na hora**
A ativação leva alguns minutos pra "propagar" no Google. **Espere um pouco e teste de novo.** Muita gente resolveu só tentando pela segunda vez.

**Ativei, mas continua dando erro de permissão**
Confira se ativou a **Places API (New)** (a nova), e não a antiga. Ative a nova e teste de novo.

**Restrições bloqueando**
Se você restringiu a chave, garanta que **Places API (New)** e **PageSpeed Insights API** estão nas APIs permitidas. Se restringiu por site/IP, remova a restrição pra testar.

> Ainda travou? Manda um print do erro no grupo. A gente destrava rápido.

---

*Arsenal Dev em Dobro · Consultoria Freela. Padrão de marca: fonte Ubuntu, copy sem travessão.*
