/**
 * Opção pseudo-integração dos filtros de dados: vendas sem `integracaoId` (POS, loja, venda
 * manual, comandas, importação de planilha). Sentinela fora do espaço de UUIDs — apenas
 * `getSalesIntegrationCondition` a interpreta; nunca chega ao SQL como id real.
 */
export const INTERNAL_SALES_INTEGRATION_ID = "INTERNAL";
export const INTERNAL_SALES_LABEL = "Vendas internas";
