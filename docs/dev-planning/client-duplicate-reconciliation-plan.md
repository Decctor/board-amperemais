# Reconciliação de Clientes Duplicados — Plano de Implementação

> Status: **planejado** (nada em código ainda).
> Porte do Syncroniza Control (`src/server/clients/{duplicates,merge}.ts`,
> `src/server/api/routers/client-duplicates/`, `src/components/clients/duplicates/`),
> adaptado à superfície de dados do RecompraCRM.

## 1. O problema em uma frase

A base de clientes do RecompraCRM é alimentada por **doze pontos de criação independentes**
(ERP, iFood/NuvemShop/CardapioWeb, importação em massa, loja digital, ponto de interação,
webhooks do WhatsApp, sincronização de contatos SMB, vínculo de parceiro, cadastro manual),
nenhum deles com constraint de unicidade sobre telefone, e-mail ou CPF/CNPJ — a única
identidade única por organização hoje é o `whatsapp_user_id` (BSUID da Meta). O resultado é o
mesmo cliente existindo em N cadastros, cada um carregando **uma fatia do histórico de compras
e uma fatia do saldo de cashback**.

Pontos de criação hoje (todos precisam disparar redetecção):

| Origem | Arquivo |
| --- | --- |
| Cadastro manual | `app/api/clients/route.ts:413` |
| Importação em massa | `app/api/clients/bulk/route.ts:287` |
| Venda em massa | `app/api/sales/bulk/route.ts:140` |
| Ponto de interação (cliente) | `app/api/point-of-interaction/new-client/route.ts:75` |
| Ponto de interação (transação) | `app/api/point-of-interaction/new-transaction/route.ts:366` |
| Loja digital | `app/api/shop/[orgId]/orders/route.ts:301` |
| Sincronização ERP/marketplaces | `lib/data-collecting-v2/sync-auxiliary-entities.ts:202` |
| Webhook WhatsApp | `lib/whatsapp/contact-identity.ts:71` |
| Sync de contatos SMB | `lib/whatsapp/smb-contacts-sync.ts:386` |
| Sync de histórico SMB | `lib/whatsapp/smb-message-history-sync.ts:337` |
| Vínculo de parceiro | `lib/partners/link-partner-to-client.ts:107` |
| Playground do agente de IA | `lib/ai/agent/playground.ts:28` |

## 2. O que muda em relação ao Control

No Control, mesclar dois clientes é essencialmente **re-apontar chaves estrangeiras**: o valor
do cliente mora em oportunidades e projetos, que não têm agregados próprios.

No RecompraCRM, o cadastro do cliente é **o produto**: ele carrega saldo de cashback (dinheiro),
segmentação RFM, metadados de recompra que disparam campanhas, ranking de vínculo com vendedor
(carteira) e ranking de afinidade com produto. Mesclar não é só re-apontar — é **somar saldos,
consolidar ledgers e recomputar derivados**. É daí que vem o "ajustment surface" maior.

Três classes de tratamento, contra uma só no Control:

1. **Re-apontamento simples** — `UPDATE ... SET cliente_id = keeper`.
2. **Colisão de unicidade** — a linha da origem não pode simplesmente virar do keeper.
3. **Reconciliação de valor** — saldos e agregados que precisam ser somados/recomputados.

## 3. Modelo de dados

Duas tabelas novas em `services/drizzle/schema/client-duplicates.ts` (mesma forma do Control,
com `organizacaoId` no lugar de `parceiroId`), exportadas em `schema/index.ts`:

### `client_duplicate_candidates`

Par de clientes com possível duplicidade, normalizado com `cliente_a_id < cliente_b_id`.

- `id`, `organizacaoId`, `clienteAId`, `clienteBId`
- `motivos` jsonb — `TClientDuplicateReason[]`, `{ tipo, valor }`
- `status` — `PENDENTE` | `DESCARTADO` | `MESCLADO` (default `PENDENTE`)
- `descarteData`, `descarteAutorId`, `dataInsercao`, `dataAtualizacao`
- **Único** `(organizacao_id, cliente_a_id, cliente_b_id)` — é o que torna o descarte
  permanente: a redetecção usa `ON CONFLICT DO NOTHING` / `setWhere status = 'PENDENTE'`
  e nunca ressuscita um par já resolvido.
