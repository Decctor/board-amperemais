# Módulo de Cupons — design e modelagem

Data: 2026-07-02
Branch: `claude/coupon-module-design-yfzo8o` (design)
Status: **Proposta**

## O problema em uma frase

Um mesmo cupom precisa servir a dois consumidores com capacidades muito diferentes: o **ERP interno** (que conhece o carrinho item a item e pode validar/aplicar regras automaticamente) e o **ponto de interação do CRM** (que muitas vezes só conhece o cliente e um valor de venda informado, e depende do operador para validar condições).

## Decisões de escopo

| Dimensão | Decisão | Implicação |
|---|---|---|
| Definição vs. posse vs. uso | **3 camadas: `coupons` (definição) → `coupon_grants` (atribuição individual) → `coupon_redemptions` (ledger de uso)** | Cupom global não gera linhas de atribuição; cupom individual gera uma linha por cliente. Todo uso vira uma linha imutável no ledger. |
| Modelo de regras | **Colunas tipadas + tabela-filha de alvos de produto** (estilo `campaigns`: colunas anuláveis por tipo), não árvore de regras em JSONB | Cobre os casos reais (base, grupo, produto, combinação, leve-X-pague-Y) sem motor genérico. JSONB só em `metadados` de snapshot. |
| Dois modos de validação | **`validacaoModo: AUTOMATICA \| MANUAL`** no cupom | `AUTOMATICA`: motor avalia o carrinho no POS/ERP. `MANUAL`: `condicoesTexto` é exibido a cliente e operador no ponto de interação; o operador é o validador. |
| Integração com venda | Desconto do cupom entra em `sales.descontosTotal` / `saleItems.valorTotalDesconto` (mesmo caminho do cashback) | Nenhuma mudança no cálculo de totais; o cupom é mais uma fonte de desconto, rastreada pelo ledger. |

---

## 1. O que já existe e é reaproveitado

- **`cashbackPrograms` / `cashbackProgramTransactions`** — é o "irmão mais velho" do módulo: definição por organização + ledger de transações com snapshot (`saldoValorAnterior/Posterior`, `operadorId`, `operadorVendedorId`, `metadados`). O ledger de cupons segue o mesmo desenho.
- **`campaigns`** — padrão de modelagem por colunas anuláveis prefixadas por contexto (`gatilho*`, `cashbackGeracao*`). Os cupons seguem o mesmo gosto (`beneficio*`, `condicao*`, `vigencia*`, `limite*`). Campanhas já geram cashback como efeito colateral; gerar **atribuição de cupom individual** é a extensão natural (`cupomGeracao*`).
- **`poiTransactionRequests`** — fluxo de aprovação do ponto de interação (token público, payload, aprovação por operador). O resgate manual de cupom entra aqui como novo campo de vínculo, exatamente como `transacaoResgateId` faz para cashback.
- **POS interno (`/api/pos/sales`)** — já recebe `valorDesconto` por item e `descontosTotal` na venda. A aplicação automática do cupom só precisa preencher esses campos e registrar o uso no ledger, na mesma transação.
- **`products.grupo`** — campo texto indexado; é a chave para "desconto por grupo de produtos" sem criar taxonomia nova.

## 2. Modelagem proposta

Arquivo novo: `services/drizzle/schema/coupons.ts` (+ enums em `schema/enums.ts`).

### 2.1 `coupons` — a definição (o "molde" da promoção)

