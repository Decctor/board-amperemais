# Limites de Desconto no PDV + Primitivo de Aprovação de Ações — plano

Data: 2026-07-09
Status: **Planejamento alinhado** (decisões de escopo fechadas; implementação não iniciada)

## O problema em uma frase

Na maioria dos negócios atendidos, o dono não libera desconto irrestrito ao atendente: cada operador tem um teto (X% ou R$ X) e descontos acima disso exigem aprovação de um gestor — e hoje o PDV não valida desconto de forma alguma, nem por permissão, nem por segurança.

## Decisões de escopo (alinhadas)

| Dimensão | Decisão | Implicação |
|---|---|---|
| Forma do limite | **`limiteTipo: FIXO \| PERCENTUAL` + `limiteValor`** (mesmo par do cashback `resgateLimiteTipo`/`resgateLimiteValor`) | Um único teto por membro, no formato já familiar da casa. Sem combinação % + R$ simultânea. |
| Base do percentual | **Desconto agregado da venda sobre o bruto dos itens** (`Σ valorVendaTotalBruto`) | Simples de explicar ao dono e impossível de burlar fatiando o desconto entre itens. |
| Cupom `MANUAL` | **Entra no cômputo do desconto agregado** | Hoje o cupom manual é um desconto livre com outro nome — seria a rota de fuga óbvia. Cashback e cupom `AUTOMATICA` ficam fora (têm regras próprias validadas pelo motor). |
| Retrocompatibilidade | **`descontos` ausente no jsonb de permissões = liberado** (padrão `integracoes`) | Nenhuma organização existente trava no deploy; o dono ativa a restrição quando configurar. |
| Aprovação síncrona no PDV | **PIN curto = `senhaOperador` do vendedor vinculado ao usuário aprovador** | UX de supermercado. Sem campo novo de senha; a permissão de aprovar continua morando na membership. |
| Identidade avaliada | **O vendedor da venda** (`sale.vendedorId` → membership via `usuarioVendedorId`) | Suporta terminal compartilhado e uso individual com o mesmo mecanismo. |
| Expiração da aprovação | **15 minutos (default fixo por ora)** | Configurável por organização fica para depois, se houver demanda. |
| Entidade de aprovação | **Primitivo genérico `action_approval_requests`**, não "discount-approval-requests" | Desconto é o primeiro caso; cancelamento de venda, compra acima de limite etc. entram sem migração via payload jsonb discriminado por `tipo`. |
| Auditoria | **A própria linha da solicitação é o registro** (padrão inline `ai-hints`/`poiTransactionRequests`) | Inclusive no fluxo por PIN a solicitação é criada e decidida no mesmo request — mas fica registrada. Tabela de eventos multi-etapa fica para extensão futura. |

---

## 1. O que já existe e é reaproveitado

- **`poiTransactionRequests`** (`services/drizzle/schema/poi-transaction-requests.ts`) — o "quase-primitivo": payload jsonb, status `PENDENTE/APROVADO/REJEITADO/ERRO`, aprovador, timestamps de decisão, motivo de rejeição. É o molde estrutural da nova entidade (e candidata a migrar para ela no futuro).
- **`usePoiTransactionRequestsRealtime`** (`lib/hooks/use-supabase-realtime.ts:219`) + `TransactionRequestsQueue.tsx` — padrão pronto de fila de pendências com Supabase Realtime filtrado por `organizacao_id` + invalidação de query. Clonar para a nova entidade.
- **`OrganizationMemberPermissionsSchema`** (`schemas/organizations.ts:376`) — permissões jsonb por membro, com precedente de chave opcional retrocompatível (`integracoes`) e de fallback para `empresa.editar`.
- **`resolveSaleFiscalEmissionOverride`** (`lib/sales/sale-fiscal-emission-override.ts`) — precedente de trava permissionada por venda extraída em helper; o helper de autorização de desconto espelha esse desenho.
- **`ai-hints`** (`services/drizzle/schema/ai-hints.ts`) — padrão de jsonb com discriminated union + coluna `tipo` varchar denormalizada para filtro, e tracking de aprovação/descarte inline na própria linha.
- **Par `resgateLimiteTipo`/`resgateLimiteValor`** do cashback — formato do limite reutilizado nas permissões de desconto.
- **`sellers.senhaOperador`** — mecanismo do PIN de aprovação síncrona.
- **`statusVenda: "ORCAMENTO"`** — permite estacionar a venda enquanto uma aprovação assíncrona está pendente.

