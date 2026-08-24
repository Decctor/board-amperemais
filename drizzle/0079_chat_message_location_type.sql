-- Localização compartilhada no WhatsApp vira um tipo de conteúdo próprio.
-- Antes caía no ramo default do parser e virava placeholder de texto, perdendo as coordenadas.
-- `ALTER TYPE ... ADD VALUE` não pode ser usado na mesma transação que consome o valor novo.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0079_chat_message_location_type.sql
-- Precisa ser aplicada ANTES do deploy do código que grava 'LOCALIZACAO'.
-- Idempotente (IF NOT EXISTS).

ALTER TYPE chat_message_content_type ADD VALUE IF NOT EXISTS 'LOCALIZACAO';