```ts
export const coupons = newTable("coupons", {
	id, organizacaoId, ativo,

	// Identidade e comunicação
	titulo: text("titulo").notNull(),
	descricao: text("descricao"),               // texto de marketing (cliente final)
	imagemCapaUrl: text("imagem_capa_url"),
	codigo: text("codigo").notNull(),           // código público (ex: "PROMO10"); unique por organização

	// Escopo de audiência
	escopo: couponScopeEnum("escopo").notNull().default("GLOBAL"), // GLOBAL | INDIVIDUAL

	// Modo de validação no resgate
	validacaoModo: couponValidationModeEnum("validacao_modo").notNull().default("AUTOMATICA"), // AUTOMATICA | MANUAL
	condicoesTexto: text("condicoes_texto"),    // regras em linguagem natural — obrigatório quando MANUAL

	// Benefício
	beneficioTipo: couponBenefitTypeEnum("beneficio_tipo").notNull(),
	// DESCONTO_FIXO | DESCONTO_PERCENTUAL | PRECO_FIXO | COMPRE_X_LEVE_Y | BRINDE
	beneficioValor: doublePrecision("beneficio_valor"),            // R$ fixo, % ou preço-alvo
	beneficioDescontoMaximo: doublePrecision("beneficio_desconto_maximo"), // teto em R$ p/ percentual
	beneficioAplicacao: couponBenefitScopeEnum("beneficio_aplicacao").notNull().default("VENDA_TOTAL"),
	// VENDA_TOTAL | ITENS_ELEGIVEIS
	beneficioCompreQuantidade: integer("beneficio_compre_quantidade"), // COMPRE_X_LEVE_Y: X
	beneficioLeveQuantidade: integer("beneficio_leve_quantidade"),     // COMPRE_X_LEVE_Y: Y (Y - X sai grátis)

	// Condições estruturadas (validação AUTOMATICA)
	condicaoValorMinimoVenda: doublePrecision("condicao_valor_minimo_venda"),
	condicaoQuantidadeMinimaItens: integer("condicao_quantidade_minima_itens"),
	condicaoAlvosOperador: couponTargetOperatorEnum("condicao_alvos_operador").default("QUALQUER"),
	// QUALQUER (OR: qualquer alvo presente) | TODOS (AND: combinação — todos os alvos presentes)

	// Vigência
	vigenciaInicio: timestamp("vigencia_inicio"),
	vigenciaFim: timestamp("vigencia_fim"),     // null = não expira

	// Limites de uso
	limiteResgatesTotal: integer("limite_resgates_total"),          // null = ilimitado
	limiteResgatesPorCliente: integer("limite_resgates_por_cliente").default(1),
	acumulavel: boolean("acumulavel").notNull().default(false),     // combina com outros cupons/cashback?

	// Superfícies de resgate (padrão cashbackPrograms.acumuloPermitirVia*)
	resgatePermitirViaPos: boolean("resgate_permitir_via_pos").notNull().default(true),
	resgatePermitirViaPontoInteracao: boolean("resgate_permitir_via_ponto_interacao").notNull().default(true),

	autorId, dataInsercao, dataAtualizacao,
});
// uniqueIndex (organizacaoId, codigo)
```

Como cada necessidade do ERP mapeia:

| Promoção | Configuração |
|---|---|
| Desconto base (venda toda) | `beneficioTipo: DESCONTO_PERCENTUAL/FIXO`, `beneficioAplicacao: VENDA_TOTAL`, sem alvos |
| Desconto por grupo | alvo `{ grupo: "calças" }`, `beneficioAplicacao: ITENS_ELEGIVEIS` |
| Desconto por produto/variante | alvo `{ produtoId }` ou `{ produtoVarianteId }` |
| Combinação de produtos | 2+ alvos `ELEGIVEL`, `condicaoAlvosOperador: TODOS` |
| Leve 2 pague 1 | `beneficioTipo: COMPRE_X_LEVE_Y`, `compreQuantidade: 1`, `leveQuantidade: 2`, alvo no produto/grupo |
| Compre X, ganhe desconto em Y | alvos `ELEGIVEL` (X) + alvos `BENEFICIADO` (Y), `beneficioAplicacao: ITENS_ELEGIVEIS` |
| Promoção "impossível de estruturar" | `validacaoModo: MANUAL` + `condicoesTexto` |

### 2.2 `coupon_targets` — escopo de produtos (filha, gerida via `handleSimpleChildRowsProcessing`)

```ts
export const couponTargets = newTable("coupon_targets", {
	id, organizacaoId,
	cupomId: ...references(() => coupons.id, { onDelete: "cascade" }).notNull(),
	papel: couponTargetRoleEnum("papel").notNull().default("ELEGIVEL"), // ELEGIVEL | BENEFICIADO
	// Exatamente um dos três preenchido (validação no Zod):
	produtoId: ...references(() => products.id, { onDelete: "cascade" }),
	produtoVarianteId: ...references(() => productVariants.id, { onDelete: "cascade" }),
	grupo: text("grupo"),                        // casa com products.grupo
	quantidadeMinima: integer("quantidade_minima").default(1), // p/ combinações e X-leve-Y
});
```

- `ELEGIVEL`: define **quando** o cupom vale (o que precisa estar no carrinho).
- `BENEFICIADO`: define **onde** o desconto incide quando `beneficioAplicacao = ITENS_ELEGIVEIS`. Se não houver linhas `BENEFICIADO`, o benefício incide sobre os próprios elegíveis.
- Sem linhas de alvo = cupom vale para qualquer carrinho (desconto base).

### 2.3 `coupon_grants` — atribuição individual (posse)

Só existe para `escopo: INDIVIDUAL`. Cupom `GLOBAL` não materializa linhas por cliente — a disponibilidade é derivada em query (evita explosão de linhas e sincronização com a base de clientes).

