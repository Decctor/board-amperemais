# Modelagem de Variantes — Suporte a Vestuário (eixos, valores e matriz)

## Visão geral

A modelagem atual de variantes funciona bem para **food-service**, onde a
complexidade vive nos add-ons (`product_add_ons` + `product_add_on_options`) e
cada produto costuma ter um único eixo de variação simples (tamanho do copo,
sabor). Para **vestuário** ela não escala: a variação é **multidimensional e
combinatória** (Tamanho × Cor × Material), e o modelo atual trata a variante
como uma entidade "plana" com um único `nome` livre (`"Preta G"`).

Este documento descreve a evolução da modelagem para suportar variantes
estruturadas — **sem quebrar food-service e sem quebrar as integrações** — e o
plano de implementação em fatias.

## Problema

| Sintoma | Causa raiz |
|---|---|
| Criar "Camiseta Preta P, Preta M, Preta G, Branca P…" é manual | Não existe o conceito de **eixo** (Tamanho, Cor) nem de **valor** (P, M, G) |
| 4 tamanhos × 5 cores = 20 variantes digitadas à mão | Não há **geração de matriz** |
| "Mostrar todas as pretas" / relatório por tamanho | A variante só tem a string `"Preta G"`, não sabe que é `cor=Preta, tamanho=G` |
| Picker de Cor × Tamanho na loja | Sem estrutura de eixos, o front não consegue renderizar o grid |
| Imagem por cor (todos os tamanhos da preta compartilham foto) | A imagem vive na variante individual, não no valor "Preta" |
| Código obrigatório por variante | UI exige `codigo` por variante — inviável gerar 20 SKUs na mão |

## Princípio de design

- A **variante continua sendo o SKU concreto** (preço, custo, estoque, código).
  Nada nas FKs existentes muda (`sale_items.produto_variante_id`,
  `product_stock_transactions.produto_variante_id`,
  `product_client_references.produto_variante_id`,
  `product_fiscal_profiles.produto_variante_id`).
- O que mudamos é **como a variante é descrita**: em vez de uma string `nome`
  solta, ela passa a ser a combinação de **valores de eixos**.
- Tudo é **aditivo e opcional**: variantes "planas" atuais e produtos
  food-service continuam válidos. `nome`/`codigo` permanecem.

## Modelo de dados

Três tabelas novas em `services/drizzle/schema/products.ts`, seguindo as
convenções (newTable `ampmais_`, colunas snake_case PT, campos Drizzle camelCase
PT, FKs `onDelete: "cascade"`, índices).

### `product_options` — os eixos (Tamanho, Cor, Material)

```
id, organizacaoId, produtoId -> products
nome           ("Tamanho", "Cor")
tipo           variant_option_type enum: TEXTO | COR | NUMERO  (drive UI)
ordem          integer (Tamanho antes de Cor?)
```

### `product_option_values` — os valores (P, M, G / Preto, Branco)

```
id, organizacaoId, opcaoId -> product_options
nome           ("G", "Preto")
valorAuxiliar  hex "#000000" quando tipo = COR (swatch)
imagemCapaUrl  foto compartilhada por todos os tamanhos dessa cor
ordem          integer
```

### `product_variant_option_values` — junção variante ↔ valor

```
id, organizacaoId
produtoVarianteId -> product_variants
opcaoId           -> product_options       (redundante p/ o índice único)
opcaoValorId      -> product_option_values
UNIQUE(produtoVarianteId, opcaoId)   -- 1 valor por eixo por variante
```

A variante "Camiseta Preta G" = duas linhas na junção:
`{Cor: Preto}` e `{Tamanho: G}`. O `nome` da variante vira derivado/exibição
(`"Preto / G"`) e o `codigo` pode ser autogerado (`CAMISA-PRT-G`).

### Enum

```ts
// schema/enums.ts
export const variantOptionTypeEnum = pgEnum("variant_option_type", ["TEXTO", "COR", "NUMERO"]);
// schemas/enums.ts
export const VariantOptionTypeEnum = z.enum(["TEXTO", "COR", "NUMERO"]);
```

## Encaixe com o módulo de vendas