- Índices `(organizacao_id, status)`, `(organizacao_id, cliente_a_id)`,
  `(organizacao_id, cliente_b_id)`.

### `client_merge_logs`

Auditoria. Os ids de cliente são `varchar` **sem FK de propósito** — a origem deixa de existir
e o keeper pode ser mesclado de novo depois.

- `keeperClienteId`, `origemClienteId`, `candidatoId`
- `origemSnapshot` jsonb — linha completa do cliente de origem + tags + valores de campos
  personalizados + localizações + **saldos de cashback por programa**, para recuperação manual
- `camposEscolhidos` jsonb — o que a UI escolheu em cada conflito
- `registrosMovidos` jsonb — contagem por tabela
- `saldosCashback` jsonb — `{ programaId: { keeperAntes, origemAntes, keeperDepois } }`
- `autorId`, `dataInsercao`

### Índice único que falta hoje (pré-requisito)

`ampmais_cashback_program_balances` **não tem** único em `(organizacao_id, cliente_id, programa_id)`,
embora `ensureCashbackBalanceForClient` (`lib/cashback/accumulation.ts:31`) já assuma que existe
no máximo uma linha. Sem esse índice, a consolidação de saldo do merge não tem contra o que se
defender numa corrida. A migration desta feature deve:

1. deduplicar as linhas existentes (somar saldos, manter a de menor `data_adesao`);
2. criar `CREATE UNIQUE INDEX idx_cashback_balances_org_cliente_programa`.

Isso é um bug pré-existente que a feature obriga a fechar — vale como fase própria.

## 4. Detecção

`lib/clients/duplicates.ts`, espelhando `src/server/clients/duplicates.ts` do Control.

### Sinais (determinísticos, sem fuzzy matching)

| Sinal | Coluna | Normalização |
| --- | --- | --- |
| `TELEFONE` | `clients.telefoneBase` | já normalizado na escrita (`formatPhoneAsBase`) |
| `EMAIL` | `clients.email` | `lower(trim(...))` |
| `CPF_CNPJ` | `clients.cpfCnpj` | somente dígitos |
| `INSTAGRAM_USERNAME` | `clients.instagram` | minúsculo, sem `@` |

**Fora do v1, deliberadamente:**

- `whatsappUserId` — já tem único parcial por organização (`idx_clients_org_whatsapp_user_id`);
  não pode gerar par.
- `idExterno` — não é escopado por integração. Dois ERPs distintos podem emitir o mesmo id e
  gerariam par falso. Só entra se e quando `clients.idExterno` ganhar `integracaoId`.
- Similaridade de nome — a base já tem índice trigram (`idx_clients_nome`), mas nome sozinho é
  ruído. Fica para uma v2 como sinal **corroborante** (nome parecido **e** mesma cidade), nunca
  isolado.

### Dois caminhos, como no Control

- **Event-driven**: `recomputeClientDuplicatesSafely({ db, organizacaoId, clienteId })` —
  quatro lookups indexados, `.catch()` por contrato, chamado nos doze pontos de criação/edição
  da tabela em §1. Nunca falha a operação principal.
- **Varredura**: `sweepClientDuplicates()` — `INSERT ... SELECT` set-based por sinal com
  `ON CONFLICT DO NOTHING`, em `app/api/cron/sweep-client-duplicates/route.ts`
  (`assertCronAuthorized`), registrada no `vercel.json` em `30 3 * * *`. Serve de rede de
  segurança para importações e como **backfill do primeiro deploy**.
- **Recheck ao vivo**: abrir a página do cliente recomputa antes de ler, para a tela nunca
  ficar atrás do cron.

## 5. O merge — superfície completa

`lib/clients/merge.ts`, tudo em **uma transação**, com `SELECT ... FOR UPDATE` nos dois clientes
na abertura (trava contra merges concorrentes e contra edições durante o merge).

Ordem: campos escalares → colisões → agregados de valor → re-apontamento simples → candidatos →
log de auditoria → hard delete da origem → recomputação de derivados (fora da transação).