```ts
export const couponGrants = newTable("coupon_grants", {
	id, organizacaoId,
	cupomId: ...references(() => coupons.id, { onDelete: "cascade" }).notNull(),
	clienteId: ...references(() => clients.id, { onDelete: "cascade" }).notNull(),
	codigo: text("codigo"),                      // opcional: código único por atribuição (ex: gerado p/ campanha)
	origem: couponGrantOriginEnum("origem").notNull().default("MANUAL"), // MANUAL | CAMPANHA | SISTEMA
	campanhaId: ...references(() => campaigns.id),      // rastreio quando origem = CAMPANHA
	quantidadeDisponivel: integer("quantidade_disponivel").notNull().default(1),
	expiracaoData: timestamp("expiracao_data"),  // sobrepõe vigenciaFim do cupom (ex: "72h após o disparo")
	dataInsercao, dataAtualizacao,
});
// index (organizacaoId, clienteId), index (cupomId)
```

### 2.4 `coupon_redemptions` — ledger de uso (imutável, padrão `cashbackProgramTransactions`)

```ts
export const couponRedemptions = newTable("coupon_redemptions", {
	id, organizacaoId,
	cupomId: ...references(() => coupons.id).notNull(),
	atribuicaoId: ...references(() => couponGrants.id), // null quando cupom GLOBAL
	clienteId: ...references(() => clients.id, { onDelete: "set null" }),
	status: couponRedemptionStatusEnum("status").notNull().default("UTILIZADO"), // UTILIZADO | CANCELADO

	// Contexto do uso
	vendaId: ...references(() => sales.id),      // null em resgate manual sem venda espelhada
	vendaValor: doublePrecision("venda_valor"),  // valor de venda informado/apurado no momento
	valorDesconto: doublePrecision("valor_desconto").notNull(), // desconto efetivamente concedido

	// Snapshot (a definição do cupom pode mudar depois)
	cupomTitulo: text("cupom_titulo").notNull(),
	cupomCodigo: text("cupom_codigo").notNull(),
	beneficioSnapshot: jsonb("beneficio_snapshot"), // tipo/valor/alvos no momento do uso

	// Accountability (padrão do POI/cashback)
	origemResgate: couponRedemptionSourceEnum("origem_resgate").notNull(), // POS | PONTO_INTERACAO | LOJA_DIGITAL
	operadorId: ...references(() => users.id, { onDelete: "set null" }),
	operadorVendedorId: ...references(() => sellers.id, { onDelete: "set null" }),
	metadados: jsonb("metadados"),
	dataInsercao, dataAtualizacao,
});
```

Limites são **derivados do ledger** (count de `UTILIZADO` por cupom/cliente), não contadores mutáveis — cancelamento de venda vira `status: CANCELADO` e "devolve" o uso naturalmente. Em `coupon_grants`, `quantidadeDisponivel` é decrementada/incrementada na mesma transação do resgate/cancelamento (como o saldo de cashback).

### 2.5 Alterações em tabelas existentes

- **`poiTransactionRequests`**: novo campo `cupomResgateId` referenciando `couponRedemptions` (espelho de `transacaoResgateId`), e o `payloadSolicitacao` passa a aceitar `cupomId`/`atribuicaoId` na intenção de resgate.
- **`campaigns`** (fase 2): bloco `cupomGeracao*` (`cupomGeracaoAtivo`, `cupomGeracaoCupomId`, `cupomGeracaoExpiracaoValor/Medida`) — a campanha atribui um cupom individual ao disparar, como já faz com cashback.
- **`sales`**: nada. O vínculo venda↔cupom vive no ledger (`couponRedemptions.vendaId`), e o valor entra no `descontosTotal` existente.

## 3. Os dois fluxos de resgate

### 3.1 ERP / POS — automático ("o cliente se identifica e o sistema mostra os cupons")

1. `GET /api/pos/coupons/available?clienteId=...` retorna cupons **candidatos**: ativos, dentro da vigência, `resgatePermitirViaPos`, e (`escopo = GLOBAL` **ou** grant vigente do cliente), com limites não esgotados.
2. Com o carrinho montado, o motor de elegibilidade (`lib/coupons/engine.ts`, função pura `evaluateCoupon({ coupon, targets, cartItems })`) filtra por `condicao*` + alvos e **computa o desconto** (incluindo COMPRE_X_LEVE_Y: ordena unidades elegíveis por preço e zera as Y−X mais baratas — regra determinística, sem decisão do operador).
3. Ao concluir a venda (`POST /api/pos/sales`), na mesma transação: revalida o cupom, grava `couponRedemptions`, decrementa `quantidadeDisponivel` do grant e injeta o desconto em `descontosTotal` / `valorTotalDesconto` dos itens beneficiados.
4. Cupons `validacaoModo: MANUAL` também aparecem no POS, mas exibem `condicoesTexto` e pedem que o operador informe o valor do desconto (mesma UX do ponto de interação).

