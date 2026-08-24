-- Figurinhas do WhatsApp viram um tipo de conteúdo próprio.
-- Antes elas caíam no ramo default do parser (placeholder de texto) na Meta Cloud API
-- e eram achatadas em IMAGEM no Gateway Interno — os dois caminhos discordavam.
-- `ALTER TYPE ... ADD VALUE` não pode ser usado na mesma transação que consome o valor novo.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0078_chat_message_sticker_type.sql
-- Precisa ser aplicada ANTES do deploy do código que grava 'FIGURINHA'.
-- Idempotente (IF NOT EXISTS).

ALTER TYPE chat_message_content_type ADD VALUE IF NOT EXISTS 'FIGURINHA';
