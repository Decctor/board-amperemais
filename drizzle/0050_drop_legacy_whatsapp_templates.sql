-- Remove o domínio legado de `whatsapp_templates`, substituído por `message_templates`.
--
-- Os registros já foram migrados para `ampmais_message_templates`; o código que lia essas
-- tabelas (rotas `/api/whatsapp-templates`, modais `WhatsappTemplates`, adapters de conversão)
-- foi removido no mesmo conjunto de commits.
--
-- A ordem importa: `whatsapp_template_phones` referencia `whatsapp_templates` e
-- `whatsapp_connection_phones`, então ela cai primeiro. Os enums só podem ser removidos
-- depois que nenhuma coluna os utiliza.

DROP TABLE IF EXISTS "ampmais_whatsapp_template_phones";
DROP TABLE IF EXISTS "ampmais_whatsapp_templates";

DROP TYPE IF EXISTS "whatsapp_template_status";
DROP TYPE IF EXISTS "whatsapp_template_quality";
DROP TYPE IF EXISTS "whatsapp_template_category";
DROP TYPE IF EXISTS "whatsapp_template_parameters_type";
