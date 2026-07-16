# Vínculo e Sincronização de Catálogo — RecompraCRM ↔ iFood

> Design doc — planejamento. Nada aqui está implementado ainda.
> Contexto: o módulo de gestão iFood (`lib/integrations/ifood/`, `app/dashboard/integrations/ifood/`) já opera o catálogo remoto do iFood via API. Este documento desenha a ponte entre o **cadastro interno de produtos** do Recompra e esse catálogo remoto.

---

## 1. Problema e princípios

Hoje existem dois mundos desconectados:

| Mundo | Onde vive | O que tem |
|---|---|---|
| Cadastro interno | `products`, `product_variants`, `product_add_ons`, `product_add_on_options`, `product_add_on_references` | Produtos, variantes, add-ons, preços, estoque, fichas de produção, matéria-prima |
| Catálogo iFood | API remota (Catalog v2.0), gerenciado por `lib/integrations/ifood/catalog*.ts` | Categorias, produtos (base, sem preço), itens (vendáveis, com preço/status), option groups e options |

A correlação atual é implícita e frágil: `codigo` interno ↔ `externalCode` do iFood, usada só na ingestão de pedidos.

**Princípios do design:**

1. **Opt-in por produto** — sincronizar é uma escolha, nunca um padrão. Matéria-prima, insumos e itens internos simplesmente nunca são vinculados.
2. **Parcial por campo** — cada vínculo declara QUAIS campos sincronizam. O caso canônico: mesmo produto, preço diferente no iFood → tudo sincroniza menos `preco`.
3. **Recompra é a autoridade dos campos sincronizados** (push). Sincronização bidirecional contínua com resolução de conflito automática é uma armadilha; em vez disso: push automático Recompra→iFood + **detecção de divergência** + ação manual de "puxar do iFood" quando o usuário quiser. (Ver decisão D1.)
4. **Estado de sincronização visível** — todo vínculo tem status (`SINCRONIZADO`/`PENDENTE`/`DIVERGENTE`/`ERRO`) exibido nas duas UIs.
5. **Provider-agnóstico na fundação** — a tabela de vínculos nasce com coluna `provider` para servir Nuvemshop/Cardápio Web/futuras integrações depois, mas a v1 implementa só iFood.

---

## 2. Modelo de dados

### 2.1 Nova tabela: `catalog_links` (prefixo `ampmais_`)

Uma linha = um vínculo entre uma entidade interna e uma entidade externa, **por merchant** (iFood é multi-loja por organização — `merchantIds[]` na config).

```
catalog_links
├── id                      varchar(255) PK uuid
├── organizacao_id          FK organizations (cascade), notNull
├── provider                pgEnum catalog_link_provider: "IFOOD" (extensível)
├── merchant_id             varchar(255) notNull          -- loja do iFood
├── tipo                    pgEnum catalog_link_type:
│                             "PRODUTO" | "VARIANTE" | "ADD_ON" | "ADD_ON_OPCAO" | "CATEGORIA"
│
│  -- referência interna (uma preenchida conforme tipo; FKs para cascade)
├── produto_id              FK products (cascade), nullable
├── produto_variante_id     FK product_variants (cascade), nullable
├── produto_add_on_id       FK product_add_ons (cascade), nullable
├── produto_add_on_opcao_id FK product_add_on_options (cascade), nullable
├── grupo_interno           text nullable                 -- para CATEGORIA (products.grupo é texto, não tabela)
│
│  -- referência externa (iFood; preenchidas conforme tipo)
├── externo_produto_id      varchar(255) nullable         -- iFood product.id (base)
├── externo_item_id         varchar(255) nullable         -- iFood item.id (vendável — preço/status)
├── externo_categoria_id    varchar(255) nullable         -- categoria onde o item vive
├── externo_option_group_id varchar(255) nullable
├── externo_option_id       varchar(255) nullable
│
│  -- política de sincronização (o coração do "parcial")
├── sincronizar             jsonb TCatalogLinkSyncPolicy:
│                             { nome: bool, descricao: bool, imagem: bool,
│                               preco: bool, disponibilidade: bool }
│
│  -- estado
├── status                  pgEnum catalog_link_status:
│                             "SINCRONIZADO" | "PENDENTE" | "DIVERGENTE" | "ERRO" | "DESVINCULADO"
├── ultimo_snapshot         jsonb nullable                -- valores dos campos no último push OK (base p/ drift)
├── divergencias            jsonb nullable                -- [{ campo, valorInterno, valorExterno }] da última reconciliação
├── ultimo_erro             text nullable
├── data_ultima_sincronizacao timestamp nullable
├── autor_id                FK users (set null)
├── data_insercao / data_atualizacao
│
└── índices:
    unique (organizacao_id, provider, merchant_id, tipo, produto_id, produto_variante_id,
            produto_add_on_id, produto_add_on_opcao_id)   -- 1 vínculo por entidade+loja
    unique (organizacao_id, provider, merchant_id, externo_item_id) where not null
    index  (organizacao_id, provider, merchant_id, status)
```

