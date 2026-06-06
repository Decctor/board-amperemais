# Plano de Implementação — Programa de Parcerias

## Resumo

Este plano descreve o programa de parcerias da plataforma RecompraCRM.

O objetivo é permitir que parceiros indiquem novas organizações por link ou código personalizado, atribuir a organização indicada ao parceiro durante o onboarding, calcular comissões a partir de invoices pagas no Stripe e disponibilizar painéis separados para administração interna e para o parceiro.

Este domínio é diferente do `partners` comercial existente, que é escopado por organização e ligado a vendas/clientes internos. Para evitar colisão conceitual, o novo domínio deve usar nomes técnicos explícitos com prefixo `platformPartner`.

## Decisões Fechadas

- O domínio técnico será separado do `partners` atual.
- A UI pode usar o termo "Parcerias"; o código deve usar `platformPartners`.
- Atribuição por link expira em 30 dias.
- Último clique vence.
- Código manual informado no onboarding tem preferência sobre cookie.
- Código manual inválido bloqueia avanço do onboarding.
- O campo no onboarding será `indicadorCodigo`, separado de `origemLead`.
- Cookie/localStorage servem para pré-preencher `indicadorCodigo` e como fallback backend quando o frontend enviar nulo.
- Apenas invoices pagas geram comissão.
- A base comissionável é o valor bruto do plano SaaS, excluindo consultoria/add-ons.
- Para plano mensal: invoice 1 recebe 100%; invoices seguintes recebem 20%.
- Para plano anual: usar comissão fixa de 27% sobre a base comissionável.
- A equivalência matemática da regra mensal em um ano é 26,67%: `(100% + 11 * 20%) / 12`.
- Cada comissão deve salvar snapshot da invoice e da regra aplicada.
- Reembolso, chargeback ou correção devem gerar ajuste contábil explícito, não alteração silenciosa do lançamento original.
- Payouts serão manuais, mensais, operados pelo financeiro.
- Payout mensal considera comissões `APROVADA` até o último dia do mês anterior, com carência de 30 dias.
- Parceiro criado via onboarding entra como `PENDENTE_APROVACAO`.
- O painel do parceiro terá layout próprio em `/partner-dashboard` e não deve exigir `membership`.
- Parceiro autenticado sem registro aprovado deve passar pelo onboarding de parceiro.
- O parceiro verá estatísticas, organizações indicadas e payouts feitos/a fazer.
- No painel do parceiro, organizações indicadas mostram apenas nome, plano, status, data de entrada e valores. Não mostrar CNPJ, email ou telefone.

## Modelo de Dados

Adicionar enums em `services/drizzle/schema/enums.ts` e `schemas/enums.ts`.

Enums recomendados:

```ts
platformPartnerStatusEnum = [
  "PENDENTE_APROVACAO",
  "ATIVO",
  "SUSPENSO",
  "REJEITADO",
];

platformPartnerReferralStatusEnum = [
  "CAPTURADO",
  "ORGANIZACAO_CRIADA",
  "PAGAMENTO_CONFIRMADO",
  "CANCELADO",
];

platformPartnerCommissionStatusEnum = [
  "PENDENTE",
  "APROVADA",
  "CANCELADA",
  "PAGA",
];

platformPartnerPayoutStatusEnum = [
  "RASCUNHO",
  "APROVADO",
  "PAGO",
  "CANCELADO",
];
```

Criar `services/drizzle/schema/platform-partnerships.ts` e exportar em `services/drizzle/schema/index.ts`.

### `platformPartners`

Representa o parceiro de aquisição da própria plataforma.

Campos recomendados:

- `id`
- `usuarioId`, FK opcional para `users.id`
- `status`
- `codigo`, único global
- `nome`
- `email`
- `telefone`
- `cpfCnpj`
- `chavePix`
- `arquivos`, JSONB com formato `{ cpf?: string; cnpj?: string }`
- `aceiteTermos`
- `dataAceiteTermos`
- `observacoesInternas`
- `dataAprovacao`
- `aprovadoPorId`, FK opcional para `users.id`
- `dataInsercao`
- `dataAtualizacao`

Índices:

- unique `codigo`
- index `usuarioId`
- index `status`
- index `email`
- index `cpfCnpj`

### `platformPartnerReferralEvents`

Opcional, mas recomendado para auditoria de cliques/capturas.

Campos recomendados:

- `id`
- `partnerId`
- `codigoUsado`
- `origemUrl`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `ipHash`
- `userAgentHash`
- `dataInsercao`

Esta tabela não é necessária para comissão, mas ajuda a auditar último clique e tráfego.

### `platformPartnerReferrals`

