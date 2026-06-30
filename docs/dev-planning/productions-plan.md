# Planejamento do Modulo de Producoes

## Visao Geral

O modulo de producoes resolve cenarios em que uma organizacao transforma
produtos em outros produtos: restaurantes, sorveterias, confeitarias, cozinhas
industriais, pequenos fabricantes e operacoes com preparo antecipado.

O objetivo desta primeira fase e modelar:

- receitas/fichas tecnicas;
- ordens de producao;
- consumo de insumos;
- geracao de produtos finais;
- lotes de estoque;
- validade de produtos pereciveis;
- movimentacoes de estoque auditaveis.

Producoes devem ser tratadas como uma origem de movimentacao de estoque. O
saldo atual continua em `products.quantidade` ou `productVariants.quantidade`,
e o historico continua em `productStockTransactions`.

## Fora do Escopo Inicial

Esta fase nao cobre a integracao automatica com PDV/restaurantes.

Casos como produto produzido sob demanda no POS, baixa de ingredientes durante
preparo do pedido, producao vinculada automaticamente a `saleItems` e regras de
food-service em tempo real ficam para uma etapa posterior.

Mesmo assim, o modelo ja deixa `vendaId` e `vendaItemId` em `productions` para
facilitar essa evolucao sem remodelagem estrutural.

## Principios de Design

- A receita e o molde; a producao e a execucao.
- Inputs e outputs da producao sao snapshots, nao apenas referencias dinamicas
  a receita.
- Validade deve ser definida por item de saida da receita, porque uma mesma
  receita pode gerar produtos com prazos diferentes.
- Lote de estoque deve ser generico, nao exclusivo de producao, pois tambem pode
  nascer de compras.
- FKs e nomes de campos seguem a padronizacao do app em portugues:
  `producaoId`, `compraId`, `producaoEntradaId`, `producaoSaidaId`.
- O modulo deve reaproveitar `timeDurationUnitsEnum` quando fizer sentido, com
  validacao de valores permitidos no contexto de producao.

## Enums

Adicionar em `services/drizzle/schema/enums.ts` e `schemas/enums.ts`.

### Status da Producao

```ts
productionStatusEnum = [
	"RASCUNHO",
	"PLANEJADA",
	"EM_PRODUCAO",
	"CONCLUIDA",
	"CANCELADA",
];
```

Significado:

| Status | Uso |
|---|---|
| `RASCUNHO` | Producao ainda editavel, sem efeitos de estoque |
| `PLANEJADA` | Producao prevista/agendada, ainda sem consumo |
| `EM_PRODUCAO` | Producao iniciada, ainda nao concluida |
| `CONCLUIDA` | Producao finalizada, com estoque movimentado |
| `CANCELADA` | Producao cancelada, sem novos efeitos de estoque |

### Origem da Producao

```ts
productionOriginEnum = [
	"MANUAL",
	"PEDIDO",
	"AGENDADA",
];
```

`PEDIDO` fica reservado para integracao futura com vendas/PDV.

### Movimentos de Estoque

Adicionar valores ao enum existente `stockMovementTypeEnum`:

```ts
[
	"SAIDA_PRODUCAO",
	"ENTRADA_PRODUCAO",
	"DESCARTE",
]
```

### Status de Lote

```ts
stockLotStatusEnum = [
	"ATIVO",
	"ESGOTADO",
	"VENCIDO",
	"DESCARTADO",
];
```

### Medidas de Tempo

Reaproveitar `timeDurationUnitsEnum` para previsao de tempo e prazo de validade,
desde que o schema/API valide apenas as unidades aceitas para cada contexto.

Para producoes, os valores esperados sao:

```ts
["MINUTOS", "HORAS", "DIAS"]
```

Se o enum compartilhado ainda nao possuir `MINUTOS` e `HORAS`, avaliar expandi-lo
em vez de criar um enum novo, desde que isso nao quebre a semantica dos usos
atuais.

## Modelo de Dados

Criar `services/drizzle/schema/productions.ts` e exportar em
`services/drizzle/schema/index.ts`.

### `productionRecipes`

Ficha tecnica reutilizavel.

Campos:

```ts
id
organizacaoId
titulo
descricao
previsaoTempoMedida
previsaoTempoValor
ativo
dataInsercao
```

Observacoes:

- `previsaoTempoMedida` usa o enum de tempo compartilhado, validado para o
  contexto de producao.
- `ativo = false` arquiva a receita sem apagar historico.

### `productionRecipeInputs`

Insumos previstos pela receita.

Campos:

```ts
id
organizacaoId
receitaId
produtoId
produtoVarianteId
quantidade
```

### `productionRecipeOutputs`

Produtos gerados pela receita.

Campos:

```ts
id
organizacaoId
receitaId
produtoId
produtoVarianteId
quantidade
prazoValidadeMedida
prazoValidadeValor
```

Validade:

