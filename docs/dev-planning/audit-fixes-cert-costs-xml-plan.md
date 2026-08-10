# Plano — Certificado fiscal privado, custos discriminados na compra, importação por XML

Três ajustes levantados em auditoria, planejados sobre o estado real do código (referências verificadas em 2026-08).

---

## 1) Certificado fiscal em URL pública — correção de segurança

### Estado atual (verificado)

- O upload do certificado A1 (`.pfx`) roda **no browser**, com a anon key, pelo helper genérico `uploadFile` (`app/dashboard/fiscal/fiscal-page.tsx:1096-1100` → `lib/files-storage/index.ts:147-172`). O arquivo cai no bucket **público** `files`, em `public/syncrono/(<orgId>)certificado_fiscal_... - <datetime>`, e `getPublicUrl` é chamado (`index.ts:161`) — a URL pública existe e é derivável.
- O único cliente Supabase do repo usa a anon key (`services/supabase/index.ts:1-7`). **Não existe service-role key em lugar nenhum.** Não há bucket privado.
- `POST /api/fiscal/company/sync-certificate` aceita um `storagePath` **arbitrário** do cliente (`app/api/fiscal/company/sync-certificate/route.ts:8-17`) — sem validar que o path pertence à org.
- A senha do certificado é aceita pelo schema persistido (`schemas/fiscal.ts:76`), o `PUT /api/fiscal/settings` persiste `fiscalConfiguracao` verbatim (`lib/fiscal/settings.ts:74-82`) e a UI pré-preenche a partir dela (`fiscal-page.tsx:1089`) — ou seja, a senha pode acabar em JSONB plaintext. Já era item pendente em `docs/FISCAL-ALL-IN-ONE-AUDIT.md:473`.
- XML/DANFE fiscais já são "privados por disciplina" (download server-side + rota autenticada `app/api/fiscal/document-assets/route.ts`), mas os objetos ainda moram no bucket público sob `public/organizations/fiscal/` — a URL crua é alcançável (já apontado em `docs/reviews/fiscal-module-review-2026-07.md:137`).

### Plano

**1.1 Infra (Supabase dashboard — não versionado no repo):**
- Criar bucket **`private-files`** (public = false).
- Criar env server-only `SUPABASE_SERVICE_ROLE_KEY` (Vercel + `.env` local, sem prefixo `NEXT_PUBLIC_`).

**1.2 Cliente admin server-only:**
- `services/supabase/admin.ts` exportando `supabaseAdminClient` com a service-role key + `import "server-only"` para impedir bundle no cliente.

**1.3 Novo fluxo de upload do certificado (mata dois problemas de uma vez):**
- Nova rota `POST /api/fiscal/company/certificate` (App Router, `appApiHandler`): recebe `{ fileBase64, password }`, exige sessão + `permissoes.fiscal.configurar`, valida tamanho/extensão, faz upload **server-side** para `private-files` em path determinístico `organizations/{orgId}/fiscal/certificado.pfx` (upsert), e chama `syncFiscalCompanyCertificate` na mesma request.
- Remove o upload browser→bucket público e remove o `storagePath` arbitrário vindo do cliente (a rota `sync-certificate` atual é absorvida/aposentada).
- `lib/fiscal/storage.ts`: `downloadStoredFiscalAsset` passa a usar `supabaseAdminClient` + bucket privado para o certificado (o Spedy recebe o buffer via multipart, como hoje — `lib/fiscal/providers/spedy/company.ts:200-209` não muda).

**1.4 Senha nunca persistida:**
- Remover `password` do `FiscalCertificateMetadataSchema` persistido (ou `.omit()` antes de gravar em `lib/fiscal/settings.ts` nos dois caminhos de escrita: sync-certificate e settings PUT).
- UI para de pré-preencher a senha; ela vira write-only (digitada → enviada ao provider → descartada).

