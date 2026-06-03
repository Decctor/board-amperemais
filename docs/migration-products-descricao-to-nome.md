# Migração: `products.descricao` → `products.nome`

## Contexto

A coluna `descricao` em `ampmais_products` sempre funcionou como **nome/título** do produto (listagens, PDV, loja, snapshots de compra, integrações). Esta migração renomeia para `nome`, alinhando variantes (`product_variants.nome`), adicionais e o modelo mental do domínio.

**Fase 2 (concluída):** coluna `descricao` opcional (`drizzle/0021_products_add_descricao.sql`), populada pelo sync CardapioWeb (`item.description`).

**Fora de escopo nesta PR:** renomear `snapshot_produto_descricao` em `purchase_items` (continua guardando o nome histórico).

---

## 1. Banco e schema

| Item | Arquivo |
|------|---------|
| Coluna `descricao` → `nome` | `services/drizzle/schema/products.ts` |
| Migration SQL | `drizzle/0020_products_descricao_to_nome.sql` |
| OrderBy catálogo loja | `lib/shop/catalog.ts` |

---

## 2. Validação e estado

| Item | Arquivo |
|------|---------|
| `ProductSchema` | `schemas/products.ts` |
| `useProductState` / `useProductCoreState` | `state-hooks/use-product-state.tsx` |

---

## 3. API — produtos

| Item | Arquivo |
|------|---------|
| CRUD, listagem, busca, `orderByField` | `app/api/products/route.ts` |
| Busca rápida | `app/api/products/search/route.ts` |
| Stats + byId | `app/api/products/stats/route.ts` |
| Ranking | `app/api/products/stats/ranking/route.ts` |
| POS catálogo | `app/api/pos/products/route.ts` |
| Shop settings (colunas) | `app/api/shop/settings/route.ts` |

**Contrato:** `orderByField=nome` (valor antigo `descricao` removido). Respostas expõem `nome` em vez de `descricao`.

---

## 4. API — stats e relatórios

Alias de resposta renomeado onde refletia o nome do produto:

| Antes | Depois | Arquivos |
|-------|--------|----------|
| `produtoDescricao` | `produtoNome` | `app/api/products/stats/route.ts`, `app/api/sellers/stats/route.ts`, `app/api/clients/stats/by-client/route.ts`, `lib/reports/data-fetchers.ts` |
| `productDescription` | `productName` | `app/api/stats/sales-detailed-analysis/route.ts` |
| `titulo: products.descricao` | `titulo: products.nome` | `app/api/stats/sales-grouped/route.ts` |
| `produtoNome: products.descricao` | `produtoNome: products.nome` | `app/api/utils/sales-promo-campaign-stats/route.ts` |

**UI que consome `produtoDescricao`:** atualizar para `produtoNome`.

| Arquivo |
|---------|
| `app/dashboard/team/sellers/id/[id]/seller-page.tsx` |
| `app/dashboard/commercial/products/id/[id]/product-stats-tab.tsx` |
| `components/Clients/ClientDetails/ClientDetailsMain.tsx` |
| `components/Reports/ReportRankingList.tsx` |
| `lib/reports/payload.ts`, `caption-templates.ts`, `message-templates.ts` |

---

## 5. API — vendas, compras, loja

| Item | Arquivo |
|------|---------|
| `produto.columns` | `app/api/sales/route.ts` |
| `produto.columns` | `app/api/purchases/route.ts` |
| POS venda | `app/api/pos/sales/route.ts` |
| Nome do item no pedido | `app/api/shop/[orgId]/orders/route.ts` |
| Agregação por produto | `app/api/stats/comparison/route.ts` |

---

## 6. Integrações

| Item | Arquivo |
|------|---------|
| `MappedCatalogProduct.nome` | `lib/data-connectors/cardapio-web/catalog-mappers.ts` |
| Tipo intermediário pedidos CW | `lib/data-connectors/cardapio-web/mappers.ts` |
| Canonical → DB | `lib/data-connectors/cardapio-web/canonical.ts` |
| Insert import v2 | `lib/data-collecting-v2/sync-auxiliary-entities.ts` |
| Cron catálogo | `app/api/cron/products-syncing/route.ts` |
| Scripts | `utils/scripts/sync-cardapio-web-manual-collecting.ts`, `utils/scripts/sync-org-sales-history.ts` |
| Import admin org (planilha) | `app/api/admin/organizations/route.ts` |

`TCanonicalProduct.description` (inglês) permanece; mapeamento para coluna `nome`.

---

## 7. Lib e processamento

| Item | Arquivo |
|------|---------|
| Erro de estoque | `lib/sale-processing/process-stock-deduction.ts` |
| Agente IA | `lib/ai-agent/database-tools.ts` |
| Relatórios | `lib/reports/data-fetchers.ts` (+ tipos `produtoNome`) |
| Query default sort | `lib/queries/products.ts` |

---

## 8. Frontend — modais e inputs

| Arquivo |
|---------|
| `components/Modals/Products/Blocks/General.tsx` |
| `components/Modals/Products/NewProduct.tsx` |
| `components/Modals/Products/Core/ProductCoreMenu.tsx` |
| `components/Modals/Products/ProductVinculation.tsx` |
| `components/Modals/Products/Blocks/AddOns.tsx` |
| `components/Modals/Products/AddOns/AddOnMenu.tsx` |
| `components/Inputs/SelectProductWithVariants.tsx` |
| `components/Modals/Campaigns/Blocks/FilterEditors/TopBuyersProductEditor.tsx` |
| `components/Modals/Campaigns/Blocks/Filters.tsx` |
| `components/Modals/Utils/SalesPromoCampaign/Blocks/Items.tsx` |
| `components/Modals/Purchases/Blocks/Items.tsx` |
| `components/Modals/Purchases/Blocks/Utils/NewPurchaseItem.tsx` |
| `components/Modals/CashbackPrograms/Blocks/Prizes.tsx` |

Labels UI: **DESCRIÇÃO → NOME** onde o campo é o título do produto.

---

## 9. Frontend — páginas

| Área | Arquivos |
|------|----------|
| Lista produtos | `products-page.tsx`, `ProductsInlineFilters.tsx`, `ProductsRanking.tsx` |
| Detalhe | `ProductDetailHeader.tsx`, `GeneralInformation.tsx`, `AddOnsInformation.tsx` |
| Nova venda | `new-sale-page.tsx`, `ProductCard.tsx`, `ProductBuilderModal.tsx` |
| Venda por ID / checkout | `sale-by-id-page.tsx`, `ReviewStep.tsx`, `ConfirmationStep.tsx` |
| Loja | `ProductCard.tsx`, `ProductBuilderSheet.tsx`, `CartSheet.tsx`, `OrderReviewStep.tsx` |

---

## 10. Não alterar (outros domínios)

- `descricao` em campanhas, comunidade, chats, leads, fiscal (outras tabelas), cashback program entity, etc.
- `snapshot_produto_descricao` em compras (nome histórico).
- `item.metadados.descricao` em NF-e.
- Bling `descricaoCurta` (campo da API externa).

---

## Checklist de deploy

1. Rodar migration `0020_products_descricao_to_nome.sql` no ambiente.
2. Deploy app com código atualizado (sem compatibilidade com `descricao` no contrato de produtos).
3. Rodar migration `0021_products_add_descricao.sql` e re-sincronizar catálogo CardapioWeb para preencher descrições.