### 5.1 Re-apontamento simples

| Tabela (`ampmais_`) | Coluna | Observação |
| --- | --- | --- |
| `sales` | `cliente_id` | o histórico de compras do keeper passa a ser a união |
| `sale_items` | `cliente_id` | denormalizado por item |
| `interactions` | `cliente_id` | cadência e histórico de relacionamento |
| `chat_messages` | `cliente_id`, `autor_cliente_id` | duas colunas |
| `chat_services` | `cliente_id` | |
| `cashback_program_transactions` | `cliente_id` | ledger preservado íntegro — ver §5.3 |
| `coupon_grants` | `cliente_id` | |
| `coupon_redemptions` | `cliente_id` | ledger imutável |
| `campaign_conversions` | `cliente_id` | atribuição de receita |
| `client_locations` | `cliente_id` | |
| `partners` | `cliente_id` | parceiro vinculado ao cliente |
| `poi_transaction_requests` | `cliente_id` | |
| `tabs` | `cliente_id` | comandas |
| `ai_agent_runs` | `cliente_id` | **sem FK** (denormalizado) — o `ON DELETE` não cobre |

### 5.2 Colisões de unicidade

| Tabela | Constraint | Receita |
| --- | --- | --- |
| `chats` | único parcial `(organizacao_id, cliente_id, whatsapp_telefone_id)` | Mesma receita do Control: se o keeper já tem chat no mesmo telefone, re-parenta `chat_messages`, **encerra** o atendimento aberto do duplicado (o único parcial `idx_chat_assignments_one_current_per_chat` permite um só), re-parenta `chat_assignments`, apaga o chat da origem e **recalcula os agregados** do chat do keeper (`mensagens_nao_lidas`, `ultima_mensagem_*`, `whatsapp_janela_data_expiracao` = `greatest`). Se não colide, re-aponta. |
| `client_tag_references` | único `(cliente_id, cliente_tag_id)` | Move só as tags que o keeper ainda não tem; apaga o resto. |
| `client_custom_field_values` | único `(cliente_id, campo_id)` | Keeper vence por padrão; valor da origem preenche campo vazio do keeper. Conflito real vira escolha na UI. |
| `audience_destination_members` | único `(destino_id, cliente_id)`, **sem FK** | Se o keeper já é membro do destino, apaga a linha da origem; senão re-aponta. Os hashes `email_hash`/`telefone_hash` foram calculados a partir da origem — **marcar o destino para re-sync** (`meta-audiences-sync`), senão o público na Meta fica com o hash do cadastro que deixou de existir. |

### 5.3 Reconciliação de valor — cashback

O ponto mais delicado. Para **cada programa** em que keeper e/ou origem têm saldo:

1. `saldoValorDisponivel` → soma
2. `saldoValorAcumuladoTotal` → soma
3. `saldoValorResgatadoTotal` → soma
4. `dataAdesao` → `least(keeper, origem)` — "membro desde" é o mais antigo
5. apaga a linha de saldo da origem; re-aponta `cashback_program_transactions`

Registra em `client_merge_logs.saldosCashback` o antes/depois por programa.

**Decisões tomadas e por quê:**

- **O ledger não é reescrito.** `saldo_valor_anterior` / `saldo_valor_posterior` são *snapshots
  do momento do evento*, não uma cadeia verificável. Depois do merge a sequência lida em ordem
  não bate — e isso é correto: são dois históricos reais entrelaçados. A linha de saldo é a
  fonte da verdade; o ledger é história.
- **Nenhuma transação sintética de ajuste.** O enum `cashback_program_transaction_type`
  (`ACÚMULO`, `RESGATE`, `EXPIRAÇÃO`, `CANCELAMENTO`) não tem tipo de ajuste, e o saldo do
  keeper não "pulou": ele é a soma de dois saldos que o mesmo humano sempre teve. Auditoria
  fica no merge log. *(Alternativa, se o time preferir rastro no extrato do cliente: adicionar
  `AJUSTE_MESCLAGEM` ao enum e gravar duas linhas de valor zero. Custa uma migration de enum.)*