**Por que tabela dedicada e não coluna `id_externo` em `products`?**
- iFood é multi-merchant: um produto interno pode vincular a N lojas com políticas diferentes.
- O vínculo carrega metadados próprios (política por campo, snapshot, status) que não cabem numa coluna.
- Não polui o cadastro com colunas específicas de provider; generaliza para as próximas integrações.
- Variantes/add-ons já têm `id_externo`, mas essas colunas ficam reservadas ao pipeline de ingestão de pedidos (data-collecting) — o vínculo de gestão vive em `catalog_links` para não conflitar com os ids do Cardápio Web/Nuvemshop que já ocupam esses campos.

### 2.2 Preferências da organização

Novo bloco em `organizations.configuracao.preferencias` (padrão `sessoesVenda`/`carteirasClientes`, com `.default()`):

```ts
sincronizacaoCatalogo: {
  habilitado: boolean,               // liga o recurso na org (default false)
  padraoCampos: TCatalogLinkSyncPolicy, // política default pré-preenchida ao criar vínculos
  pushAutomatico: boolean,           // push on-save (default true quando habilitado)
}
```

Sem flag global de "sincronizar tudo": a unidade de opt-in é sempre o vínculo.

### 2.3 Schemas Zod

- `schemas/catalog-links.ts`: `CatalogLinkSyncPolicySchema`, `CatalogLinkSchema` + tipos.
- Enums (`CatalogLinkProviderEnum`, `CatalogLinkTypeEnum`, `CatalogLinkStatusEnum`) em `schemas/enums.ts`; pgEnums em `services/drizzle/schema/enums.ts` (convenção do repo).

---

## 3. Mapeamento de entidades Recompra ↔ iFood

| Recompra | iFood | Observações |
|---|---|---|
| `products` (flat) | `product` (base) + `item` (na categoria) | Nome/descrição/imagem no product; **preço e disponibilidade no item** — por isso o vínculo PRODUTO guarda os dois ids. `codigo` → `externalCode`. |
| `products.precoVenda` | `item.price.value` | Campo com opt-out mais comum (política `preco: false` + preço gerido direto na aba Catálogo). |
| `products.ativo` / pausa | `item.status` AVAILABLE/UNAVAILABLE | Política `disponibilidade`. |
| `products.grupo` (texto) | `category` | Vínculo tipo CATEGORIA mapeia grupo→categoryId. Criada on-demand no publish se não existir. |
| `product_add_ons` (min/max) | `optionGroup` | `minOpcoes`/`maxOpcoes` ↔ min/max do grupo. |
| `product_add_on_options` (precoDelta, codigo) | `option` (price, externalCode) | `precoDelta` → `option.price.value`. |
| `product_add_on_references` | associação item↔optionGroup | Feita no `upsertIfoodItem` (payload composto). |
| `product_variants` | — (sem conceito nativo) | **Fase posterior.** Duas estratégias possíveis (decisão D2): (a) cada variante vira um item/produto próprio no iFood; (b) o eixo (ex.: Tamanho) vira um optionGroup obrigatório (min=max=1) com as variantes como options e `precoDelta` relativo. |
| Estoque/lotes/produção | — | Fora de escopo. Estoque zerado pode, no máximo, disparar `disponibilidade` (fase futura, opt-in). |

---

## 4. Fluxos

### 4.1 Vincular (existente ↔ existente)

Assistente na UI: dado um item do iFood (ou um produto interno), sugere correspondências por `codigo ↔ externalCode` (match forte) e por similaridade de nome (match fraco, requer confirmação). Cria o `catalog_link` com a política default da org, status `PENDENTE`, e roda a primeira reconciliação (que marca `SINCRONIZADO` ou `DIVERGENTE` com o diff por campo — o usuário escolhe "aplicar do Recompra" ou "manter como está e desmarcar o campo").