**1.5 Migração dos certificados existentes:**
- Script em `scripts/` (service-role): para cada org com `fiscalConfiguracao.spedy.certificado.storagePath` no bucket público → copiar para o path privado novo, atualizar o JSONB, deletar o objeto público. Logar orgs migradas.

**1.6 Mover XML/DANFE fiscais para o bucket privado (aproveitando a infra):**
- `lib/fiscal/storage.ts` e `lib/fiscal/inbound` passam a gravar/ler no `private-files` (a rota proxy autenticada já existe; só muda o backend de storage). Script de migração dos objetos existentes.

**1.7 Inventário do restante (decidido, não é escopo deste plano executar tudo):**

| Conteúdo | Hoje | Veredito |
|---|---|---|
| Imagens de produto, logo/capa da org, thumbnails de curso, marketing, instalador do desktop agent, headers de convite (WhatsApp exige URL pública) | público | **fica público** (correto) |
| Avatares de usuário/vendedor/parceiro | público | fica público (aceitável; revisitar no plano LGPD) |
| Extratos bancários (OFX/CSV) — `bank-statements`, já lidos server-side | público | **mover para privado junto com este trabalho** (mudança pequena: upload já podia ser server-side na rota de import) |
| Mídia de chat/WhatsApp (PII de cliente) | público | backlog: envolve URLs consumidas pelo gateway WhatsApp; usar `getChatMediaSignedUrl` (já existe, sem callers — `lib/files-storage/chat-media.ts:98-107`) para a UI e manter público só o estritamente necessário ao envio |
| Imagens de relatório financeiro, materiais da comunidade | público | backlog (mesma receita: bucket privado + rota proxy) |

---

## 2) Frete, IPI, ICMS-ST e despesas acessórias no custo da compra

### Estado atual (verificado)

- `purchase_items` só tem `descontosTotal` e `acrescimosTotal` como modificadores (`services/drizzle/schema/purchases.ts:96-97`). `purchases` não tem **nenhuma** coluna monetária; o total da compra é o `valor` flat do lançamento contábil (`purchases.lancamentoContabilId` → `accountingEntries.valor`, `financial.ts:111`), com um par único débito/crédito.
- **O ponto de alavanca do custo**: `resolveUnitCost = valorUnitarioLiquido ?? valorUnitarioBruto` (`lib/purchase-processing/process-purchase-item-stock.ts:172-174`) alimenta a média móvel de `products.precoCusto` (`:573-588`), que alimenta valuation de produção, custo de venda, margem de relatórios e descarte de lote. **Se o líquido do item absorver frete/impostos, todo o downstream ganha landed cost sem mudança.**
- A matemática do item é client-side em `normalizeItemValues` (`components/Modals/Purchases/Blocks/Items.tsx:727-746`); o servidor persiste verbatim e não recomputa nada.
- Frete só existe como aviso read-only no import por IA (`app/api/purchases/import-composition/route.ts:95-96`).
- Gap correlato: em compra RECEBIDA, o guard de itens congela só produto/quantidade (`app/api/purchases/route.ts:447-469`) — preços podem mudar silenciosamente sem reprocessar estoque.

### Modelo de dados proposto

**2.1 Modificadores de custo em JSONB** (mesmo padrão de `modificadoresMetadata` em `financialTransactions` — `schemas/financial.ts:196-202`, normalizado por `lib/finances/financial-transaction-value`):

Schema compartilhado em `schemas/purchases.ts` (chaves em `schemas/enums.ts`):

```typescript
export const PurchaseCostModifierKeyEnum = z.enum(["FRETE", "SEGURO", "IPI", "ICMS_ST", "DESPESA_ACESSORIA", "OUTRO"]);
export const PurchaseCostModifierSchema = z.object({
	chave: PurchaseCostModifierKeyEnum,
	valor: z.number({ ... }).nonnegative(),
	descricao: z.string({ ... }).optional().nullable(),      // obrigatória quando chave === "OUTRO"
	origem: z.enum(["DOCUMENTO", "RATEIO", "MANUAL"]).optional().nullable(),
});
```

