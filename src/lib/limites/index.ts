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
  estornarCota,
  listarUsoDiario,
  obterUsoDiario,
  reservarCota,
  verificarCota,
} from "./servico";
