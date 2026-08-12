# Guia: publicar o seu portfólio no GitHub Pages (grátis, sem terminal)

> Objetivo: colocar o seu `index.html` no ar com um link só seu, tipo
> `https://seu-usuario.github.io/portfolio`. Tudo pelo site do GitHub, **sem instalar nada**.
> Já personalizou o `index.html`? (Se não, faça o `_GUIA-personalizar.md` primeiro.)

---

## Passo a passo (uns 5 minutos)

**1. Ter uma conta no GitHub.**
Entre em [github.com](https://github.com). Se não tiver conta, clique em **Sign up** e crie (é grátis).
Guarde o seu nome de usuário, ele vai no link do site.

**2. Criar um repositório.**
No canto superior direito, clique no **+** → **New repository**.
- **Repository name:** `portfolio` (o site vai ficar em `seu-usuario.github.io/portfolio`).
  *Dica: se o nome for exatamente `seu-usuario.github.io`, o site fica na raiz, sem `/portfolio`.*
- Marque **Public**.
- Clique em **Create repository**.

**3. Subir o seu `index.html`.**
Na página do repositório novo, clique em **uploading an existing file** (ou **Add file → Upload files**).
- Arraste o seu `index.html` pra área de upload.
- Lá embaixo, clique em **Commit changes**.

**4. Ativar o GitHub Pages.**
No repositório, vá em **Settings** (engrenagem) → no menu da esquerda, **Pages**.
- Em **Source**, escolha **Deploy from a branch**.
- Em **Branch**, escolha **main** e a pasta **/ (root)**. Clique em **Save**.

**5. Pegar o link.**
Espere 1 a 2 minutos e atualize a página de **Settings → Pages**. Vai aparecer, no topo:
*"Your site is live at `https://seu-usuario.github.io/portfolio/`"*. Esse é o seu link.

**6. Testar e usar.**
- Abra o link no **celular**. Confira que os botões de WhatsApp abrem a sua conversa.
- **Cole esse link em TODA abordagem** da semana. É a sua prova de capacidade.

---

## Opcional (melhora o Google)

Depois que tiver o link, abra o `index.html`, ache o comentário
`<!-- Depois de publicar, preencha a URL... -->` no topo, troque `SEU-USUARIO.github.io/portfolio` pelo
seu link real e **descomente** as duas linhas (tire o `<!--` e o `-->`). Suba o arquivo de novo
(passo 3). Isso ajuda o site a aparecer melhor nas buscas.

---

## Deu erro? (as 3 mais comuns)

| O que acontece | Por quê | Como resolver |
|---|---|---|
| Página 404 no link | O Pages ainda não terminou de publicar | Espere 2 min e atualize. Confira que o arquivo se chama **`index.html`** (tudo minúsculo) |
| Abre o código em vez do site | O arquivo não é `index.html` ou está numa subpasta | O `index.html` tem que estar na **raiz** do repositório |
| Site desatualizado | Cache do navegador | Atualize com Ctrl+F5, ou abra numa aba anônima |

> Travou? Manda print no grupo. A gente destrava ao vivo.