Representa a atribuição de uma organização ao parceiro.

Campos recomendados:

- `id`
- `partnerId`
- `organizacaoId`, FK para `organizations.id`, único
- `usuarioId`, FK para `users.id`
- `codigoUsado`
- `origem`, enum lógico ou texto: `COOKIE`, `MANUAL`, `BACKEND_COOKIE`
- `status`
- `dataCaptura`
- `dataOnboarding`
- `dataPrimeiroPagamento`
- `metadata`, JSONB para UTM/origem técnica
- `dataInsercao`

Regras:

- uma organização deve ter no máximo um referral ativo.
- `indicadorCodigo` manual válido cria referral com origem `MANUAL`.
- cookie válido usado como fallback cria referral com origem `COOKIE` ou `BACKEND_COOKIE`.

### `platformPartnerCommissions`

Representa um lançamento financeiro de comissão. Não usar campo `tipo`; a regra aplicada deve ser derivável de snapshot, percentual e número da invoice.

Campos recomendados:

- `id`
- `partnerId`
- `referralId`
- `organizacaoId`
- `payoutId`, FK opcional para `platformPartnerPayouts.id`
- `stripeInvoiceId`, único quando não nulo
- `stripeSubscriptionId`
- `stripeCustomerId`
- `numeroInvoiceAssinatura`
- `valorInvoiceBrutoCentavos`
- `valorConsultoriaCentavos`
- `valorBaseComissionavelCentavos`
- `percentualComissaoBps`
- `valorComissaoCentavos`
- `regraVersao`
- `regraSnapshot`, JSONB
- `invoiceSnapshot`, JSONB
- `ajusteOrigemCommissionId`, FK opcional para `platformPartnerCommissions.id`
- `ajusteMotivo`
- `status`
- `dataElegibilidade`
- `dataAprovacao`
- `aprovadoPorId`, FK opcional para `users.id`
- `dataInsercao`

Notas:

- `percentualComissaoBps`: basis points. `10000 = 100%`, `2000 = 20%`, `2700 = 27%`.
- `valorComissaoCentavos` pode ser negativo para ajuste contábil explícito.
- `invoiceSnapshot` deve conter os dados relevantes da invoice Stripe para auditoria: id, customer, subscription, status, currency, totals, line items, discounts, tax, period e metadata.
- `regraSnapshot` deve registrar a regra exata aplicada no momento, por exemplo `{ monthly: { 1: 10000, subsequent: 2000 }, yearly: 2700, excludedPriceIds: [...] }`.
- `numeroInvoiceAssinatura` conta apenas invoices pagas relevantes ao referral/organização.
- Falhas de pagamento não contam.
- Trial sem cobrança não conta.

### `platformPartnerPayouts`

Representa um pagamento manual feito pelo financeiro.

Campos recomendados:

- `id`
- `partnerId`
- `status`
- `competenciaInicio`
- `competenciaFim`
- `valorTotalCentavos`
- `metodo`
- `chavePixSnapshot`
- `comprovanteUrl`
- `dataPrevista`
- `dataPagamento`
- `observacoes`
- `autorId`, FK para `users.id`
- `dataInsercao`
- `dataAtualizacao`

Não criar `platformPartnerPayoutItems` no v1. O vínculo 1:N é feito por `platformPartnerCommissions.payoutId`.

## Regras de Atribuição

### Link do parceiro

Formatos aceitos:

```txt
https://recompracrm.com.br/?ref=CODIGO
https://recompracrm.com.br/r/CODIGO
```

Fluxo recomendado:

1. Usuário acessa link com código.
2. Backend valida se o parceiro existe e está apto para atribuição.
3. Como último clique vence, sobrescrever cookie existente.
4. Criar cookie first-party com 30 dias.
5. Também salvar no localStorage no client para pré-preenchimento.
6. Opcionalmente registrar evento em `platformPartnerReferralEvents`.

Cookie sugerido:

```txt
recompra_partner_indicator=CODIGO
```

### Onboarding da organização

Adicionar `indicadorCodigo?: string | null` ao estado e input de criação da organização.

Regras:

- Campo `indicadorCodigo` fica separado de `origemLead`.
- Cookie/localStorage pré-preenche o campo.
- Se usuário informar manualmente um código, esse valor tem preferência.
- Código manual inválido bloqueia avanço.
- Se frontend enviar nulo, backend pode ler cookie e aplicar fallback.
- Backend sempre revalida o código.
- Ao criar a organização, criar `platformPartnerReferrals`.

## Regras de Comissão

### Base comissionável

Calcular comissão sobre:

```txt
valorBaseComissionavelCentavos = valor bruto pago do plano SaaS - valor consultoria/add-ons
```

