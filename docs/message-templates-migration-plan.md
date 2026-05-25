# Migração de WhatsApp Templates para Message Templates

## Objetivo

Migrar o produto de `whatsapp_templates` para `message_templates`, mantendo compatibilidade semântica com campanhas existentes e abrindo suporte nativo a dois canais: WhatsApp e e-mail.

O novo modelo deve ser a fonte principal para criação, edição, validação, seleção e envio de templates. O modelo legado de WhatsApp deve deixar de ser dependência do fluxo de produto, especialmente em campanhas, crons, AI hints, agente de marketing e pipeline de disparo.

## Decisões de Arquitetura

1. A coluna de campanha continuará se chamando `whatsappTemplateId`.
   - O nome da coluna será preservado para reduzir o tamanho da migração e evitar churn amplo.
   - O relacionamento Drizzle/Zod/API deve passar a apontar para `messageTemplates`.
   - A migração de dados será feita manualmente depois, com a premissa de que os registros migrados em `message_templates` terão o mesmo `id` dos registros antigos em `whatsapp_templates`.

2. `/lib/whatsapp/templates` deve sair do pipeline de campanhas.
   - A montagem de payload WhatsApp deve usar `lib/message-templates/channels/whatsapp/send-payload.ts`.
   - As variáveis devem ser resolvidas pelo catálogo universal de `message-templates`, mesmo que ele ainda derive das variáveis antigas de WhatsApp.

3. Campanhas devem tentar enviar para os dois canais por padrão.
   - Se o cliente tiver telefone válido, tentar WhatsApp.
   - Se o cliente tiver e-mail válido, tentar e-mail.
   - Se faltar telefone, não enviar WhatsApp.
   - Se faltar e-mail, não enviar e-mail.
   - O resultado da interação deve conseguir refletir sucesso parcial, falha parcial e ausência de canal disponível.

4. Os modais novos de template são o destino da UI.
   - Usar `components/Modals/MessageTemplates/NewMessageTemplate.tsx`.
   - Usar `components/Modals/MessageTemplates/ControlMessageTemplate.tsx`.
   - Remover o uso operacional de `components/Modals/WhatsappTemplates/*` nas telas de campanha e comunicação.

5. A migração de dados entre tabelas não faz parte desta etapa.
   - O código deve assumir que os IDs serão preservados.
   - Não criar uma migração automática definitiva agora.

## Escopo por Área

### 1. Schema e Relacionamentos

Arquivos principais:

- `services/drizzle/schema/campaigns.ts`
- `schemas/campaigns.ts`
- `state-hooks/use-campaign-state.tsx`
- `services/drizzle/schema/chats.ts`
- `schemas/chats.ts`
- `schemas/interactions.ts`

Ajustes:

- Trocar o FK de `campaigns.whatsappTemplateId` para `messageTemplates.id`, mantendo o nome da coluna `whatsapp_template_id`.
- Renomear a relation Drizzle, se fizer sentido, de `whatsappTemplate` para algo semanticamente mais claro, como `messageTemplate`.
  - Se renomear a relation for muito grande, manter `whatsappTemplate` temporariamente, mas tipando contra `messageTemplates`.
  - Preferência final: `campaign.messageTemplate`.
- Atualizar schemas Zod e mensagens de erro para falar em "template de mensagem" ou "template" em vez de "template do WhatsApp", exceto quando a validação for especificamente do canal WhatsApp.
- Avaliar `chatMessages.whatsappTemplateId`.
  - Se a coluna continuar registrando apenas o template usado em envio ativo de WhatsApp, pode manter o nome.
  - Se passar a representar o template universal usado para qualquer canal, apontar para `messageTemplates`.

### 2. Pipeline de Envio

Arquivos principais:

- `lib/interactions/types.ts`
- `lib/interactions/send-reserved-interaction.ts`
- `lib/interactions/process-single-interaction.ts`
- `lib/message-templates/channels/whatsapp/send-payload.ts`
- `services/resend/templates/MessageTemplate.tsx`
- `app/api/message-templates/test/route.ts`

Ajustes:

- Trocar `campaign.whatsappTemplate: TWhatsappTemplate` por template universal (`TMessageTemplate` ou shape equivalente).
- Remover `getWhatsappTemplatePayload` de `lib/whatsapp/templates`.
- Montar runtime context universal:
  - `origin`
  - `organizacaoId`
  - `clienteId`
  - `interactionId`
  - `variaveis`
  - `cabecalhoMidiaUrl` quando houver header dinâmico