- **FIFO continua funcionando.** `applyCashbackRedemptionFIFO` consome `valorRestante` das
  linhas `ACÚMULO` por ordem de expiração; a união de dois ledgers ordena naturalmente.
- **Armadilha do acúmulo de parceiro.** `accumulateCashbackForClient` garante idempotência por
  `(organizacao, venda, cliente, ACÚMULO)` — e o comentário no código é explícito: comprador e
  parceiro são acúmulos legítimos distintos **na mesma venda**. Se o cadastro do comprador e o
  do parceiro forem mesclados, o keeper fica com duas linhas `ACÚMULO` para a mesma venda. O
  merge **não deve** apagar uma delas (destruiria valor real). O guard usa `findFirst`, então
  não quebra. Mas a UI de comparação deve avisar quando os dois lados têm acúmulo na mesma
  venda, porque isso quase sempre significa **que não são a mesma pessoa** — é sinal de
  descarte, não de merge.

### 5.4 Reconciliação de valor — agregados de referência

| Tabela | Constraint | Receita |
| --- | --- | --- |
| `client_seller_references` | único `(organizacao_id, cliente_id, vendedor_id)` | Soma `totalVendas` e `valorTotalVendas`, `least`/`greatest` nas datas, e **recomputa** `scoreVinculo`/`rankingVinculo` — são decay de recência, não somáveis. |
| `product_client_references` | único lógico `(produto, variante, cliente, janela)` | Soma `totalComprasQuantidade`/`totalComprasValor`, datas por `least`/`greatest`, e recomputa `rankingValor`. |

Nos dois casos a alternativa barata é **apagar as linhas do cliente mesclado e deixar o cron
noturno reconstruir** (`client-seller-references` às 02:45, `product-client-references` às 02:30).
Mais simples, mas a carteira do vendedor e o ranking de produto ficam vazios para aquele cliente
por até 24h. **Recomendação: recomputar inline**, reaproveitando as funções da §5.5.

### 5.5 Derivados do próprio cadastro do keeper

Depois do merge (fora da transação, best-effort, como o `recalcLeadScoreSafely` do Control):

| Campo | Fonte de verdade | Cron que calcula hoje |
| --- | --- | --- |
| `primeiraCompraData` / `primeiraCompraId` | `min(sales.dataVenda)` | `fix-previous-sales` |
| `ultimaCompraData` / `ultimaCompraId` | `max(sales.dataVenda)` | `fix-previous-sales` |
| `metadataTotalCompras`, `metadataValorTotalCompras` | agregação de `sales` | `enrich-clients` (02:00) |
| `metadataProdutoMaisCompradoId`, `metadataGrupoProdutoMaisComprado` | agregação de `sale_items` | `enrich-clients` |
| `metadataProdutoSugeridoId` | cross-sell | `enrich-clients` |
| `analiseRFM*` | recência/frequência/monetário | `rfm-analysis` (05:00) |

**Esse é o maior bloco de trabalho do plano** e a razão principal de a feature ser maior aqui do
que no Control. Hoje esses cálculos vivem *dentro do corpo das rotas de cron*, em lote por
organização. O merge precisa da versão **por cliente**.

Refatoração proposta — extrair, sem mudar comportamento:

- `lib/clients/recompute-purchase-metadata.ts` → `recomputeClientPurchaseMetadata({ tx, organizacaoId, clienteId })`
- `lib/clients/recompute-rfm.ts` → `recomputeClientRFM({ tx, organizacaoId, clienteId })`
- `lib/clients/recompute-seller-references.ts` → `recomputeClientSellerReferences({ tx, organizacaoId, clienteId })`
- `lib/clients/recompute-product-references.ts` → `recomputeClientProductReferences({ tx, organizacaoId, clienteId })`

Os crons passam a chamar a mesma função em loop. Ganho colateral: o cadastro deixa de depender
só da janela noturna em qualquer caminho que precise de metadados frescos.

### 5.6 Campos escalares do cadastro