- **`purchases.custos_adicionais`** → `custosAdicionais: jsonb().$type<TPurchaseCostModifier[]>()` — os valores do documento, antes do rateio (`origem: "DOCUMENTO"` quando vêm do XML/extração, `"MANUAL"` quando digitados). Guardar no header preserva o que o documento diz e permite re-ratear quando itens mudam.
- **`purchase_items.modificadores_custo`** → `modificadoresCusto: jsonb().$type<TPurchaseCostModifier[]>()` — a parcela do item (`origem: "RATEIO"` quando rateada do header; `"DOCUMENTO"` quando o XML traz o valor destacado por item — `vIPI`/`vICMSST`/`vFrete` de `det[]`).

Nova fórmula do líquido (única mudança de semântica — `acrescimosTotal` vira "outros acréscimos"):

```
valorTotalLiquido = valorTotalBruto − descontosTotal + acrescimosTotal + Σ modificadoresCusto[].valor
valorUnitarioLiquido = valorTotalLiquido / quantidade
```

**Regra de ouro**: `valorTotalLiquido`/`valorUnitarioLiquido` continuam colunas escalares persistidas — o downstream de custo (`resolveUnitCost`, média móvel, valuation) **nunca parseia o JSONB**. O JSONB é detalhe/proveniência; o escalar é o contrato. Relatório agregado por tipo de custo (ex.: "frete no mês") sai das linhas contábeis (2.4), não do JSONB.

**2.2 Lib de normalização `lib/purchase/cost-modifiers.ts`** (espelho de `financial-transaction-value`):
- `sumCostModifiers(mods)`, `normalizeCostModifiers(mods)` (dedupe de chave — no máximo um modificador por chave exceto `OUTRO`, drop de valores zero/negativos), validação `descricao` para `OUTRO`.

**2.3 Lib de rateio `lib/purchase/cost-allocation.ts`** (mesma função no client e no server, para não haver drift):
- `apportionPurchaseHeaderCosts({ custosAdicionais, items })` — rateio proporcional a `valorTotalBruto`, com distribuição de resto por maior-resíduo (centavos fecham exato com o header); produz os `modificadoresCusto` de cada item preservando `chave`.
- `computePurchaseItemTotals(item)` — a fórmula acima (substitui a matemática inline de `normalizeItemValues`).
- Servidor passa a **recomputar/validar** líquidos no create/update em vez de persistir verbatim.

**2.4 Lançamento contábil — `accounting_entry_lines` (partidas dobradas de verdade):**

Em vez de uma tabela auxiliar de componentes da compra, o primitivo correto e genérico: **linhas de lançamento (journal lines)**, substituindo o par flat `idContaDebito`/`idContaCredito` em todas as origens (compras, vendas, transferências, conciliação, perdas de estoque, lançamentos manuais).

Nova tabela `ampmais_accounting_entry_lines`:

```
id                      varchar(255) uuid
organizacao_id          FK → organizations
lancamento_contabil_id  FK cascade → accounting_entries
conta_contabil_id       FK → accounts_charts
natureza                pgEnum accountingEntryLineNatureEnum: "DEBITO" | "CREDITO"   (schema/enums.ts)
valor                   numeric(14, 2) notNull
valor_previsto          numeric(14, 2) nullable
chave                   varchar nullable      — classificação estável: "MERCADORIA" | "FRETE" | "IPI" | "ICMS_ST" |
                                                "DESPESA_ACESSORIA" | "PRINCIPAL" | "JUROS" | "MULTA" | "TAXAS" | ...
descricao               varchar nullable
ordem                   integer notNull default 0
metadados               jsonb nullable        — proveniência (ex.: compraId, regra de rateio)
data_insercao           timestamp defaultNow
```