### 4.2 Publicar (Recompra → iFood, criação)

A partir do produto interno: escolhe merchant + categoria (ou cria pela API), o serviço cria `product` + `item` (payload composto do `upsertIfoodItem`), publica add-ons vinculados como optionGroups/options, grava os `catalog_links` (PRODUTO + ADD_ON/ADD_ON_OPCAO) e o snapshot. Imagem: sobe `imagemCapaUrl` via `uploadIfoodImage` quando política `imagem: true`.

### 4.3 Importar (iFood → Recompra, criação)

A partir de um item do iFood não vinculado: cria o produto interno (nome/descrição/codigo=externalCode/preço/grupo=categoria) e add-ons correspondentes, grava os vínculos. Reusa a mecânica de upsert provada em `nuvemshop/catalog-sync.ts`, mas escrevendo vínculos em `catalog_links` em vez de depender de `id_externo`.

### 4.4 Push contínuo (on-save)

Hook no serviço de update de produto (`app/api/products/route.ts`, PUT): após o commit da transação, para cada `catalog_link` ativo do produto/add-ons afetados, compara os campos com política ligada contra `ultimo_snapshot`; se mudou, agenda push (ver 4.6). Nome/descrição/imagem → `updateIfoodProduct`; preço/status → `patchIfoodItem` (individual) ou batch por `externalCode` quando muitos. Sucesso atualiza snapshot + `SINCRONIZADO`; falha marca `ERRO` com `ultimo_erro` (sem quebrar o save do produto — o push é assíncrono/best-effort).

### 4.5 Reconciliação (cron)

Novo cron `app/api/cron/ifood-catalog-reconciliation` (padrão `assertCronAuthorized`, diário): para cada org com iFood + recurso habilitado, lê o catálogo remoto (categorias com itens + optionGroups), compara com os vínculos:

- Campo sincronizado divergente → **re-push** (Recompra é autoridade) se `pushAutomatico`, senão marca `DIVERGENTE` com o diff.
- Campo NÃO sincronizado divergente → só registra em `divergencias` (informativo na UI, sem ação).
- Entidade externa sumiu (deletada no Portal) → status `ERRO`/`DESVINCULADO` + aviso.
- Rate limit: usar leituras agregadas (categorias já retornam itens) e batches; espaçar por org.

### 4.6 Execução assíncrona

O push on-save não pode segurar a resposta do PUT de produto. Opções: (a) `after()`/fire-and-forget com try/catch marcando `ERRO` no link (simples, suficiente p/ v1 — a reconciliação diária cobre perdas); (b) fila em tabela (outbox) processada por cron a cada N minutos (mais robusto, fase posterior se necessário). **Recomendação: (a) na v1.**

---

## 5. Arquitetura de código

```
lib/integrations/ifood/sync/
├── links.ts          -- CRUD de catalog_links (org-scoped), resolução por entidade/externo
├── matching.ts       -- sugestões de vínculo (codigo ↔ externalCode, nome)
├── publish.ts        -- fluxo 4.2 (Recompra → iFood, criação + vínculos)
├── import.ts         -- fluxo 4.3 (iFood → Recompra, criação + vínculos)
├── push.ts           -- fluxo 4.4 (diff por política + chamadas de escrita + snapshot)
├── reconcile.ts      -- fluxo 4.5 (leitura remota, diff, re-push/divergência)
└── types.ts          -- TCatalogLinkSyncPolicy, payloads de diff/snapshot
```

- Reusa integralmente `catalog.ts`/`catalog-items.ts`/`image.ts` (escritas) e `resolveIfoodManagementContext`.
- **Não toca** em `lib/data-connectors/` (ingestão de pedidos permanece intacta e continua matching por `codigo` — os vínculos podem, em fase futura, melhorar esse matching).

### Rotas API (padrão 4 partes + permissões de integração)

```
app/api/integrations/ifood/sync/links/route.ts       GET (lista por produto/merchant/status) / POST (vincular) /
                                                     PATCH (política/campos) / DELETE (desvincular)
app/api/integrations/ifood/sync/suggestions/route.ts GET (sugestões de match p/ um merchant)
app/api/integrations/ifood/sync/publish/route.ts     POST (publicar produto interno no iFood)
app/api/integrations/ifood/sync/import/route.ts      POST (importar item do iFood p/ o Recompra)
app/api/integrations/ifood/sync/reconcile/route.ts   POST (reconciliação manual de um merchant)
app/api/cron/ifood-catalog-reconciliation/route.ts   GET (cron diário)
```