- Para WhatsApp:
  - Usar `buildWhatsappTemplateSendPayload`.
  - Usar `sendTemplateWhatsappMessage` para Meta Cloud API.
  - Usar conversão adequada para Internal Gateway. Se o gateway ainda depender do formato antigo, criar adaptador do payload universal para conteúdo do gateway.
- Para e-mail:
  - Usar o template React `services/resend/templates/MessageTemplate.tsx`.
  - Resolver assunto e preheader com `replaceMessageTemplateVariables`.
  - Definir remetente e origem conforme padrão já usado no teste.
- Atualizar persistência em `interactions.metadados` para guardar dados por canal, por exemplo:
  - `messageTemplateId`
  - `whatsappMessageId`
  - `emailMessageId`
  - `whatsappStatus`
  - `emailStatus`
  - `channelsAttempted`
  - `channelsSkipped`
  - `channelErrors`
- Definir regra de status agregado:
  - Se pelo menos um canal foi enviado/enfileirado, a interação pode ficar `ENVIADO` ou `PENDENTE`.
  - Se nenhum canal foi possível por falta de contato, marcar como `BLOQUEADA` ou `FALHOU` com motivo claro.
  - Se todos os canais tentados falharem, marcar `FALHOU`.

### 3. Crons e Processadores

Arquivos/padrões a revisar:

- `app/api/cron/process-interactions/route.ts`
- `app/api/cron/process-recurrent-campaigns/route.ts`
- `app/api/cron/process-single-use-campaigns/route.ts`
- `app/api/cron/birthday-notify/route.ts`
- `app/api/cron/cashback-expiring-notify/route.ts`
- `app/api/cron/rfm-analysis/route.ts`
- `app/api/cron/worst-sales-day-notify/route.ts`
- `app/api/sales/route.ts`
- `app/api/segmentations/sync/route.ts`
- `app/api/point-of-interaction/new-transaction/route.ts`

Ajustes:

- Substituir `with: { whatsappTemplate: true }` pelo relacionamento novo.
- Atualizar checagens como `campaign.whatsappTemplate && campaign.whatsappConexaoTelefone`.
- Separar requisito por canal:
  - WhatsApp requer `messageTemplate`, `whatsappConexaoTelefoneId`, telefone do cliente e credencial/conexão válida.
  - E-mail requer `messageTemplate` e e-mail do cliente.
- Continuar respeitando limites semanais de campanhas para mensagens. Definir se o limite conta:
  - por interação,
  - por tentativa de canal,
  - ou apenas por WhatsApp.
- Atualizar logs de debug que hoje falam em `HAS_WHATSAPP_TEMPLATE`.

### 4. UI de Campanhas e Comunicação

Arquivos principais:

- `components/Modals/Campaigns/Blocks/Action.tsx`
- `app/dashboard/commercial/campaigns/builder/_components/stages/stage-send.tsx`
- `app/dashboard/commercial/campaigns/builder/_components/stages/stage-review.tsx`
- `app/dashboard/commercial/campaigns/builder/_helpers/validation.ts`
- `app/dashboard/communication/_components/communication-templates-page.tsx`
- `app/dashboard/communication/builder/_components/message-template-builder.tsx`
- `components/Settings/SettingsWhatsappTemplates.tsx`
- `app/dashboard/settings/settings-page.tsx`

Ajustes:

- Em campanhas, trocar `useWhatsappTemplates` por `useMessageTemplates`.
- Trocar `NewWhatsappTemplate` por `NewMessageTemplate`.
- Trocar `ControlWhatsappTemplate` por `ControlMessageTemplate`.
- Atualizar labels:
  - "Template do WhatsApp" -> "Template de mensagem".
  - A seção de ação deve indicar que o template será usado em WhatsApp e e-mail.
  - O telefone continua sendo remetente WhatsApp, mas não deve bloquear seleção do template se a campanha também puder enviar e-mail.
- Ajustar filtros de template:
  - Filtrar por compatibilidade de variáveis usando `messageTemplate.conteudo.corpo.parametros`.
  - Para WhatsApp, opcionalmente filtrar/indicar status de aprovação por telefone quando houver `whatsappConexaoTelefoneId`.
