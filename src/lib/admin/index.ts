// F043 — painel admin (grant + alunos + trial).

export { emailsAdminPermitidos, emailEhAdminPermitido } from "./env";
export { requireAdmin, usuarioEhAdmin } from "./require-admin";
export { productIdGrantAcesso } from "./product-acesso";
export {
  grantAcessoAdmin,
  grantAcessoBulkAdmin,
  revokeAcessoAdmin,
  grantTrialAdmin,
  revokeTrialAdmin,
  estenderTrialAdmin,
  parseEmailsBulk,
  type GrantAcessoResult,
} from "./grant";
export {
  listAlunosAdmin,
  listAllowlistRecente,
  type AlunoAdminRow,
  type FiltroAlunosAdmin,
} from "./alunos";