Permissões: leitura `canViewIntegrations`; escrita `canManageIntegrations`. Import/publish também exigem permissão de produtos (criam registros no cadastro).

---

## 6. UI

### 6.1 Página do produto (`app/dashboard/commercial/products/id/[id]`, aba CADASTRO)

Nova seção **"Canais de venda"** (mesmo padrão `SectionApplyBar` das demais):
- Por merchant iFood: estado do vínculo (badge SINCRONIZADO/DIVERGENTE/ERRO/—), toggles por campo (nome, descrição, imagem, preço, disponibilidade), ações **Publicar no iFood** / **Vincular a item existente** / **Desvincular**.
- Quando `DIVERGENTE`: painel de diff por campo com ações "Aplicar do Recompra" / "Manter e parar de sincronizar este campo".

### 6.2 Aba Catálogo do iFood (`app/dashboard/integrations/ifood`)

- Badge "Vinculado" nos `ItemRow`/option groups vinculados (com link para o produto interno).
- Em itens não vinculados: ações **Importar para o Recompra** / **Vincular a produto existente** (abre o assistente com sugestões).
- Aviso visual quando o item vinculado tem política `preco: false` (preço gerido só ali).

### 6.3 Visão geral de sincronização

Card na página do iFood (ou na Visão geral): contadores de vínculos por status + lista de pendências/erros da última reconciliação.

---

## 7. Fases de implementação

1. **Fundação de vínculos** — tabela `catalog_links` + enums + schemas; `sync/links.ts` + `matching.ts`; rotas `links`/`suggestions`; badges de vínculo na aba Catálogo; seção "Canais de venda" (somente estado + vincular/desvincular manual). Sem push ainda.
2. **Publicar + Importar** — `publish.ts`/`import.ts` + rotas + ações nas duas UIs; primeira reconciliação no ato do vínculo (status/diff).
3. **Push on-save + reconciliação** — hook no PUT de produtos, `push.ts`, `reconcile.ts`, cron diário, painel de divergências, preferências da org (`sincronizacaoCatalogo`).
4. **Variantes e refinamentos** — estratégia de variantes (decisão D2), disponibilidade por estoque (opt-in), outbox se o fire-and-forget se mostrar insuficiente, extensão do `provider` para Nuvemshop/Cardápio Web.

## 8. Decisões em aberto

- **D1 — Autoridade**: o design assume Recompra como fonte da verdade dos campos sincronizados (push + pull manual). Alternativa seria autoridade por campo configurável (ex.: preço com autoridade iFood sincronizando para dentro). Adiciona bastante complexidade — proposta: fica de fora até haver demanda real; o opt-out por campo + gestão direta na aba Catálogo cobre o cenário citado (preço diferente no iFood).
- **D2 — Variantes**: item próprio por variante vs optionGroup de eixo. Impacta preço (absoluto vs delta) e relatórios do iFood. Decidir na fase 4 com casos reais.
- **D3 — Deleção**: excluir produto interno vinculado → desvincular apenas (deixar no iFood) ou perguntar se remove lá também? Proposta: nunca deletar no iFood automaticamente; marcar `DESVINCULADO` e avisar.
- **D4 — Categorias**: v1 vincula categoria só como apoio do publish (achar/criar a categoria alvo). Sincronizar renomeações de `grupo` → categoria fica para depois (grupo é texto livre, N:1 com categorias).

## 9. Riscos e mitigação

- **Payloads de escrita do iFood ainda em validação ao vivo** (PUT /items composto, patches de options) — a fase 2 do sync depende deles; validar na sandbox antes (loja de teste já conectada).
- **Rate limit** na reconciliação de catálogos grandes → leituras agregadas, batches por `externalCode`, espaçamento por org no cron.
- **`codigo` não-único entre produto flat e variante** — o matching assistido deve consultar `products.codigo` E `product_variants.codigo` (mesma precaução do `sync-auxiliary-entities`).
- **Catálogo V1 no iFood** — sync exige V2 (o banner de upgrade já existe na aba Catálogo); vínculos bloqueados enquanto V1.
