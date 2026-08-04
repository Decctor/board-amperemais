-- Valores de enum da fundação financeira.
--
-- Esta etapa precisa ser aplicada separadamente da migration de configuração:
-- o PostgreSQL só permite usar um novo valor de enum depois do commit que o
-- criou. O script apply-sql-migration.ts envolve cada arquivo em uma transação.

ALTER TYPE "financial_account_type" ADD VALUE IF NOT EXISTS 'CARTAO_CREDITO';
ALTER TYPE "financial_account_type" ADD VALUE IF NOT EXISTS 'INVESTIMENTO';
ALTER TYPE "financial_account_type" ADD VALUE IF NOT EXISTS 'OUTRO';
ALTER TYPE "bank_account_type" ADD VALUE IF NOT EXISTS 'PAGAMENTO';
ALTER TYPE "accounting_entry_origin_type" ADD VALUE IF NOT EXISTS 'RECORRENCIA';