Invariantes (validadas em app-level junto de `assertAccountingEntryIsBalanced`, dentro da transaction):
- `Σ DEBITO === Σ CREDITO` (lançamento balanceado);
- `Σ DEBITO === entry.valor` — **`accountingEntries.valor` permanece como total do header**: todo o maquinário de settlement (`financialTransactions`, parcelas, balance check) e os relatórios continuam lendo o escalar sem mudança.

Notas de design:
- `chave` é a superfície de relatório por natureza de custo (`SELECT sum(valor) WHERE chave = 'FRETE'`) — é o que devolve a discriminação que os "components" dariam, mas genérica para qualquer origem.
- `numeric(14,2)` para as linhas (dinheiro exato); comparações contra o `valor` doublePrecision do header arredondando a 2 casas.
- **Nuance contábil da capitalização**: como IPI/ST/frete entram no custo do estoque (landed cost), o template padrão da compra debita **tudo na mesma conta de mercadoria/estoque, em linhas separadas discriminadas por `chave`** — o relatório por tipo funciona via `chave`, e a org que quiser frete em conta própria configura o mapa chave→conta nas settings. Isso mantém a contabilidade coerente com a capitalização sem forçar split de contas.

**Migração em fases** (blast radius mapeado: ~27 arquivos tocam `idContaDebito`/`idContaCredito` — purchases, sale-processing (confirmação/cancelamento/POS/canais gerenciados), tabs, sessões de caixa, fatura de cartão, transferências, conciliação, recorrências, descarte de lote, DRE/stats, UI de lançamentos):

- **Fase A — schema + backfill**: criar a tabela; backfill de cada lançamento existente em 2 linhas (`DEBITO` na `idContaDebito`, `CREDITO` na `idContaCredito`, `valor = entry.valor`, `chave = "PRINCIPAL"`). Colunas legadas permanecem.
- **Fase B — dual-write via helper único**: `lib/finances/accounting-entry-lines.ts` com `buildDefaultLines({ idContaDebito, idContaCredito, valor })` e `syncEntryLines(trx, entryId, lines)`; todos os writers passam a gravar linhas (mudança mecânica, um call site por origem). Colunas legadas continuam preenchidas (derivadas da maior linha de cada natureza) para não quebrar readers.
- **Fase C — readers migram**: DRE (`app/api/finances/analytics/dre/route.ts`), stats, página de lançamentos, modais/state hook de lançamento manual. O DRE melhora de graça: agrega por `conta + natureza` das linhas em vez do par do header.
- **Fase D — aposentar legado**: `idContaDebito`/`idContaCredito` viram nullable e depois caem; o Zod aceita o par simples apenas como açúcar de input que sintetiza 2 linhas.

**UI — abstrair a complexidade com defaults (o "catch")**:
- **Modo simples (default, ~95% dos casos)**: o bloco de contas atual (`Blocks/Accounts.tsx`) fica visualmente idêntico — dois pickers (débito/crédito) que sintetizam 2 linhas `PRINCIPAL`. Ninguém é forçado a ver "linhas".
- **Origens geradas** (COMPRA, VENDA, PERDA_ESTOQUE, TAB, POS): linhas pré-fabricadas por template a partir da config de contas padrão da org, estendida com mapa opcional `chave → conta` (conta de frete, de impostos sobre compra etc.; fallback = conta padrão da origem). O usuário raramente toca.
- **Modo avançado (opt-in)**: editor de linhas (conta, natureza, valor, descrição) com indicador de balanceamento ao vivo — para lançamentos manuais complexos.

Na compra, uma única fonte alimenta os dois lados: `custosAdicionais` do header → (a) rateio → `modificadoresCusto` dos itens → líquido → custo de estoque; (b) template → linhas do lançamento (`MERCADORIA` + uma linha por chave presente, crédito no fornecedor/contrapartida). `Σ débitos === total da compra` por construção.