## 2. Fase 0 — Hardening do cálculo de venda (pré-requisito)

Hoje `app/api/pos/sales/create-and-confirm/route.ts:121-136` confia cegamente no cliente: `descontosTotal`, `item.valorDesconto` e — pior — `item.valorTotalLiquido` chegam prontos e não são recalculados. **Qualquer teto de desconto é teatro enquanto o cliente puder enviar líquidos arbitrários.**

- Recalcular server-side `valorVendaTotalBruto` e `valorTotalLiquido` de cada item a partir do preço da variante + modificadores × quantidade, tratando o `valorDesconto` do cliente como *pedido a validar*, não como fato.
- Rejeitar com `BadRequest` se os números divergirem do recálculo (tolerância de centavos para arredondamento).
- Aplicar o mesmo nas rotas de rascunho/confirmação de orçamento (um orçamento com desconto pode ser confirmado depois).

Mudança pequena, independente e que deve sair primeiro.

## 3. Fase 1 — Permissões de desconto

### 3.1 Schema (extensão do bloco `vendas`)

```ts
// schemas/organizations.ts — dentro de OrganizationMemberPermissionsSchema.vendas
descontos: z
	.object({
		aplicar: z.boolean({ ... }),                        // pode aplicar desconto autonomamente
		limiteTipo: DiscountLimitTypeEnum.nullable(),       // "FIXO" | "PERCENTUAL" | null (null = sem teto)
		limiteValor: z.number({ ... }).nullable(),
		aprovar: z.boolean({ ... }),                        // pode aprovar solicitações de terceiros
	})
	.optional()
	.nullable(),
// ausente/null ⇒ comportamento legado: desconto liberado, aprovar = fallback empresa.editar
```

Semântica:

- `aplicar: false` ⇒ teto efetivo zero — qualquer desconto exige aprovação.
- `aplicar: true` + `limiteTipo: null` ⇒ liberado sem teto (o dono).
- `limiteTipo: "PERCENTUAL"` ⇒ teto = `valorBase × limiteValor / 100`; `"FIXO"` ⇒ teto = `limiteValor`.
- `aprovar` é independente de `aplicar` — um gestor pode aprovar acima do que aplicaria no próprio caixa. (Extensão futura: teto do aprovador `aprovarLimite*`; por ora, `aprovar: true` aprova qualquer valor.)

O enum `DiscountLimitTypeEnum` (`FIXO | PERCENTUAL`) vai em `schemas/enums.ts` — verificar se o enum do cashback já é reutilizável antes de criar um novo.

### 3.2 Helper central (usado idêntico no client e no server)

```ts
// lib/permissions/discounts.ts — funções puras
resolveDiscountAuthority(permissoes: TOrganizationMemberPermissions | null)
	// → { aplicar, limiteTipo, limiteValor, aprovar } já com semântica de ausência resolvida

evaluateDiscount({ authority, valorBase, descontoTotal })
	// → "PERMITIDO" | "REQUER_APROVACAO"
```

Começa aqui o padrão de helper de permissão (hoje os checks são inline e duplicados nas rotas; o único precedente é `canManageIntegrations`).

### 3.3 Cômputo do "desconto agregado" (a grandeza que o teto limita)

```
valorBase      = Σ item.valorVendaTotalBruto
descontoTotal  = descontosGerais ("Outros descontos")
               + Σ item.valorDesconto
               + cupomResgate.valorDesconto  (SOMENTE se validacaoModo === "MANUAL")
```