O módulo de vendas já trata a variante como unidade atômica — as FKs continuam
válidas e **nenhuma migração é necessária no schema de vendas**. Dois ajustes:

1. **Fronteira semântica:** Tamanho/Cor são **variantes** (SKU próprio com
   estoque), não `sale_item_modifiers`. Numa venda, "Preto / G" resolve para
   `produto_variante_id`. Add-on continua sendo "borda recheada", "bacon extra".
2. **Snapshot dos eixos para relatório histórico:** seguindo o padrão de
   snapshot do código (`sale_item_modifiers` congela `nome`/`valor`), gravamos
   um snapshot compacto no `sale_items.metadados` (jsonb já existente):

   ```jsonc
   { "opcoes": [ { "eixo": "Cor", "valor": "Preto" }, { "eixo": "Tamanho", "valor": "G" } ] }
   ```

   Robusto a rename/delete de variante. Evolução futura opcional: tabela
   `sale_item_option_values` para reporting analítico colunar.
3. **POS/checkout:** o picker plano vira um grid Cor × Tamanho que **resolve
   para um único `produto_variante_id`** — a criação do `sale_item` não muda.

## Integrações — análise e impacto

**Achado central:** o catálogo hoje **nem usa `product_variants`**.
`TCanonicalProduct` (`lib/data-connectors/types.ts`) é totalmente plano, e o sync
da Nuvemshop (`mapNuvemshopCatalogProducts`) **explode cada variante em uma linha
própria de `products`**, achatando os eixos dentro do `nome`
(`"Camiseta - Preto / G"`, `getCatalogProductName`). A estrutura `variant.values`
que a Nuvemshop nos entrega — exatamente `[{pt:"Preto"},{pt:"G"}]` — é
**descartada**. Ou seja: a mesma peça já hoje pode existir como 5 produtos soltos
(sync) ou 1 produto + 5 variantes (manual). **A divergência já existe**; a
modelagem estruturada apenas a torna visível.

Frentes de trabalho (todas aditivas/opcionais — food connectors intactos):

| Frente | Mudança | Risco |
|---|---|---|
| Modelo canônico | `TCanonicalProduct` ganha `variants?: [{ externalId, sku, options: [{name,value}] }]` opcional | Baixo |
| Upsert 2 níveis | Casar pai por `product.externalId` (Nuvemshop `product_id`) e variante por `variant.externalId`/SKU. Colunas `idExterno` já existem nas duas tabelas | Médio |
| Matching de vendas | `mapNuvemshopSaleItem` casa por SKU/`codigo`. Com SKU na variante, o matching precisa procurar também em `product_variants.codigo`, senão gera item órfão | **Alto se esquecido** |
| Backfill | Reagrupar produtos já achatados por `product_id`. Hoje `idExterno` da linha guarda o `variant_id`, não o pai → exige re-fetch ou guardar `product_id` | Médio (custo único) |

## Plano de implementação (fatias)

1. **Schema + enums + migration** — tabelas, relations, tipos inferidos, barrel
   export, enum Drizzle + Zod. *(esta fatia)*
2. **Zod schemas + state-hook** — `ProductOptionSchema`,
   `ProductOptionValueSchema`, extensão de `use-product-state` com eixos/valores
   e gerador de matriz.
3. **UI de eixos/valores + geração de matriz** — `OptionsBlock` que define eixos
   e valores e gera as variantes automaticamente, substituindo o `addVariant`
   um-a-um do `Blocks/Variants.tsx`.
4. **API create/update** — processamento dos filhos via
   `handleSimpleChildRowsProcessing` em transação, com isolamento por
   `organizacaoId`.
5. **Integrações** — `variants` opcional no canônico, upsert 2-níveis na
   Nuvemshop, matching de vendas por `product_variants.codigo`, snapshot dos
   eixos no `metadados`, e backfill dos catálogos já sincronizados.

## Compatibilidade

- Food-service: `product_add_ons`/`options`/`references` inalterados.
- Variantes planas atuais: válidas (sem linhas de junção → usam `nome` livre).
- Conectores de food (Cardápio-Web, iFood): inalterados (variants opcionais).
</content>
</invoke>