### 3.2 CRM / Ponto de interação — assistido pelo operador

1. Cliente se identifica pelo telefone; a interface lista os cupons disponíveis (mesma query de candidatos, filtrando `resgatePermitirViaPontoInteracao`).
2. Para `AUTOMATICA` com `beneficioAplicacao: VENDA_TOTAL`: o valor da venda informado basta para calcular o desconto — sem intervenção.
3. Para `MANUAL`: a tela mostra `condicoesTexto` ao cliente e ao operador ("desconto em calças — confira se há calça na compra"); o operador valida, informa/confirma o valor e aprova com PIN, exatamente como no resgate de cashback.
4. A aprovação do `poiTransactionRequest` cria o `couponRedemption` (com `operadorId`/`operadorVendedorId`) e vincula via `cupomResgateId`.

## 4. Por que não um motor de regras genérico (JSONB)

- O padrão da casa é **colunas explícitas + tabelas-filhas** (`campaigns`, `productAddOns`, `cashbackPrograms`) — queries indexáveis, migrações rastreáveis, UI de formulário direta (`state-hooks` + `Blocks`).
- Os casos pedidos (base, grupo, produto, combinação, quantidade) cabem todos em `beneficioTipo` + `couponTargets` + `condicaoAlvosOperador`. O caso que **não** cabe já tem válvula de escape de produto: `validacaoModo: MANUAL` + `condicoesTexto`.
- Se um dia surgir regra composta real (tiers, "3 grupos diferentes", etc.), adiciona-se um novo `beneficioTipo` ou uma coluna `condicao*` — evolução aditiva, sem quebrar o motor.

## 5. Estrutura de arquivos (convenções do CLAUDE.md)

| Camada | Arquivo |
|---|---|
| Schema DB | `services/drizzle/schema/coupons.ts` + enums em `schema/enums.ts` |
| Zod | `schemas/coupons.ts` + enums em `schemas/enums.ts` |
| Motor de elegibilidade | `lib/coupons/engine.ts` (puro, testável, compartilhado por POS/POI/loja) |
| API admin | `app/api/coupons/route.ts` (GET multi-modo `byId`/`default`, POST aninhado cupom+alvos via `handleSimpleChildRowsProcessing`, PUT, DELETE) |
| API POS | `app/api/pos/coupons/available/route.ts` + aplicação dentro de `app/api/pos/sales` |
| API POI | extensão de `app/api/point-of-interaction/*` (listagem + resgate no fluxo de aprovação) |
| Queries/Mutations | `lib/queries/coupons.ts`, `lib/mutations/coupons.ts` |
| State hook | `state-hooks/use-internal-coupon-state.tsx` (alvos com soft-delete `deletar`) |
| Modais | `components/Modals/Coupons/NewCoupon.tsx`, `ControlCoupon.tsx` + `Blocks/` (Geral, Benefício, Condições/Alvos, Vigência & Limites, Resgate) |
| Página | `app/(admin)|dashboard` conforme módulo de cashback existente |

## 6. Fases sugeridas

1. **Fase 1 — núcleo**: schema (4 tabelas + enums), CRUD admin, motor de elegibilidade, resgate no POS (automático) e no ponto de interação (manual + venda-total automático).
2. **Fase 2 — distribuição**: geração de grants por campanha (`cupomGeracao*`), variáveis de template WhatsApp (`{{coupon_code}}`, `{{coupon_expiration}}`), listagem de cupons no perfil do cliente.
3. **Fase 3 — superfícies**: cupons na loja digital (`/api/shop`), estatísticas (resgates, desconto concedido, conversão por cupom), cancelamento em cascata com cancelamento de venda.

## 7. Pontos em aberto

- **Empilhamento** (`acumulavel`): a fase 1 pode simplesmente permitir **1 cupom por venda** + cashback, e evoluir depois; o flag já fica na definição.
- **BRINDE** no POS: dar item grátis exige injetar um `saleItem` com 100% de desconto (bom para estoque/relatórios) — decidir se entra na fase 1 ou se `COMPRE_X_LEVE_Y` cobre o caso.
- **Snapshot de alvos**: `beneficioSnapshot` em JSONB é suficiente para auditoria, ou precisamos de relatório estruturado por produto beneficiado? (Se sim, tabela-filha de itens do resgate.)