Fora do cômputo: cashback (limites próprios por programa) e cupom `AUTOMATICA` (motor revalida no servidor).

### 3.4 UI

- Nova seção "Descontos" em `components/Modals/Users/Blocks/Permissions.tsx`, visível somente com `organizationHasERPAccess`; réplica no bloco de convites (`OrganizationsMembershipInvitations/Blocks/Permissions.tsx`).
- Defaults em `state-hooks/use-user-state.tsx` e `use-organization-membership-invitation-state.tsx` (sugestão de default para membro novo: `aplicar: true`, sem teto — igual ao legado; o dono restringe a partir daí).

## 4. Fase 2 — Primitivo `action_approval_requests`

### 4.1 Tabela

```ts
// services/drizzle/schema/action-approvals.ts → ampmais_action_approval_requests
{
	id,                                            // uuid padrão da casa
	organizacaoId,                                 // FK cascade + índice (tenancy padrão)

	// classificação
	tipo: varchar("tipo", { length: 100 }).notNull(),   // "VENDA_DESCONTO" | futuros
	status: actionApprovalStatusEnum("status").notNull().default("PENDENTE"),

	// conteúdo
	payload: jsonb("payload").$type<TActionApprovalPayload>().notNull(), // union discriminada por `tipo`
	resumo: jsonb("resumo").$type<TActionApprovalSummary>().notNull(),   // denormalizado p/ card da fila

	// atores
	solicitanteId,                                 // FK users (quem pediu)
	decididaPorId,                                 // FK users, nullable
	metodoDecisao: actionApprovalDecisionMethodEnum("metodo_decisao"),   // "PAINEL" | "SENHA_PDV", nullable
	motivoDecisao: text("motivo_decisao"),         // nullable

	// ciclo de vida
	dataDecisao / dataExpiracao / dataConsumo,     // timestamps nullable
	consumo: jsonb("consumo"),                     // ex.: { vendaId } — nullable
	dataInsercao,                                  // defaultNow
}
// índices: (organizacaoId, status), dataInsercao
```

### 4.2 Enums

- `actionApprovalStatusEnum` (**pgEnum**, fechado e estável): `["PENDENTE", "APROVADA", "REJEITADA", "CANCELADA", "EXPIRADA", "CONSUMIDA"]` — gêmeo `z.enum` em `schemas/enums.ts`.
- `actionApprovalDecisionMethodEnum` (**pgEnum**): `["PAINEL", "SENHA_PDV"]`.
- **`tipo` é `varchar` + `z.enum` no app, deliberadamente NÃO pgEnum**: cada novo cenário de aprovação não pode custar migração de enum no Postgres. Padrão `ai-hints`: coluna denormalizada para filtro + discriminated union Zod validando o payload.

### 4.3 Payload (o coração jsonb)

```ts
// schemas/action-approvals.ts
const VendaDescontoPayloadSchema = z.object({
	tipo: z.literal("VENDA_DESCONTO"),
	vendedorId: z.string(),                 // vendedor da venda (identidade avaliada)
	valorBase: z.number(),                  // Σ bruto dos itens no momento da solicitação
	descontoSolicitado: z.number(),         // valor absoluto agregado
	descontoPercentual: z.number(),         // derivado, para exibição
	limiteSolicitante: z.object({ tipo: ..., valor: ... }).nullable(), // snapshot do teto vigente
});

export const ActionApprovalPayloadSchema = z.discriminatedUnion("tipo", [
	VendaDescontoPayloadSchema,
	// futuros: VendaCancelamentoPayloadSchema, CompraAcimaLimitePayloadSchema, ...
]);
```

`resumo` é preenchido na criação com `{ titulo, descricao, valorPrincipal }` — a fila renderiza qualquer tipo sem `switch` por payload.