- `prazoValidadeMedida` e `prazoValidadeValor` representam a regra padrao.
- A `dataValidade` real nasce na execucao da producao.
- A validade fica no output da receita para permitir controle fino por produto
  gerado.

### `productions`

Ordem/lote de producao executado.

Campos:

```ts
id
organizacaoId
receitaId
titulo
origem
status
vendaId
vendaItemId
dataInicio
dataPrevisaoConclusao
dataConclusao
observacoes
autorId
dataInsercao
```

Observacoes:

- `receitaId` pode ser nullable para permitir producoes manuais sem receita
  formal na primeira versao, se desejado.
- `vendaId` e `vendaItemId` ficam nullable e reservados para integracao futura
  com pedidos/PDV.
- `dataConclusao` deve ser preenchida quando a producao mudar para `CONCLUIDA`.

### `productionInputs`

Snapshot dos insumos da execucao.

Campos:

```ts
id
organizacaoId
producaoId
produtoId
produtoVarianteId
quantidadePrevista
quantidadeReal
```

Motivo:

- `quantidadePrevista` vem da receita ou do planejamento manual.
- `quantidadeReal` registra o consumo efetivo.
- A diferenca permite medir perda, ajuste fino e rendimento real.

### `productionOutputs`

Snapshot dos produtos gerados na execucao.

Campos:

```ts
id
organizacaoId
producaoId
produtoId
produtoVarianteId
quantidadePrevista
quantidadeReal
prazoValidadeMedida
prazoValidadeValor
dataValidade
```

Motivo:

- A validade padrao e copiada da receita para manter historico.
- `dataValidade` e calculada no momento da conclusao e pode ser ajustada pelo
  usuario quando necessario.

### `productStockLots`

Lotes de estoque. Deve ficar no dominio de produtos/estoque, nao dentro de
producoes, porque lotes tambem podem nascer de compras.

Campos:

```ts
id
organizacaoId
produtoId
produtoVarianteId
codigoLote
dataFabricacao
dataValidade
quantidadeInicial
quantidadeAtual
status
producaoId
compraId
dataInsercao
```

Observacoes:

- `producaoId` referencia uma producao quando o lote nasceu por producao.
- `compraId` referencia uma compra quando o lote nasceu por aquisicao.
- `codigoLote` pode ser informado pelo usuario ou gerado automaticamente.
- `status` pode ser derivado em alguns casos, mas persistir facilita filtros e
  acoes operacionais como descarte.

## Evolucao de `productStockTransactions`

Adicionar vinculos opcionais:

```ts
producaoId
producaoEntradaId
producaoSaidaId
loteId
```

Uso:

- `producaoId`: ordem de producao que gerou o movimento.
- `producaoEntradaId`: linha de input consumida, quando `tipo =
  "SAIDA_PRODUCAO"`.
- `producaoSaidaId`: linha de output gerada, quando `tipo =
  "ENTRADA_PRODUCAO"`.
- `loteId`: lote afetado pelo movimento.

## Fluxo de Conclusao de Producao

Ao concluir uma producao:

1. Validar sessao, organizacao, permissao e status atual.
2. Validar que a producao possui ao menos um output com `quantidadeReal > 0`.
3. Para cada input com rastreamento de estoque ativo:
   - carregar produto/variante;
   - validar saldo suficiente;
   - registrar `productStockTransactions.tipo = "SAIDA_PRODUCAO"`;
   - atualizar saldo do produto/variante.
4. Para cada output com rastreamento de estoque ativo:
   - calcular `dataValidade` a partir de `prazoValidadeMedida` e
     `prazoValidadeValor`, quando informado;
   - criar `productStockLots`;
   - registrar `productStockTransactions.tipo = "ENTRADA_PRODUCAO"`;
   - atualizar saldo do produto/variante;
   - atualizar custo medio quando aplicavel.
5. Marcar `productions.status = "CONCLUIDA"`.
6. Preencher `productions.dataConclusao`.

O fluxo deve rodar em uma unica transacao de banco.

## Estoque e Custo

A implementacao deve evitar duplicar logica de movimentacao de estoque.

Recomendacao: extrair um helper generico em `lib/stock/`, reaproveitando as
ideias de `lib/purchase-processing/process-purchase-item-stock.ts`:

```ts
applyProductStockMovement(...)
applyVariantStockMovement(...)
```

Esse helper deve receber:

```ts
trx
organizationId
userId
produtoId
produtoVarianteId
signedQuantity
movementType
reason
unitCost
links
```

`links` pode carregar `compraId`, `compraItemId`, `vendaId`, `vendaItemId`,
`producaoId`, `producaoEntradaId`, `producaoSaidaId` e `loteId`.

## API

Criar rotas App Router em `/app/api/**/route.ts`, seguindo o padrao da codebase:

1. input schema;
2. service function;
3. output type;
4. route handler;
5. export via `appApiHandler`.

Rotas iniciais:

```txt
/app/api/productions/recipes/route.ts
/app/api/productions/route.ts
/app/api/productions/complete/route.ts
/app/api/productions/cancel/route.ts
```

### Receitas

`GET /api/productions/recipes`

- multi-mode GET: lista default ou byId.
- retorna inputs e outputs aninhados no byId.

`POST /api/productions/recipes`

- cria receita com inputs e outputs.

`PUT /api/productions/recipes`

- atualiza receita com inputs e outputs.
- usar `handleSimpleChildRowsProcessing` para filhos, com soft-delete na UI.

### Producoes

`GET /api/productions`

- multi-mode GET: lista default ou byId.
- filtros iniciais: `status`, `origem`, `periodAfter`, `periodBefore`.

`POST /api/productions`

- cria producao manual ou baseada em receita.
- se `receitaId` for informado, materializa inputs/outputs a partir da receita.

`PUT /api/productions`

- atualiza producao enquanto status permitir.
- nao deve permitir alterar producao concluida sem fluxo especifico de ajuste.

`POST /api/productions/complete`

- conclui producao e movimenta estoque.

`POST /api/productions/cancel`

- cancela producao ainda nao concluida.
- para producao concluida, cancelamento com estorno fica fora do MVP ou deve ser
  tratado como fluxo explicito separado.

## Schemas Zod

Criar `schemas/productions.ts`.

Regras:

- enums Zod ficam em `schemas/enums.ts`;
- cada campo com `required_error` e `invalid_type_error`;
- datas usam string `.datetime().transform((val) => new Date(val))`;
- schemas de input das rotas podem omitir `organizacaoId`, `autorId`,
  `dataInsercao` e campos derivados.

Validacoes importantes:

- `quantidade`, `quantidadePrevista` e `quantidadeReal` nao podem ser negativas.
- producao concluida precisa ter output real.
- `prazoValidadeValor` so deve ser aceito quando `prazoValidadeMedida` existir.
- unidade de tempo deve ser limitada ao contexto de producao/validade.

## Client

Arquivos iniciais:

```txt
/lib/queries/productions.ts
/lib/mutations/productions.ts
/state-hooks/use-internal-production-recipe-state.tsx
/state-hooks/use-internal-production-state.tsx
```

Queries:

- importar tipos de `/app/api/productions/**/route`;
- construir query string com `new URLSearchParams()`;
- omitir valores vazios;
- serializar datas com `.toISOString()`.

Mutations:

- wrappers finos de Axios;
- nao importar React Query hooks.

State hooks:

- seguir padrao `useInternal*State`;
- filhos com `id?: string` e `deletar?: boolean`;
- `removeChild` com soft-delete para filhos existentes;
- expor `state`, updaters, `addChild`, `removeChild`, `redefineState` e
  `resetState`.

## UI

Arquivos iniciais:

```txt
/components/Modals/Internal/Productions/NewProductionRecipe.tsx
/components/Modals/Internal/Productions/ControlProductionRecipe.tsx
/components/Modals/Internal/Productions/NewProduction.tsx
/components/Modals/Internal/Productions/ControlProduction.tsx
/components/Modals/Internal/Productions/Blocks/
/app/dashboard/operational/productions/page.tsx
/app/dashboard/operational/productions/productions-page.tsx
```

Regras:

- textos em portugues brasileiro;
- CRUD em modais, sem inline editing;
- `New*` separado de `Control*`;
- `callbacks?: { onMutate?, onSuccess?, onError?, onSettled? }`;
- usar `ResponsiveMenu` e `ResponsiveMenuSection`;
- listagem deve abrir modal para criar/editar;
- a acao de concluir producao deve ser explicita.

## MVP em Fatias

### Fatia 1: Modelo e Receita

- Enums.
- Tabelas de receitas.
- Schemas Zod.
- CRUD de receitas.
- Queries/mutations.
- UI de cadastro de receita.

### Fatia 2: Producao Manual

- Tabelas de producoes, inputs e outputs.
- CRUD de producoes.
- Criacao baseada em receita.
- UI operacional simples.

### Fatia 3: Conclusao e Estoque

- Evolucao de `productStockTransactions`.
- Criacao de `productStockLots`.
- Helper generico de movimentacao de estoque.
- Endpoint de conclusao.
- Baixa de insumos e entrada de outputs.

### Fatia 4: Validade e Alertas

- Filtros por validade/lote.
- Alertas simples de produtos vencidos ou proximos do vencimento.
- Status de lote `VENCIDO`, `ESGOTADO` e `DESCARTADO`.

## Extensoes Futuras

- Integracao com compras para criar lotes a partir de recebimento.
- Consumo FEFO: primeiro vencer, primeiro sair.
- Descarte parcial/total de lotes.
- Estorno de producao concluida.
- Producao sob demanda vinculada a vendas/PDV.
- Relatorios de rendimento: previsto vs real, perdas e custo por lote.