Não incluir consultoria.

### Planos mensais

- `numeroInvoiceAssinatura = 1`: `percentualComissaoBps = 10000`.
- `numeroInvoiceAssinatura > 1`: `percentualComissaoBps = 2000`.

### Planos anuais

Usar:

```txt
percentualComissaoBps = 2700
```

Justificativa:

```txt
(100% + 11 * 20%) / 12 = 26,67%
```

27% é a aproximação operacional recomendada.

### Reembolsos, chargebacks e ajustes

Não editar comissão original para apagar histórico.

Criar uma nova linha em `platformPartnerCommissions` com:

- `valorComissaoCentavos` negativo quando aplicável.
- `ajusteOrigemCommissionId` apontando para a comissão original.
- `ajusteMotivo` preenchido.
- `invoiceSnapshot` ou snapshot do evento de reembolso/chargeback.

## Stripe

O webhook atual processa status de assinatura. Para parcerias, adicionar processamento de invoices pagas.

Eventos necessários:

- `invoice.paid` ou `invoice.payment_succeeded`
- manter `customer.subscription.created`
- manter `customer.subscription.updated`
- manter `customer.subscription.deleted`

Fluxo de invoice paga:

1. Validar assinatura do webhook.
2. Garantir idempotência por `stripeInvoiceId`.
3. Localizar organização por `stripeCustomerId` ou metadata.
4. Localizar referral da organização.
5. Se não houver referral, não gerar comissão.
6. Separar line items de plano SaaS e consultoria/add-ons.
7. Calcular `valorBaseComissionavelCentavos`.
8. Calcular `numeroInvoiceAssinatura` considerando apenas invoices pagas já processadas.
9. Definir percentual pela regra vigente.
10. Criar `platformPartnerCommissions` com snapshot completo.

## APIs

Todas as novas rotas devem usar App Router em `/app/api/**/route.ts`, com schema de input, service function, output type, route handler e `appApiHandler`.

### Público/atribuição

- `app/r/[codigo]/route.ts` ou `app/api/platform-partners/track/route.ts`
  - valida código;
  - grava cookie;
  - registra evento opcional;
  - redireciona para landing/onboarding.

- `app/api/platform-partners/validate-code/route.ts`
  - valida `indicadorCodigo`;
  - usado no onboarding para bloquear avanço quando inválido.

### Onboarding de parceiro

- `app/api/platform-partner/onboarding/route.ts`
  - cria ou atualiza cadastro do parceiro autenticado;
  - status inicial `PENDENTE_APROVACAO`;
  - recebe nome, email, telefone, cpf/cnpj, chave Pix, aceite e arquivos.

### Partner dashboard

- `app/api/platform-partner/me/route.ts`
  - retorna dados do parceiro autenticado.

- `app/api/platform-partner/dashboard/route.ts`
  - retorna KPIs, organizações indicadas e resumo financeiro.

- `app/api/platform-partner/payouts/route.ts`
  - lista payouts do parceiro autenticado.

### Admin

- `app/api/admin/platform-partners/route.ts`
  - GET lista/byId;
  - POST cria parceiro manualmente;
  - PUT atualiza/aprova/suspende/rejeita.

- `app/api/admin/platform-partners/referrals/route.ts`
  - lista organizações indicadas com filtros.

- `app/api/admin/platform-partners/commissions/route.ts`
  - lista, aprova, cancela e cria ajustes.

- `app/api/admin/platform-partners/payouts/route.ts`
  - gera payout mensal;
  - marca como pago;
  - cadastra comprovante.

## Frontend

### Admin

Adicionar entrada na `AdminSidebar`.

Rotas:

- `app/(admin)/admin-dashboard/parcerias/page.tsx`
- `app/(admin)/admin-dashboard/parcerias/parcerias-page.tsx`

Views:

- KPIs gerais: parceiros ativos, pendentes, organizações indicadas, comissão aprovada, comissão paga, comissão pendente.
- Lista de parceiros.
- Detalhe do parceiro com abas:
  - cadastro;
  - organizações indicadas;
  - comissões;
  - payouts.
- Ações:
  - aprovar parceiro;
  - rejeitar parceiro;
  - suspender parceiro;
  - aprovar/cancelar comissão;
  - gerar payout mensal;
  - marcar payout como pago;
  - anexar comprovante.

### Partner dashboard

Criar layout próprio:

- `app/partner-dashboard/layout.tsx`
- `app/partner-dashboard/page.tsx`
- `app/partner-dashboard/onboarding/page.tsx`

Regras:

- exige usuário autenticado;
- não exige `membership`;
- se usuário não tiver `platformPartner`, redireciona para onboarding de parceiro;
- se parceiro estiver `PENDENTE_APROVACAO`, mostrar tela de status;
- se parceiro estiver `ATIVO`, mostrar dashboard;
- se parceiro estiver `SUSPENSO` ou `REJEITADO`, mostrar tela de acesso restrito.

Abas do parceiro:

- Estatísticas;
- Organizações indicadas;
- Payouts feitos e a fazer.

Dados permitidos sobre organizações indicadas:

- nome;
- plano;
- status;
- data de entrada;
- valores comissionados.

Dados não exibidos:

- CNPJ;
- email;
- telefone;
- dados internos de operação.

## Auth e Redirect

O fluxo atual redireciona login, magic link e Google para `/dashboard`. Para parceiros, adicionar `redirectTo` seguro.

Regras:

- aceitar `/auth/signin?redirectTo=/partner-dashboard`;
- validar allowlist de paths internos;
- negar URLs externas para evitar open redirect;
- persistir `redirectTo` no fluxo inteiro.

Pontos de alteração:

- `app/auth/signin/page.tsx`
- `app/auth/signin/signin-page.tsx`
- `lib/authentication/actions.ts`
- `app/auth/magic-link/callback/route.ts`
- fluxo de verificação por código de magic link;
- `app/auth/google/route.ts`
- `app/auth/google/callback/route.ts`

Para magic link, persistir `redirectTo` no registro de `authMagicLinks` ou em cookie/state seguro.

Para Google OAuth, persistir `redirectTo` em cookie httpOnly temporário ou codificar no state com validação.

## Zod, Queries, Mutations e State Hooks

Criar:

- `schemas/platform-partnerships.ts`
- enums em `schemas/enums.ts`
- `lib/queries/platform-partnerships.ts`
- `lib/mutations/platform-partnerships.ts`
- `state-hooks/use-platform-partner-onboarding-state.tsx`
- `state-hooks/use-internal-platform-partner-state.tsx`, se houver modal admin de edição/criação.

Mutation files devem ser wrappers Axios simples, sem React Query hooks.

## Ordem de Implementação

1. Criar enums e schema Drizzle `platform-partnerships`.
2. Criar migration SQL.
3. Criar Zod schemas.
4. Implementar captura de código e cookie de 30 dias.
5. Adicionar `indicadorCodigo` ao onboarding da organização.
6. Implementar validação de código no onboarding.
7. Criar referral ao concluir onboarding.
8. Estender webhook Stripe para invoice paga e comissão idempotente.
9. Implementar ajustes contábeis explícitos.
10. Criar APIs admin.
11. Criar APIs do parceiro.
12. Ajustar auth com `redirectTo`.
13. Criar onboarding do parceiro.
14. Criar `partner-dashboard`.
15. Criar painel admin de parcerias.
16. Implementar fluxo manual de payouts mensais.
17. Adicionar testes e queries de verificação.

## Testes e Casos Críticos

Cobrir:

- link válido grava cookie;
- último clique sobrescreve cookie;
- cookie expira em 30 dias;
- código manual válido tem preferência;
- código manual inválido bloqueia onboarding;
- backend usa cookie quando `indicadorCodigo` vier nulo;
- organização sem parceiro não gera comissão;
- invoice paga gera comissão uma única vez;
- webhook repetido não duplica comissão;
- invoice mensal 1 gera 100%;
- invoice mensal 2+ gera 20%;
- invoice anual gera 27%;
- consultoria é excluída da base;
- trial sem cobrança não conta;
- falha de pagamento não conta;
- reembolso/chargeback gera ajuste negativo;
- payout só inclui comissões aprovadas elegíveis;
- parceiro sem cadastro vai para onboarding;
- parceiro pendente não vê dashboard completo;
- parceiro ativo não acessa dados sensíveis da organização.

## Queries de Auditoria Sugeridas

```sql
-- comissões duplicadas por invoice: deve retornar zero linhas
select stripe_invoice_id, count(*)
from ampmais_platform_partner_commissions
where stripe_invoice_id is not null
group by stripe_invoice_id
having count(*) > 1;

-- comissões aprovadas elegíveis para payout
select *
from ampmais_platform_partner_commissions
where status = 'APROVADA'
  and payout_id is null
  and data_elegibilidade <= now();

-- organizações com referral
select
  r.partner_id,
  r.organizacao_id,
  r.codigo_usado,
  r.status,
  r.data_onboarding
from ampmais_platform_partner_referrals r
order by r.data_onboarding desc;

-- ajustes contábeis
select *
from ampmais_platform_partner_commissions
where ajuste_origem_commission_id is not null
order by data_insercao desc;
```