### 4.4 Ciclo de vida e consumo

- Solicitação nasce `PENDENTE` com `dataExpiracao = now + 15min`.
- `APROVADA` é **one-shot**: finalizar a venda consome a aprovação **na mesma transação** (status → `CONSUMIDA`, `consumo: { vendaId }`, `dataConsumo`). Impede reuso em outra venda e fecha o ciclo de auditoria.
- `CANCELADA`: solicitante desiste. `EXPIRADA`: marcada lazy na leitura/validação (sem job por ora — solicitação vencida é tratada como inválida ao validar).
- No fluxo síncrono por PIN, a linha nasce e é decidida no mesmo request (`metodoDecisao: "SENHA_PDV"`), mas **fica registrada** — é o registro de auditoria.

### 4.5 API e registry de handlers

Rotas no padrão da casa (input schema → service → handler → `appApiHandler`):

- `POST /api/action-approvals` — cria solicitação; valida payload contra a union.
- `GET /api/action-approvals` — lista por org + status (fila do aprovador) / `byId`.
- `POST /api/action-approvals/decide` — aprova/rejeita via painel; exige a permissão do domínio do `tipo`.
- `POST /api/action-approvals/decide-with-pin` — fluxo síncrono: recebe `identificador` + `senhaOperador` do vendedor aprovador (ver §5.2).

**O primitivo fica burro e estável; a inteligência de cada cenário é plugável**:

```ts
// lib/action-approvals/handlers/index.ts
const handlers: Record<TActionApprovalType, {
	validarCriacao(payload, session): Promise<void>;
	autorizaDecisao(session | membershipAprovador): boolean;   // p/ VENDA_DESCONTO: vendas.descontos.aprovar
	aoConsumir?(payload, contexto, trx): Promise<void>;
}>
```

### 4.6 Realtime e fila

- Wrapper `useActionApprovalsRealtime({ orgId, queryKey })` clonando `usePoiTransactionRequestsRealtime` (tabela física `ampmais_action_approval_requests`, coluna `organizacao_id`).
- Componente de fila "Aprovações" no molde de `TransactionRequestsQueue.tsx`, filtrando `PENDENTE`, com aprovar/rejeitar + motivo.
- O PDV solicitante escuta a mesma tabela para reagir quando sua solicitação vira `APROVADA`/`REJEITADA`.

## 5. Fase 3 — Integração no PDV

### 5.1 Server (autoritativo)

Novo helper `lib/sales/sale-discount-authorization.ts` (espelho do `resolveSaleFiscalEmissionOverride`), aplicado em `create-and-confirm` e na confirmação de orçamento, após o recálculo da Fase 0:

1. **Resolver a identidade avaliada**: `input.vendedorId` → membership com `usuarioVendedorId = vendedorId` na org. Se o vendedor não tiver membership vinculada, cair para a membership da sessão; se nenhuma restrição existir em ambas, liberado (retrocompat).
2. Computar `valorBase` e `descontoTotal` (§3.3) e chamar `evaluateDiscount`.
3. `PERMITIDO` → segue.
4. `REQUER_APROVACAO` → exigir `approvalRequestId` no payload da venda e validar: mesma org, `tipo = "VENDA_DESCONTO"`, `status = APROVADA`, não expirada, `payload.vendedorId` igual, `descontoTotal ≤ descontoSolicitado` aprovado e `valorBase` dentro de tolerância. Marcar `CONSUMIDA` na mesma transação da venda.
5. Sem aprovação válida → `Forbidden` com mensagem em PT.

### 5.2 Aprovação por PIN (síncrona)

Endpoint `decide-with-pin` recebe `identificador` + `senhaOperador`:

1. Busca o vendedor **ativo** da org por `identificador` e confere a `senhaOperador`. (O identificador desambigua — não confiar em unicidade da senha entre vendedores.)
2. Resolve a membership vinculada (`usuarioVendedorId`) e exige `vendas.descontos.aprovar` (com fallback `empresa.editar` quando `descontos` ausente).
3. Cria a solicitação já `APROVADA` com `metodoDecisao: "SENHA_PDV"`, `decididaPorId` = usuário da membership aprovadora, e devolve o `approvalRequestId` para o PDV finalizar.

Restrição implícita: aprovador por PIN precisa ser membro com vendedor vinculado. Gestor sem vendedor vinculado aprova pelo painel.

### 5.3 Client (UX)

- `SummarySection.tsx` (input "Outros descontos") e o futuro desconto por item usam o mesmo `evaluateDiscount` para feedback imediato: exibir o teto do operador e, ao exceder, **não bloquear** — abrir modal de aprovação com dois caminhos:
	- **PIN no terminal**: gestor digita identificador + senha do operador → recebe `approvalRequestId` → finaliza na hora.
	- **Solicitação remota**: cria `PENDENTE`; a venda pode ser estacionada como `ORCAMENTO`; o PDV escuta via realtime e libera a finalização quando aprovar.
- O cupom `MANUAL` (`CouponRedemptionSection.tsx`) passa a compor o desconto agregado exibido contra o teto.

## 6. Fase 4 — Futuro (fora deste escopo)

- Badge/sino global de pendências (não existe sistema de notificação persistente hoje — seria greenfield).
- Tabela de eventos multi-etapa (`action_approval_request_events`, molde `fiscalDocumentEvents`) se surgir cenário com workflow em estágios.
- Expiração automática por job; expiração configurável por organização.
- Teto do aprovador (`aprovarLimite*`) e cadeias de aprovação (aprovador A até Y%, dono acima).
- Migrar `poiTransactionRequests` para o primitivo.
- UI de desconto por item no PDV (o campo existe em toda a cadeia state → API → DB, mas não há input hoje).

## 7. Pontos de atenção de implementação

- **Rotas de rascunho**: `createSaleDraft`/`updateSaleDraft` e a rota de confirmação de orçamento precisam da mesma validação do `create-and-confirm` — um orçamento com desconto acima do teto não pode ser confirmável sem aprovação.
- **Tolerância de arredondamento**: recálculo da Fase 0 e validação de `valorBase` na aprovação usam tolerância de centavos (definir constante única).
- **Membro sem `descontos` vs. membro com `descontos` parcial**: validação Zod deve aceitar ausência total (legado) mas exigir o objeto completo quando presente (sem chaves soltas).
- **`senhaOperador` em texto?** Verificar como a senha do operador é armazenada/conferida hoje no fluxo existente de sellers e seguir o mesmo mecanismo no `decide-with-pin`.
- **Migração**: `db:push` é o caminho real (journal do drizzle está desatualizado — ver memória do projeto); a permissão nova não exige migração de dados (ausência = liberado).

## 8. Arquivos-âncora

| Papel | Arquivo |
|---|---|
| Molde da entidade de aprovação | `services/drizzle/schema/poi-transaction-requests.ts` |
| Molde de jsonb discriminado + aprovação inline | `services/drizzle/schema/ai-hints.ts` |
| Molde de realtime + fila | `lib/hooks/use-supabase-realtime.ts:219`, `components/PointOfInteraction/TransactionRequestsQueue.tsx` |
| Permissões (schema + editor) | `schemas/organizations.ts:376`, `components/Modals/Users/Blocks/Permissions.tsx` |
| Molde de trava permissionada por venda | `lib/sales/sale-fiscal-emission-override.ts` |
| Ponto de enforcement | `app/api/pos/sales/create-and-confirm/route.ts:121-136` |
| Estado/UI do desconto no PDV | `state-hooks/use-sale-state.tsx`, `app/dashboard/commercial/sales/new-sale/components/checkout/SummarySection.tsx` |
| Formato do limite (referência) | par `resgateLimiteTipo`/`resgateLimiteValor` em `services/drizzle/schema/cashback-programs.ts` |
