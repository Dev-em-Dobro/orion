export type { AcaoTmb, TmbVendaPayload } from "./tipos";
export { TMB_CODE_MENTORIA_PRO, TMB_ELITE_CODES_DEFAULT } from "./tipos";
export {
  interpretarVendaTmb,
  extrairVenda,
  codesPermitidos,
  productIdsAcessoCompra,
} from "./interpretar";
export { processarWebhookTmb } from "./repositorio";
