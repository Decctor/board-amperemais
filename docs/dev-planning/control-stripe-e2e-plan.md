# Plano — Lado RecompraCRM da integração Stripe end-to-end com o Control

> Contexto: o Control vai passar a ingerir eventos da conta Stripe do RecompraCRM (integração
> Stripe por parceiro) e computar automaticamente vendas/assinaturas no CRM, identificando
> cliente, oportunidade e perfil de rastreamento. O plano completo (arquitetura, fases, novas
> tabelas) vive no repo `syncroniza-control` em `exploration/stripe_e2e_saas_integration_plan.md`.
> Este documento cobre apenas o que muda **aqui**.

## O que já está pronto (não mexer)

- O checkout (`app/api/integrations/stripe/generate-checkout/route.ts`) já grava
  `organizationId` em `subscription_data.metadata` e no metadata do customer criado.
- O Control.js já é carregado nas páginas de marketing e o identify já envia
  `email`, `phone`, `organizacaoId`, `organizacaoNome`
  (`components/Marketing/MarketingTrackingScriptClient.tsx`). Hoje o Control descarta os campos
  de organização — a persistência deles é trabalho do lado Control (Fase 1 de lá).
- O webhook próprio (`app/api/integrations/stripe/webhook/route.ts`) segue intocado: o Control
  escuta a mesma conta Stripe por um endpoint webhook adicional, em paralelo.

## Mudanças propostas

### 1. Convenção de metadata `ctrl_*` no checkout (deterministic match)

O Stripe só expõe nome/e-mail do customer; o metadata é o canal para o Control identificar o
registro sem heurística. Adicionar ao `generate-checkout`:

```ts
const controlMetadata = {
	ctrl_organizacao_id: userOrgId,
	ctrl_organizacao_nome: organization.nome,
	ctrl_email: session.user.email ?? organization.email ?? "",
	ctrl_phone: session.user.telefone ?? organization.telefone ?? "",
};
```

Aplicar em **três** lugares (o Control lê do que estiver disponível no evento):

1. `subscription_data.metadata` — já tem `organizationId`; acrescentar as chaves `ctrl_*`
   (manter `organizationId` para o webhook interno).
2. `metadata` da própria `checkout.session` (hoje ausente) — necessário para
   `checkout.session.completed`.
3. `stripe.customers.create({ metadata })` — acrescentar `ctrl_*` além do `organizationId`
   atual; para customers já existentes, um `stripe.customers.update` oportunista no momento do
   checkout garante que contas antigas também fiquem identificáveis.

### 2. Backfill de metadata em customers antigos (opcional, script)

Script one-off (`scripts/`) que percorre `organizations` com `stripeCustomerId` preenchido e faz
`customers.update` com o metadata `ctrl_*`. Elimina a dependência de matching por IA para toda a
base histórica — o backfill do Control passa a ser 100% determinístico.

### 3. Identify no fluxo de signup/onboarding

Garantir que o identify com `organizacaoId` dispare também no momento em que a organização é
criada (não só em pageviews de marketing com usuário logado), para que o perfil de tracking do
comprador já esteja vinculado à organização antes do primeiro checkout. Verificar cobertura atual
do `MarketingTrackingScriptClient` no funil de cadastro e completar onde faltar.

## Fora de escopo aqui

- Ingestão de webhook, staging de eventos, matching por IA, fila de revisão, mapeamento
  price → plano, criação de venda/assinatura/oportunidade — tudo no Control.

## Sequência sugerida

1. Item 1 (metadata `ctrl_*`) — pequeno, sem risco, destrava a Fase 1 do Control.
2. Item 3 (identify no signup) — junto ou logo após.
3. Item 2 (backfill) — quando o pipeline do Control estiver ingerindo (Fase 1 concluída lá).