**2.5 Fluxo de custo — sem mudanças mecânicas:**
`resolveUnitCost` já lê `valorUnitarioLiquido`; média móvel, custo de lote no descarte, valuation de produção e margem de venda passam a refletir landed cost automaticamente. Nota de política: v1 capitaliza IPI e ICMS-ST no custo sempre (correto para comprador Simples Nacional/revenda — nosso público); um flag por org para regimes com crédito fica para depois.

**2.6 Fechar o gap de edição pós-recebimento:**
Estender `assertReceivedPurchaseItemsUnchanged` para congelar também os campos monetários (bruto, descontos, acréscimos e os 4 novos). Alterar custo exige des-receber → editar → receber (fluxo existente, que reprocessa estoque). Corrige de quebra a divergência silenciosa que já existe hoje.

**2.7 UI:**
- Nova seção "Custos adicionais" no modal de compra (New/Control): inputs por chave (frete, IPI, ICMS-ST, despesas acessórias — com "adicionar outro" pela flexibilidade do JSONB) + rateio automático; breakdown por item visível num popover no grid de itens (mesmo padrão do popover de validade). Override manual por item fica para v2.
- "Total da compra" passa a somar líquidos e a **propor** o `valor` do lançamento (hoje o total é display-only e desconectado do lançamento — `Items.tsx:65,133`).
- State hook `use-purchase-state.tsx` e `schemas/purchases.ts` ganham `custosAdicionais`/`modificadoresCusto`.
- Import por IA: propostas de lançamento (`ImportCompositionWithAI.tsx:138-198`) passam a preencher `custosAdicionais` (e as linhas derivadas) — o frete extraído deixa de ser só um aviso.

**2.8 Migração de schema:** colunas JSONB novas nullable + tabela de linhas — aditiva; o backfill de linhas é a Fase A acima. Via `db:push` (atenção ao drift conhecido de `ampmais_access_*`: revisar o diff, nunca aceitar data-loss às cegas).

---

## 3) XML de NF-e na entrada de compra por arquivo

### Estado atual (verificado)

- O fluxo "by-file" é o **import-composition** ("Importar itens com IA"): `lib/purchase/import.ts` + `app/api/purchases/import-composition/route.ts` + `components/Modals/Purchases/Blocks/Utils/ImportCompositionWithAI.tsx`. Aceita só `application/pdf`, `image/png`, `image/jpeg`, `image/webp` (`lib/purchase/import.ts:4`), e o client **converte tudo que não é PDF para JPEG** via canvas (`ImportCompositionWithAI.tsx:108-118`) — um `.xml` seria destruído antes de chegar ao servidor.
- **Nenhum parser XML instalado** no repo. XML só existe como blob opaco no módulo fiscal (armazenado/baixado, nunca parseado — os metadados de DF-e vêm do JSON do provider).
- O schema de extração não tem campos de imposto (`ExtractedCompositionSchema`, `lib/purchase/import.ts:19-34`): só `valorFrete`/`valorDesconto` de documento e `desconto` por item.
- Já existe o padrão certo para multi-formato no repo: o dispatcher da conciliação bancária (`lib/financial-reconciliation/ingest.ts:12-30` — detecção por extensão/magic-bytes/MIME → roteia por tipo).

### Plano

**3.1 Parser determinístico (sem IA) — `lib/purchase/import-xml.ts`:**
- Dependência: `fast-xml-parser`.
- Aceita `nfeProc`/`NFe` (e o caso comum de XML baixado do portal): extrai
  - fornecedor de `emit` (`CNPJ`, `xNome`),
  - documento de `ide` (`nNF`, `dhEmi`) + `chaveAcesso` do `infNFe@Id`,
  - itens de `det[]`: `cProd` → `codigoFornecedor`, `cEAN` → `ean`, `xProd`, `uCom`, `qCom`, `vUnCom`, `vProd`, `vDesc`, e **por item**: `vFrete`, `vSeg`+`vOutro` (→ despesas acessórias), `imposto/IPI/.../vIPI`, `imposto/ICMS/ICMSST*/vICMSST`,
  - totais de `total/ICMSTot` (`vNF`, `vFrete`, `vDesc`, `vIPI`, `vST`, `vSeg`, `vOutro`).
