export {
  LIMITES_DIARIOS,
  LABEL_OPERACAO,
  OPERACOES_COTA,
  type OperacaoCota,
  type VisaoUso,
} from "./tipos";
export { QuotaExcedidaError } from "./erros";
export {
  consumirCota,
  listarUsoDiario,
  obterUsoDiario,
  verificarCota,
} from "./servico";
