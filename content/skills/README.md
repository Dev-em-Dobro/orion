# Skills (F030)

Cada skill e uma pasta aqui: `content/skills/<slug>/`, com um `SKILL.md` na
raiz dela e os arquivos auxiliares que quiser.

Para publicar uma skill:

1. Criar a pasta com o conteudo.
2. Ajustar a entrada em `src/lib/skills/catalogo.ts` com `disponivel: true`.

Nenhuma rota ou componente precisa mudar - o menu, a pagina de detalhe e o
`.zip` saem do catalogo.

Spec: `/specs/02-features/F030-menu-skills.md`