- Saída no mesmo shape `ExtractedComposition` (estendido com os campos de imposto do item 2), com `confianca` implícita 1 — **sem custo de IA, sem alucinação, valores exatos**. O matching de produtos existente (Stage A/B por `codigoFornecedor`/`ean`) fica muito mais eficaz porque o XML traz `cProd`/`cEAN` exatos.

**3.2 Dispatch na rota** (`import-composition/route.ts`):
- Detectar XML por MIME (`text/xml`, `application/xml`) **e** por conteúdo (`<?xml`/`<nfeProc`/`<NFe` — browsers no Windows reportam MIME inconsistente para `.xml`); XML → parser determinístico; PDF/imagem → extração por IA como hoje. Mesmo pipeline de matching/aviso depois do extract.
- Estender `ExtractedCompositionSchema` com os custos discriminados no shape dos modificadores do item 2: `custosAdicionais` no documento e `modificadoresCusto` por item (`origem: "DOCUMENTO"`) — opcionais/vazios no caminho IA, preenchidos deterministicamente no caminho XML.

**3.3 Client** (`ImportCompositionWithAI.tsx`):
- Aceitar `.xml` no `accept` (por extensão + MIMEs), pular a conversão-para-JPEG quando for XML (enviar base64 do texto), atualizar filtro do `addFiles`, textos de ajuda, ícone (`BsFiletypeXml` já existe no registry `lib/files-storage/index.ts:54-58`). Consolidar a lista de MIME aceitos importando de `lib/purchase/import.ts` (hoje está duplicada no client).
- Limite de 3MB atual é confortável para NF-e (~10–500KB).

**3.4 Amarração com o módulo fiscal (aproveitamento direto):**
- Ao importar XML com `chaveAcesso`, verificar `fiscalInboundDocuments` (chave única por org, já tem `compraId` FK — `services/drizzle/schema/fiscal.ts:345,356`): se o DF-e já existe, vincular a compra criada ao documento; deduplicar import repetido da mesma nota com aviso.

---

## Sequenciamento sugerido

1. **Item 1 (segurança)** — independente, risco ativo, fazer primeiro. (infra + rota nova + migração de objetos)
2. **Item 2 (modelo de custos)** — fundação de dados: modificadores JSONB + libs de normalização/rateio + Fases A/B das linhas contábeis (schema, backfill, dual-write com writer da compra usando template por chave). Fases C/D (readers DRE/stats/UI avançada, aposentar par legado) como fast-follow.
3. **Item 3 (XML)** — por último, porque o parser deposita IPI/ST/frete nos modificadores criados no item 2 (dá pra inverter, mas os impostos extraídos não teriam onde morar).

## Decisões tomadas (default escolhido; sinalizar se discordar)

- Custos discriminados em JSONB (padrão `modificadores`), com `valorTotalLiquido` escalar como contrato do downstream de custo — o JSONB nunca é parseado fora do módulo de compras.
- Contábil via `accounting_entry_lines` (journal lines genéricas) substituindo `idContaDebito`/`idContaCredito` em migração faseada com dual-write; `entry.valor` permanece como total do header; discriminação por `chave` nas linhas.
- Template padrão da compra debita todos os componentes na conta de mercadoria/estoque em linhas separadas por `chave` (coerente com capitalização no custo); mapa `chave → conta` opcional nas settings da org.
- Rateio proporcional ao `valorTotalBruto` do item (padrão de mercado); por quantidade fica como opção futura.
- v1 capitaliza IPI e ICMS-ST no custo incondicionalmente (público-alvo Simples Nacional); flag por regime fica para depois.
- Extratos bancários migram para o bucket privado junto do item 1; chat media/avatares ficam para o plano LGPD.
