-- Problemas estruturados dos documentos fiscais de saída.
--
-- Cada falha de emissão (prontidão, validação tributária, provedor ou SEFAZ) passa a ser
-- gravada como JSON de `TFiscalProblem[]` (`lib/fiscal/problems.ts`): código, origem,
-- alvo (produto, cliente, configuração, documento) e ação sugerida. É o que a UI transforma
-- em CTA — "configurar perfil fiscal do produto X", "reenviar", "cancelar até HH:MM".
--
-- `mensagens` continua guardando o texto bruto do provedor. Documentos antigos não precisam
-- de backfill: quando `problemas` é nulo, a leitura deriva os problemas de `mensagens` e
-- `codigo_rejeicao` (`resolveFiscalDocumentProblems`).
--
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0098_fiscal_document_problems.sql
-- Idempotente (IF NOT EXISTS).

ALTER TABLE "ampmais_fiscal_outbound_documents"
	ADD COLUMN IF NOT EXISTS "problemas" text;

COMMENT ON COLUMN "ampmais_fiscal_outbound_documents"."problemas" IS
	'JSON de TFiscalProblem[] da última falha (código, alvo, ação sugerida). mensagens guarda o texto bruto.';
