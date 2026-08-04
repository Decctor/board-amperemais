# Homologação do módulo Catalog do iFood — plano de correção

> **Documento temporário.** Existe para guiar a implementação e deve ser apagado quando o último bloco
> for entregue. Não é referência de longo prazo — o que sobreviver vira comentário no código ou entra
> em `CLAUDE.md`.

Critérios oficiais: <https://developer.ifood.com.br/pt-BR/docs/guides/modules/catalog/homologation>

---

## 1. Diagnóstico — onde estamos

O módulo (`lib/integrations/ifood/`, `app/api/integrations/ifood/catalog/`,
`app/dashboard/integrations/ifood/_module/catalog/`) cobre a base do catálogo, mas reprova em cinco
frentes do checklist de homologação.

| Critério iFood | Situação |
| --- | --- |
| Categorias (`POST /categories`) | ✅ `createIfoodCategory` + UI |
| Item simples (`PUT /items`) | ✅ `upsertIfoodItem` + `NewIfoodProduct` |
| Listar catálogos e itens | ✅ `getIfoodCatalogs` + `listIfoodCategories(includeItems)` |
| Grupos de complementos com preço e `min`/`max` | ⚠️ leitura e edição parciais; sem criação, sem min/max |
| Vincular grupos ao item | ❌ `optionGroups: []` fixo no `FullItemDto` |
| Pizza (`SIZE`/`CRUST`/`EDGE`/`TOPPING`) | ❌ ausente |
| Combo | ❌ ausente |
| Preço/status em lote | ⚠️ API existe, sem UI |
| `contextModifiers` (preço/status por canal) | ❌ ausente |
| Programação de disponibilidade do item | ❌ ausente |
| Multi-catálogo | ✅ seletor na UI |
| Validação de payload (título ≤100, desc ≤500, status enum) | ❌ ausente |
| Tratamento de erro com mensagem compreensível | ⚠️ parcial (sem 409, sem `error.code`) |
| Retry com backoff | ❌ inexistente |
| Multi-idioma (pt-BR / es-CO / en-US) | ❌ — **fora de escopo** (operação só BR) |

### Decisões de escopo

1. **Pizza e combo entram.** São condicionais ("se aplicável") na doc, mas a base de clientes tem
   pizzaria; sem isso a homologação teria de ser refeita.
2. **Multi-idioma fica fora.** Só se aplica a operação fora do Brasil.
3. **O lote opera sobre itens do iFood, standalone.** Não depende de `catalog_links`
   (ver `docs/ifood-catalog-linking-sync-design.md`, ainda não implementado). A UI é modelada para
   que o vínculo com o cadastro interno seja plugado depois sem retrabalho.
4. **O catálogo ganha rota própria**: `/dashboard/integrations/ifood/catalog`. A página de
   integrações vira hub de conexão, status, horários e pedidos.

---

## 2. Workstream A — API e biblioteca

| # | Item | Arquivos | Bloco |
| --- | --- | --- | --- |
| A1 | Vincular grupos de complementos ao item (`optionGroups`/`options` no `FullItemDto`) | `lib/integrations/ifood/catalog-items.ts` | 2 |
| A2 | `POST /optionGroups` + `min`/`max` em leitura e escrita | `catalog-items.ts`, `catalog-types.ts`, `catalog/option-groups/route.ts` | 2 |
| A3 | `contextModifiers` no item (preço/status por canal) | `catalog-items.ts`, `catalog-types.ts`, `catalog/items/route.ts` | 4 |
| A4 | Disponibilidade programada do item | idem — **spike antes** | 5 |
| A5 | Pizza e combo (template de categoria + estruturas) | `catalog.ts`, `catalog-types.ts` — **spike antes** | 6 |
| A6 | Validações: título ≤100, descrição ≤500, `status` como enum | rotas de catálogo + `schemas/enums.ts` | 1 |
| A7 | Retry com backoff exponencial + jitter; nunca em 4xx | `lib/data-connectors/ifood/client.ts` | 1 |
| A8 | 409 CONFLICT e leitura do `error.code` estruturado | `lib/integrations/ifood/errors.ts` | 1 |
| A9 | Chunking do lote + polling do `batchId` até estado final | `catalog.ts`, `catalog/products/batch/route.ts` | 3 |

### Notas de implementação

**A6 — enums.** Os valores `AVAILABLE`/`UNAVAILABLE` são vocabulário do iFood viajando para a API
deles, não dado nosso. Ficam em inglês, contrariando a regra de "enum em PT SCREAMING_CASE" do
`CLAUDE.md` — que vale para o domínio da casa, não para o contrato de terceiro. Vivem em
`schemas/enums.ts` como `IfoodCatalogStatusEnum`.

**A7 — o client é compartilhado.** `createIfoodClient` serve catálogo, pedidos e polling de eventos.
O interceptor de retry beneficia os três. Regras: retry em 429, 5xx e erro de rede/timeout; nunca em
4xx (exceto 429); respeitar `Retry-After` quando presente; backoff exponencial com jitter; teto de
tentativas baixo (3) porque a chamada acontece dentro de um request do usuário.

**A4 e A5 exigem spike.** Os endpoints de pizza/combo e de disponibilidade programada não estavam na
página de homologação. Confirmar na referência da Catalog v2.0 antes de escrever código — chutar
caminho de API é como se perde a reunião.