Regra base do Control: **o keeper vence; campo vazio do keeper é preenchido pela origem;
`fieldChoices` força a origem** em conflitos escolhidos explicitamente na UI. Campos elegíveis:
`nome`, `email`, `telefone` (+ `telefoneBase` junto), `cpfCnpj`, `inscricaoEstadual`,
`indicadorInscricaoEstadual`, `suframa`, `anotacoes`, `websiteUrl`, `instagram`, `linkedin`,
`twitter`, `dataNascimento`, `dataFundacao`, `profissao`, `ondeTrabalha`, `estadoCivil`,
`deficiencia`, `canalAquisicao`, `idExterno`, `localizacao*`.

**Quatro campos saem da regra base:**

- `whatsappUserId` — tem único parcial por organização. Se o keeper já tem BSUID, o da origem é
  **descartado** (fica no snapshot); se o keeper está nulo, herda. Nunca "escolha do usuário":
  violaria o índice.
- `consentimentoMarketingData` (LGPD) — **nunca herda da origem.** O valor do keeper prevalece,
  inclusive quando é nulo. Motivo: a coluna é zerada na retirada de consentimento, então nulo é
  ambíguo entre "nunca consentiu" e "revogou" — e herdar o consentimento do outro cadastro
  ressuscitaria uma revogação. O documento diz que a data *é a prova de auditoria*; prova não se
  transfere entre cadastros. A UI mostra as duas datas e deixa explícito o que vai valer.
- `comunicacaoPausadaAte` — `greatest(keeper, origem)`. Opt-out é restritivo: vale o mais longo.
- `autorId` / `autorVendedorId` — imutáveis por contrato (gravados na criação). Keeper mantém
  os seus; os da origem ficam no snapshot.

### 5.7 O que o merge NÃO toca

- **Documentos fiscais.** `services/drizzle/schema/fiscal.ts` não referencia `clients` — a nota
  guarda o snapshot do destinatário no momento da emissão. Isso é correto e deve continuar:
  uma NF-e emitida é registro imutável e **não pode** ser reescrita porque dois cadastros foram
  mesclados. Se os dois lados emitiram nota com CPF/CNPJ diferentes, isso é sinal forte de que
  não são a mesma pessoa jurídica — a UI deve alertar antes de permitir o merge.
- **Resgates de cupom acima do limite.** `coupons.limiteResgatesPorCliente` tem default 1. Se
  os dois lados resgataram o mesmo cupom, o keeper passa a ter dois resgates de um cupom
  limitado a um. O ledger é imutável: **não se apaga resgate** para caber no limite. O efeito
  prático é apenas que usos futuros ficam bloqueados — que é o comportamento correto.

### 5.8 Candidatos e delete

Igual ao Control: o par mesclado vira `MESCLADO`; os demais pares `PENDENTE` que envolviam a
origem migram para o keeper (colapsando o par que virou o próprio merge); grava o merge log;
`DELETE` na origem por último — depois de todo re-apontamento, porque as FKs `ON DELETE CASCADE`
apagariam o histórico junto.

## 6. Permissão

**Decisão em aberto.** `OrganizationMemberPermissionsSchema` (`schemas/organizations.ts:549`)
tem os grupos `empresa`, `resultados`, `usuarios`, `vendas`, `compras`, `fiscal`, `atendimentos`
— **não existe grupo `clientes`**. Três caminhos:

1. **Criar `clientes: { visualizar, criar, editar, excluir, reconciliar }`** — mais coerente com
   o domínio, mas mexe no schema de permissões de toda organização (precisa de default para
   membros existentes). *Recomendado se houver apetite para a migration.*
2. **Adicionar só `clientes: { reconciliar }`** — mínimo, mas cria um grupo anêmico.
3. **Reaproveitar `empresa.editar`** — zero migration; na prática restringe a admins. *Menor
   caminho para o v1.*

Em qualquer caso, seguir a regra do Control: **ver e comparar é livre; descartar e mesclar
exigem permissão.**

## 7. API

Padrão App Router de quatro partes (`AGENTS.md` §45), `appApiHandler`,
`getCurrentSessionUncached`, envelope `{ data, message }`:

| Rota | Método | Função |
| --- | --- | --- |
| `app/api/clients/duplicates/route.ts` | `GET` | multi-modo: `?entityId=&entityType=` (pares de uma entidade, com recheck ao vivo) ou listagem paginada por cursor (`?status=PENDENTE`) |
| `app/api/clients/duplicates/comparison/route.ts` | `GET` | comparação lado a lado de um par: campos, contagens por tabela, **saldos de cashback por programa**, alertas (§5.3, §5.7) |
| `app/api/clients/duplicates/dismiss/route.ts` | `POST` | descarte permanente |
| `app/api/clients/duplicates/merge/route.ts` | `POST` | `{ pairId, keeperId, fieldChoices }` |

Cliente: `lib/queries/client-duplicates.ts` (hooks + query keys expostas) e
`lib/mutations/client-duplicates.ts` (wrappers Axios finos), tipados a partir dos
`TGet*Output` das rotas.

A comparação deve devolver contagens **por tabela relevante** — vendas, valor total comprado,
conversas, interações, cupons, comandas, e **saldo de cashback por programa**. É o que dá ao
operador base para escolher o keeper: no Control a decisão é "quem tem mais histórico"; aqui é
"quem tem mais histórico **e** onde está o dinheiro".

## 8. UI

`components/Clients/duplicates/`:

- **`ClientDuplicatePill.tsx`** — `Chip` de alerta que só renderiza quando há par pendente.
  Monta em `app/dashboard/customers/[customerId]/client-page.tsx` e na página da venda
  (`app/dashboard/sales/[saleId]`). `entityType`: `client` | `sale`.
- **`ClientReconciliationDialog.tsx`** — comparação lado a lado, escolha do keeper (default: o
  cliente da página atual), resolução de conflito campo a campo por `RadioGroup`, **bloco
  dedicado de cashback** mostrando `saldo A + saldo B = saldo resultante` por programa, e os
  alertas de §5.3/§5.7 acima do botão. Confirmação em dois passos, porque o merge é destrutivo
  e irreversível pela UI.
- **`ClientReconciliationQueue.tsx`** — fila global no cabeçalho de
  `app/dashboard/customers/clients-page.tsx`, com contagem de pendentes.

Convenções da casa: `Chip` para pills, rótulos de botão em caixa natural no JSX
(o `Button` aplica o uppercase), toasts via Sonner, mensagens em português.

## 9. Fases

| # | Entrega | Depende de |
| --- | --- | --- |
| 0 | Dedupe de `cashback_program_balances` + índice único `(org, cliente, programa)` | — |
| 1 | Schema (`client_duplicate_candidates`, `client_merge_logs`) + Zod em `schemas/clients.ts` + enums em `schemas/enums.ts` | — |
| 2 | Detecção: `lib/clients/duplicates.ts` (recompute + sweep) + cron + `vercel.json` + backfill | 1 |
| 3 | Ganchos de redetecção nos 12 pontos de criação (§1) | 2 |
| 4 | Extração das recomputações por cliente (§5.5) e adoção pelos crons existentes | — |
| 5 | `lib/clients/merge.ts` — a transação completa (§5.1–5.8) | 1, 4 |
| 6 | Rotas de API + queries/mutations | 5 |
| 7 | UI: pill, diálogo, fila | 6 |
| 8 | Permissão (§6) — pode entrar antes, se a decisão 1 for escolhida | — |

As fases 0, 1–3 e 4 são independentes entre si e podem ir em paralelo. **A fase 2 sozinha já
entrega valor**: mesmo sem merge, saber quantos duplicados existem por organização é diagnóstico
que hoje ninguém tem.

## 10. Decisões em aberto

1. **Permissão** — qual dos três caminhos da §6.
2. **Agregados de referência** (§5.4) — recomputar inline ou deixar o cron noturno reconstruir.
3. **Rastro de cashback** (§5.3) — merge log apenas, ou também `AJUSTE_MESCLAGEM` no enum de
   transação para o extrato do cliente.
4. **Merge de três ou mais** — o modelo é de pares. Mesclar A+B+C hoje são duas operações
   sequenciais (o par restante migra para o keeper automaticamente). Aceitável no v1?
5. **Desfazer** — o `origemSnapshot` permite recuperação **manual**; não há botão de desfazer.
   No Control é assim. Confirmar que serve aqui, dado que envolve dinheiro.