- Corrigir detalhes da tela de comunicação:
  - Remover dependência de `TemplatePhoneHoverItem` e `ViewWhatsappTemplatePhone` antigos ou criar equivalentes para `messageTemplates.metadados.porNumeroTelefone`.
  - Implementar ações reais de adicionar/sincronizar/remover telefone do template via `/api/message-templates/phones`.
  - O `onAdd` não deve ficar apenas com `console.log`.
- Corrigir import quebrado:
  - `@/lib/message-templates/button-presets` deve apontar para o caminho real, atualmente `@/lib/message-templates/buttons/presets`, ou deve existir um barrel compatível.

### 5. APIs de Campanha e Validações

Arquivos principais:

- `app/api/campaigns/route.ts`
- `lib/campaigns/validation.ts`
- `app/api/campaigns/test/route.ts`
- `app/api/campaigns/interactions/route.ts`

Ajustes:

- `validateCampaignTemplateTriggerCompatibility` deve buscar em `db.query.messageTemplates`.
- Validar variáveis com `template.conteudo.corpo.parametros`.
- Atualizar mensagens de erro para "template selecionado" ou "template de mensagem".
- `GET /api/campaigns` deve incluir dados do `messageTemplate`.
- `POST/PUT /api/campaigns` devem aceitar o mesmo campo `whatsappTemplateId`, mas persistindo ID de `message_templates`.
- `campaigns/test` deve testar o comportamento novo:
  - tenta WhatsApp se houver telefone;
  - tenta e-mail se houver e-mail;
  - retorna resultado por canal.

### 6. AI Hints e Agente de Marketing

Arquivos principais:

- `lib/ai-hints/approval.ts`
- `schemas/ai-hints.ts`
- `lib/ai-agent/marketing/tools.ts`
- `lib/ai-agent/marketing/context.ts`
- `lib/ai-agent/marketing/suggestions.ts`
- `lib/ai-agent/marketing/schemas.ts`
- `lib/ai-agent/marketing/template-text.ts`
- `lib/ai-agent/marketing/template-variables.ts`
- `lib/ai-agent/marketing/prompts.ts`

Ajustes:

- Trocar criação de `whatsappTemplates` por criação de `messageTemplates`.
- Submeter para WhatsApp via APIs/helpers novos de `message-templates`.
- Atualizar schemas e prompts:
  - `whatsappTemplateText` pode virar `messageTemplateText` ou `templateBodyText`.
  - Se a API externa do agente continuar usando `whatsappTemplateText`, documentar como alias temporário.
- Atualizar extração de texto:
  - De `componentes.corpo.conteudo` para `conteudo.corpo.conteudo`.
- Atualizar validação de variáveis para `MessageTemplateNativeVariables`.
- Quando AI hints aprovarem criação/alteração de campanha, usar `whatsappTemplateId` como campo de campanha, mas preenchido com ID de `message_templates`.

### 7. Onboarding e Defaults

Arquivos principais:

- `config/onboarding.tsx`

Ajustes:

- Renomear semanticamente defaults:
  - `RecompraCRMDefaultWhatsappTemplates` -> `RecompraCRMDefaultMessageTemplates`.
- Converter estrutura dos defaults para `MessageTemplateContentSchema`.
- Manter IDs iguais aos templates legados quando necessário para compatibilidade com a migração manual.
- Atualizar campanhas padrão para usar IDs dos templates universais.
- Atualizar textos para refletir canal duplo quando fizer sentido.

### 8. Mutations e Queries

Arquivos principais:

- `lib/mutations/message-templates.ts`
- `lib/queries/message-templates.ts`
- `app/api/message-templates/route.ts`
- `app/api/message-templates/sync/route.ts`
- `app/api/message-templates/phones/route.ts`

Ajustes:

- Adicionar mutations faltantes:
  - `deleteMessageTemplate`
  - `syncMessageTemplates`
  - `createMessageTemplatePhone`
  - `syncMessageTemplatePhone`
  - `deleteMessageTemplatePhone`
- Garantir wrappers finos em Axios, sem React Query no arquivo de mutations.
- Expor/usar query keys nas telas que invalidam templates.
- Avaliar se `useMessageTemplates` precisa suportar:
  - filtro por telefone WhatsApp;
  - filtro por status geral;
  - filtro por status `ATIVO`;
  - inclusão/exclusão de templates globais/default.

### 9. Webhooks e Sincronização WhatsApp

Arquivos principais:

- `app/api/integrations/whatsapp/route.ts`
- `app/api/integrations/whatsapp/auth/callback/route.ts`
- `app/api/integrations/whatsapp/gateway/route.ts`
- `app/api/message-templates/sync/route.ts`

Ajustes:

- Webhook já atualiza `messageTemplates.metadados`; manter isso como caminho principal.
- Remover atualização obrigatória das tabelas legadas quando o corte for concluído.
- `auth/callback` não deve chamar `syncWhatsappTemplates` legado; deve chamar sync novo de `message-templates`.
- Gateway interno que hoje cria vínculos em `whatsappTemplatePhones` precisa ser revisto para `messageTemplates.metadados.porNumeroTelefone` ou um fluxo novo equivalente.

### 10. Remoção de Dependências Legadas

Dependências a remover ou isolar depois do corte:

- `schemas/whatsapp-templates.ts`
- `state-hooks/use-whatsapp-template-state.ts`
- `lib/queries/whatsapp-templates.ts`
- `lib/mutations/whatsapp-templates.ts`
- `lib/whatsapp/templates.ts`
- `lib/whatsapp/template-management.ts`
- `components/Modals/WhatsappTemplates/*`
- `components/Settings/SettingsWhatsappTemplates.tsx`
- `app/api/whatsapp-templates/**`

Pode ser necessário manter temporariamente:

- parsing de webhooks em `lib/whatsapp/parsing.ts`;
- envio básico do WhatsApp em `lib/whatsapp/index.ts`;
- utilitários de telefone/formatação;
- upload de mídia para Meta.

## Checklist de Implementação

- [ ] Ajustar Drizzle `campaigns.whatsappTemplateId` para referenciar `messageTemplates`.
- [ ] Atualizar relations e queries de campanhas para carregar template universal.
- [ ] Atualizar `CampaignSchema` e state hook mantendo o campo `whatsappTemplateId`.
- [ ] Migrar validação de compatibilidade de variáveis para `messageTemplates`.
- [ ] Trocar `sendReservedInteraction` para payload universal de WhatsApp.
- [ ] Adicionar envio de e-mail no pipeline de interação.
- [ ] Modelar metadados de envio por canal.
- [ ] Atualizar `processSingleInteractionImmediately` e tipos relacionados.
- [ ] Atualizar todos os crons/processadores que passam `campaign.whatsappTemplate`.
- [ ] Atualizar teste de campanha para canal duplo.
- [ ] Trocar UIs de campanha para `NewMessageTemplate` e `ControlMessageTemplate`.
- [ ] Corrigir tela `/dashboard/communication` para usar detalhes e mutations novos de telefone.
- [ ] Adicionar mutations faltantes em `lib/mutations/message-templates.ts`.
- [ ] Corrigir import de `button-presets`.
- [ ] Migrar AI hints para criar/atualizar `messageTemplates`.
- [ ] Migrar agente de marketing para ler/escrever `messageTemplates`.
- [ ] Atualizar defaults/onboarding para `RecompraCRMDefaultMessageTemplates`.
- [ ] Trocar sync no callback de conexão WhatsApp para fluxo novo.
- [ ] Remover ou isolar rotas e componentes legados de WhatsApp templates.

## Riscos e Pontos de Atenção

- O nome `whatsappTemplateId` continuará existindo, mas passará a apontar para `message_templates`. Isso precisa ficar claro em comentários ou tipos para evitar regressões.
- Envio em dois canais muda semântica de status. Antes uma interação era praticamente um envio WhatsApp; agora ela representa uma tentativa multicanal.
- Limites semanais de campanhas precisam de definição explícita para não dobrar contagem ao enviar WhatsApp e e-mail.
- O Internal Gateway pode exigir adaptação própria se ele ainda depende do payload antigo montado por `/lib/whatsapp/templates`.
- Templates com cabeçalho dinâmico dependem de renderer backend antes da submissão Meta em alguns fluxos.
- `messageTemplates.metadados.porNumeroTelefone` substitui `whatsappTemplatePhones` como estado principal, então telas de detalhe por telefone precisam ser revistas com cuidado.

## Fora do Escopo desta Etapa

- Executar a migração definitiva de dados entre `whatsapp_templates` e `message_templates`.
- Decidir remoção física das tabelas legadas.
- Refatorar nomes de coluna no banco para `message_template_id`.
- Criar tracking analítico avançado por canal além do necessário para status operacional.