---

## 3. Workstream B — UI/UX

Brief completo produzido via `$impeccable shape`. Resumo operacional:

### Rota e layout

Rota nova `/dashboard/integrations/ifood/catalog`, master-detail em duas colunas:

- **Esquerda (~260px)**: catálogo selecionado, lista de categorias com contagem e status, ação de
  nova categoria.
- **Direita**: itens da categoria ativa em **tabela densa** (checkbox, imagem 32px, nome +
  descrição, código externo, preço, status, ação). Não é card grid — cards para 80 itens de
  cardápio é a resposta preguiçosa, e o `CategoryCard` atual ainda aninha card dentro de card
  (proibido pelo DESIGN.md).
- **Barra de seleção ancorada** (`components/ui/action-toolbar.tsx`): sobe do rodapé ao marcar o
  primeiro item. Contagem, "Alterar preço", "Alterar status", "Limpar seleção". É o que substitui um
  modal de lote.
- **Editor de item** em `ResponsiveMenuV2` `lg` com abas: *Geral* · *Complementos* · *Canais* ·
  *Disponibilidade*. Diálogo no desktop, drawer no mobile — padrão da casa.

Abaixo de `lg`: coluna de categorias vira seletor horizontal com scroll; tabela vira lista de linhas.

### Direção visual

- **Estratégia de cor: Restrained.** Azul Primário carrega seleção, foco e ação primária. Âmbar fica
  reservado ao aviso de catálogo V1 e ao estado "lote em andamento" — nada além (razão 1:3).
- Status migram de `emerald-500`/`red-600` crus para os tokens `--color-success` /
  `--color-destructive` (regra de paleta fechada do DESIGN.md).
- Motion 150–250ms, ease-out. A barra de seleção desliza; o resto é crossfade.
  `prefers-reduced-motion` troca por transição instantânea.

### Estados obrigatórios

| Estado | O que o usuário vê |
| --- | --- |
| Sem categoria | Explica o que é categoria e oferece criar a primeira |
| Categoria vazia | Ação de adicionar item, com o nome da categoria na frase |
| Carregando | Skeleton de linhas, nunca spinner central |
| Catálogo V1 | Faixa âmbar existente, preservada |
| Lote enviado | Progresso com polling do `batchId`: `ENVIADO → PROCESSANDO → CONCLUÍDO / ERRO` |
| Lote parcial | Lista os itens que falharam com o motivo; sucesso não trava no erro alheio |
| Erro de validação | Inline no campo, antes de sair da tela — nunca só toast |
| Erro do iFood | Toast com mensagem mapeada em PT; 409 e 429 com texto próprio |
| Sem permissão | Tudo em leitura; ações somem, não ficam desabilitadas mudas |

### Interação

- Preço inline (já existe): clique no valor, `Enter` salva, `Esc` cancela.
- Status: toggle na linha, otimista, com reversão em erro.
- Seleção: checkbox por linha, "todos da categoria" no cabeçalho, `Shift+clique` para intervalo.
- Lote de preço: popover com **valor fixo** ou **ajuste percentual** (o lojista quer "aumenta 5%").
- Lote de status: aplica direto, com confirmação na barra.
- Complementos: escolher grupo existente ou criar ali mesmo (nome, min, max, opções). Validação
  cruzada `min ≤ max`; `min ≥ 1` marca o grupo como obrigatório com aviso explícito.
- Pizza/combo: o template é escolhido **na categoria**, não no item. Categoria `PIZZA` exige os
  quatro grupos e muda a forma do editor de item dentro dela.

### Microcopy que precisa nascer

- `min`/`max`: "Mínimo de escolhas" / "Máximo de escolhas" + hint "0 no mínimo torna o grupo opcional".
- Canais: "Preço e disponibilidade por canal" + "em branco herda o preço padrão".
- Disponibilidade: "Fora dos horários marcados o item some do cardápio" (confunde-se com pausa da loja).
- Lote: "N itens serão atualizados no iFood. A alteração pode levar alguns segundos para aparecer no app."
- Contador de caracteres visível ao passar de 80/100 no título e 400/500 na descrição.

### Faixas reais de dado

1–15 categorias; 5–80 itens por categoria; até ~600 itens no catálogo. Tabela aguenta 600 linhas com
paginação por categoria, sem virtualização obrigatória.

---

## 4. Ordem de entrega

| Bloco | Conteúdo | Por quê nessa ordem |
| --- | --- | --- |
| **1** | A6 + A7 + A8 | Baratos, tocam o módulo inteiro, fecham três critérios de qualidade |
| **2** | A1 + A2 + UI de complementos | A lacuna que reprova direto no checklist |
| **3** | Rota nova + tabela + A9 + UI de lote | Maior bloco de UI; tira o lote do "só curl" |
| **4** | A3 + aba Canais | `contextModifiers` |
| **5** | Spike + A4 + aba Disponibilidade | Depende de confirmação de endpoint |
| **6** | Spike + A5 + pizza e combo | Maior escopo, único condicional |

## 5. Questão em aberto

Em **canais** (`contextModifiers`): expor todos os contextos que o merchant devolver, ou fixar em
`DELIVERY` e `INDOOR`? Muda a aba de seletor dinâmico para dois campos fixos. Resolver com o retorno
real de `GET /catalogs` durante o bloco 4.
