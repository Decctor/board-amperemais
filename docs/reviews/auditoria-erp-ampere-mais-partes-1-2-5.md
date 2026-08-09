# Auditoria técnica — RecompraCRM ERP para migração da Ampere+

**Data:** 2026-08-09
**Escopo:** Parte 1 (preparo contábil e fiscal), Parte 2 (entrada de nota fiscal), Parte 5 (TEF/POS, conciliação e fechamento de caixa)
**Método:** leitura estática do código na branch `claude/eloquent-ramanujan-3hz2xh` (base: `master` @ `160bf03`). Toda afirmação tem citação `arquivo:linha`. Nada foi inferido de nome de tabela, rota ou label.

---

## Sumário executivo

O RecompraCRM tem um **motor de emissão fiscal de saída real e razoavelmente maduro** — NFC-e e NF-e via Spedy, com motor tributário próprio (CSOSN, ICMS, ICMS-ST por MVA, FCP, PIS/COFINS, IBPT/vTotTrib), fila com backoff, lock de concorrência, controle de numeração de série, cancelamento, CC-e, inutilização e devolução. Isso é mais do que a maioria dos "ERPs beta" tem.

O problema é que a operação da Ampere+ **não é feita só de saída**, e é justamente nos outros três eixos que o sistema está vazio ou fingindo:

1. **Entrada de nota fiscal — o módulo que mais dói hoje na Ampere+ — não lê XML.** A importação aceita apenas PDF/PNG/JPEG/WEBP e extrai os itens com um modelo de visão (`lib/purchase/import.ts:4`, `lib/purchase/import.ts:63`). Não há parser de XML de NF-e em lugar nenhum do repositório. Uma entrada de nota não carrega CFOP, NCM, CST/CSOSN, ICMS, ICMS-ST ou IPI — a tabela `purchase_items` não tem um único campo fiscal (`services/drizzle/schema/purchases.ts:72-111`). **Migrar a entrada de nota para o RecompraCRM hoje pioraria a operação, não melhoraria.**
2. **DF-e / manifestação do destinatário é um stub completo.** Existe tabela, cron a cada 2h, rota de API e UI, mas `resolveInboundProvider()` retorna sempre um provider manual que devolve zero documentos e finge a manifestação (`lib/fiscal/inbound/providers.ts:15-17`, `lib/fiscal/inbound/providers.ts:3-11`). O cron roda e não faz nada.
3. **Não existe nada de obrigação acessória.** Zero SPED Fiscal, zero EFD-Contribuições, zero ECD, zero Bloco K, zero Livro de Inventário, zero apoio ao PGDAS-D, zero segregação de receitas (ST / monofásico). Não há sequer exportação em lote de XMLs para o contador — o download é um documento por vez (`app/api/fiscal/document-assets/route.ts:9-13`).
4. **TEF/POS não existe.** O único provider de pagamento implementado é o `LocalPaymentProvider`, que apenas grava linhas financeiras; Mercado Pago, Stripe Connect e Pagar.me lançam exceção "ainda não implementado" (`lib/payments/index.ts:16-36`). Não há SiTef, PayGo, Auttar, Stone, Cielo, PagSeguro, Getnet ou Rede em nenhum lugar do repositório. Não há PIX de loja (QR, webhook de PSP, baixa automática). Não há conciliação de adquirente, MDR, valor líquido ou chargeback.

Dois riscos transversais que valem tanto quanto as ausências:

- **O motor tributário não tem um único teste.** `lib/fiscal/engine/taxation.ts` tem 296 linhas de cálculo de imposto e nenhum arquivo `.test.ts` correspondente (o único teste em `lib/fiscal/` é `auto-emission-policy.test.ts`). E **não existe CI**: não há diretório `.github/`, e os scripts `test:*` do `package.json` cobrem só metas e cotações de IA.
- **O certificado digital A1 (.pfx) é enviado pelo cliente para um caminho com prefixo `public/` do mesmo bucket Supabase em que o app chama `getPublicUrl` para servir imagens** (`app/dashboard/fiscal/fiscal-page.tsx:1098-1102` → `lib/files-storage/index.ts:153-161`). O XML/PDF fiscal também vai para `public/organizations/fiscal` (`lib/fiscal/constants.ts:4`). Se o bucket `files` estiver marcado como público no Supabase — e o uso de `getPublicUrl` no mesmo bucket sugere fortemente que está —, o certificado é baixável por URL. **Isto precisa ser verificado antes de qualquer coisa** (ver §1.9).

### Recomendação sobre migrar

**Não faça cut-over completo.** Faça uma migração parcial e nomeada:

| Migrar agora | Manter fora do RecompraCRM |
|---|---|
| PDV, vendas, clientes, CRM | Entrada de nota fiscal (XML de fornecedor) |
| Estoque, custo médio, inventário | Escrituração fiscal e apuração (contador) |
| Emissão de NFC-e / NF-e de saída | Manifestação do destinatário |
| Financeiro (contas a pagar/receber, caixa) | Conciliação de cartão / adquirente |

A janela do balanço com visto de auditoria é boa para **carregar o estoque saneado** — esse é o ganho real e imediato. Mas ela não resolve o problema que motivou a troca: se a dor é entrada de nota, o RecompraCRM hoje não a resolve.

Antes mesmo da migração parcial, três coisas são pré-requisito e não são negociáveis: (a) confirmar/corrigir a exposição do certificado; (b) rodar um período de sombra em homologação com o motor tributário comparado nota a nota contra o ERP atual, porque não há teste que garanta o cálculo; (c) validar com o contador da Ampere+ como ele vai receber os XMLs, já que não há exportação em lote.

**Notas de maturidade:** Parte 1 (fiscal/contábil) **2/5** · Parte 2 (entrada de NF) **1/5** · Parte 5 (TEF/conciliação/caixa) **2/5**.

---

## Parte 1 — Preparo contábil e fiscal

### 1.1 Cadastro fiscal e parametrização

| Item | Status | Evidência |
|---|---|---|
| Regime tributário (CRT 1–4) por organização | **IMPLEMENTADO** | `schemas/fiscal.ts:87-93` (`regimeTributario` int 1..4); mapeado para o provedor em `lib/fiscal/providers/spedy/company.ts:15-27` |
| Parametrização fiscal multi-tenant | **IMPLEMENTADO** | `organizacaoId` obrigatório em séries, perfis de operação, grupos tributários e perfis fiscais de produto — `services/drizzle/schema/fiscal.ts:53-55, 78-80, 106-108, 188-190` |
| Parametrização por **filial** | **AUSENTE** | A configuração fiscal é uma coluna JSONB na organização (`lib/fiscal/settings.ts:22-24`); não existe entidade de filial, nem `filialId`/`estabelecimentoId` em nenhum schema. Uma organização = um CNPJ. |
| NCM, CEST, origem, unidade comercial no cadastro do produto | **IMPLEMENTADO** | `services/drizzle/schema/fiscal.ts:196-201` (`origemMercadoria`, `ncm`, `exTipi`, `cest`, `cfopPadrao`, `unidadeComercial`) |
| NCM/CEST/origem **usados no cálculo** (não só armazenados) | **IMPLEMENTADO** | NCM alimenta o IBPT (`lib/fiscal/taxation-context.ts:120`); origem vira código e regra de 4% importado (`lib/fiscal/engine/taxation.ts:193`, `lib/fiscal/engine/data/uf.ts:75-86`); CEST dispara validação de coerência com CSOSN (`lib/fiscal/engine/taxation.ts:129-136`) |
| **Unidade tributável** separada da comercial | **AUSENTE** | O mapper envia `unitTax` e `quantityTax` iguais aos comerciais (`lib/fiscal/providers/spedy/mappers/invoice.ts:100-102`). Não existe campo `unidadeTributavel` no schema. |
| GTIN/EAN no item da NF | **AUSENTE** | Hardcoded `gtinCode: "SEM GTIN"` (`lib/fiscal/providers/spedy/mappers/invoice.ts:91`), mesmo quando o produto tem EAN. |
| Motor de regra fiscal (por UF, destinatário, finalidade) | **IMPLEMENTADO** | Tabela de cenários com colunas anuláveis = "qualquer" (`services/drizzle/schema/fiscal.ts:141-179`) e resolução por especificidade (`lib/fiscal/engine/rules.ts:14-27`, `lib/fiscal/engine/rules.ts:34-57`) |
| Regra fiscal **por NCM** | **AUSENTE** | As dimensões de regra são escopo, UF de destino, indicador do destinatário e finalidade (`services/drizzle/schema/fiscal.ts:155-158`). NCM não é dimensão — a granularidade é o grupo tributário vinculado ao produto. |

**Leitura honesta:** a parametrização é boa e não é hardcoded — é um motor de cenário de verdade. Mas ela é **por produto**, via grupo tributário. Com ~milhares de SKUs de material elétrico, alguém vai ter que classificar produto a produto em grupos, e o sistema não oferece atribuição em massa por NCM nem importação de tabela. Isso é trabalho de projeto, não de configuração.

### 1.2 Cálculo de tributos

| Tributo / caso | Status | Evidência |
|---|---|---|
| ICMS alíquota interna | **IMPLEMENTADO** | `lib/fiscal/engine/taxation.ts:91-97` |
| Redução de base de ICMS | **PARCIAL** | Calculada corretamente na base (`lib/fiscal/engine/taxation.ts:93`), mas o mapper envia `baseTaxReduction: 0` ao provedor (`lib/fiscal/providers/spedy/mappers/imposto.ts:11`) — a base sai reduzida com `pRedBC` zerado no XML. |
| Isenção / não tributado | **PARCIAL** | Coberto indiretamente: CSOSN sem débito + alíquota 0 zera o ICMS. Não há tratamento explícito de motivo de desoneração (`vICMSDeson`/`motDesICMS`) — não há ocorrência desses campos no repositório. |
| Diferimento | **AUSENTE** | CSOSN não inclui código de diferimento no enum (`services/drizzle/schema/enums.ts:299`) e não há lógica de diferimento no motor. |
| ICMS-ST por MVA, base reduzida, dedução da operação própria | **IMPLEMENTADO** | `lib/fiscal/engine/taxation.ts:143-167`, inclusive a dedução presumida do Convênio 142/18 quando o emitente do Simples não destaca ICMS próprio (`lib/fiscal/engine/taxation.ts:149-156`) |
| **Item que já veio com ST retido do fornecedor** | **PARCIAL** | Tratado corretamente quando marcado: CSOSN 500 bloqueia o recálculo de ST para frente (`lib/fiscal/engine/taxation.ts:138-143`), e há aviso quando o produto tem CEST mas CSOSN não é de ST (`lib/fiscal/engine/taxation.ts:129-136`). **Mas depende inteiramente de marcação manual** no grupo tributário — não há detecção automática, porque a entrada de nota não lê tributos (ver Parte 2). |
| FCP e FCP-ST | **IMPLEMENTADO** | `lib/fiscal/engine/taxation.ts:96, 157` |
| Crédito de ICMS no SN (CSOSN 101/201) | **IMPLEMENTADO** | `lib/fiscal/engine/taxation.ts:99-114` |
| **DIFAL (EC 87/2015)** | **AUSENTE** | Nenhuma ocorrência de `DIFAL`, `vICMSUFDest`, `vICMSUFRemet` ou `pICMSInterPart` no repositório. Venda interestadual a consumidor final não contribuinte sai sem partilha. |
| PIS/COFINS cumulativo/não cumulativo | **PARCIAL** | Ad valorem para CST 01/02 (`lib/fiscal/engine/taxation.ts:24, 50-53`); CST 03 (por quantidade) rejeitado explicitamente (`lib/fiscal/engine/taxation.ts:41-49`); demais CSTs zerados. Cobre o Simples (CST 49) e o regime normal ad valorem, mas não distingue cumulativo de não cumulativo — não há crédito de PIS/COFINS em lugar nenhum. |
| **PIS/COFINS monofásico** | **AUSENTE** | O enum de CST PIS/COFINS existe (`services/drizzle/schema/enums.ts:301`) e um item pode ser marcado com CST 04/06, mas não há identificação de monofásico, nem por NCM, nem flag no produto, nem segregação na apuração. Não há ocorrência de "monofás" no repositório. |
| **IPI** | **AUSENTE** | O mapper envia `ipiAmount: 0` fixo (`lib/fiscal/providers/spedy/mappers/invoice.ts:125`). Não há campo, cálculo ou CST de IPI. |
| CSOSN correto conforme regime | **PARCIAL** | Só CSOSN. O enum do banco tem apenas os 10 códigos de Simples Nacional (`services/drizzle/schema/enums.ts:299`) e o mapper envia sempre `csosn: Number(...)` (`lib/fiscal/providers/spedy/mappers/imposto.ts:8`). **Não existe CST de ICMS (regime normal) em nenhum lugar.** O `regimeTributario` é cadastrável até CRT 3/4, mas o motor não sabe emitir para regime normal. |

**Leitura honesta:** o motor é bem escrito, comentado com referência a norma (Convênio 142/18, NT 2016.002, Resolução SF 13/2012) e valida coerência antes de mandar para a SEFAZ (`lib/fiscal/documents.ts:457-462`). Para a Ampere+ — Simples Nacional, MG, venda majoritariamente intraestadual — o conjunto implementado cobre o caso principal. **Duas exposições concretas para a Ampere+:** (a) venda interestadual a consumidor final não contribuinte sai sem DIFAL; (b) material elétrico em MG tem muito item com ST retido, e o acerto depende de o CSOSN 500 estar marcado corretamente em cada grupo — erro aqui é imposto pago a mais ou nota rejeitada, em escala.

E o mais importante: **nada disso tem teste automatizado**. Um bug de arredondamento ou de sinal aqui não é pego por ninguém antes da SEFAZ.

### 1.3 Simples Nacional especificamente

| Item | Status | Evidência |
|---|---|---|
| Apuração / relatório para PGDAS-D | **AUSENTE** | Nenhuma ocorrência de `PGDAS` ou apuração fiscal no repositório. Não há rota, lib ou relatório fiscal por competência. |
| Segregação de receitas (ST já recolhido, monofásico, substituição) | **AUSENTE** | Não existe agregação de receita por natureza tributária. Os relatórios financeiros (`lib/finances/analytics/`) são de fluxo de caixa, aging, classificação por conta contábil e recorrência — nenhum corta receita por CSOSN, CST ou NCM. |
| Identificação automática de item monofásico / com ST | **AUSENTE** | Depende 100% de marcação manual no grupo tributário (`services/drizzle/schema/fiscal.ts:119-131`). Único apoio: um aviso heurístico quando há CEST sem CSOSN de ST (`lib/fiscal/engine/taxation.ts:129-136`). |

**Este é o ponto que você mesmo apontou como o de maior impacto financeiro — e está inteiramente ausente.** Não há nem o dado bruto para construir a segregação depois: a venda guarda o item e o valor, mas a apuração tributária calculada na emissão (`computeSaleTaxation`) não é persistida de forma consultável — ela é recomputada a cada emissão e vai para o `provedorPayload` como JSON string (`lib/fiscal/documents.ts:235`). Para montar segregação de receita depois, seria preciso reprocessar ou reparsear payloads.

### 1.4 Documentos fiscais

| Documento / evento | Status | Evidência |
|---|---|---|
| NFC-e (65) | **IMPLEMENTADO** | Emissão, consulta, sync, cancelamento, XML/PDF via Spedy (`lib/fiscal/providers/spedy/documents.ts:20-103`); cenário forçado a interno (`lib/fiscal/taxation-context.ts:31-34`) |
| NF-e (55) | **IMPLEMENTADO** | Mesmo caminho, `basePath` `/v1/product-invoices` (`lib/fiscal/providers/spedy/documents.ts:20-22`) |
| NFS-e | **AUSENTE** | Existe só como valor de enum (`services/drizzle/schema/enums.ts:245`). O worker pula qualquer tipo que não seja NFCE/NFE (`lib/fiscal/worker.ts:44-47`) e a UI diz explicitamente que não está disponível (`app/dashboard/fiscal/fiscal-page.tsx:511`). Não há mapper de NFS-e. |
| Cancelamento | **IMPLEMENTADO** | `lib/fiscal/documents.ts:691-722`, `lib/fiscal/providers/spedy/documents.ts:70-85` |
| Carta de correção | **IMPLEMENTADO** | `lib/fiscal/documents.ts:724-745`; restrito a NF-e autorizada (`lib/fiscal/documents.ts:727-728`). Limitação: sequência do evento é sempre 1 (`lib/fiscal/providers/spedy/documents.ts:118`) — a segunda CC-e do mesmo documento será registrada com a mesma sequência. |
| Inutilização de numeração | **IMPLEMENTADO** | `lib/fiscal/documents.ts:747-775`, `lib/fiscal/providers/spedy/documents.ts:124-145` |
| Devolução | **PARCIAL** | Gera NF-e de devolução referenciando a chave original (`lib/fiscal/documents.ts:784-822`), mas **sempre da venda inteira** — reusa `original.vendaId` sem seleção de itens ou quantidades. Devolução parcial não é possível. |
| **Contingência (SVC-AN / SVC-RS / offline NFC-e)** | **AUSENTE** | `issueType: "normal"` hardcoded (`lib/fiscal/providers/spedy/mappers/invoice.ts:79`). Nenhuma ocorrência de contingência, SVC ou offline no módulo fiscal. Se a SEFAZ-MG cair, o caixa para — ou vende sem documento. |
| Controle de numeração de série | **IMPLEMENTADO** | Contador atômico que só avança (`lib/fiscal/settings.ts:206-228`), índice único por série/ambiente (`services/drizzle/schema/fiscal.ts:67`) e avanço forçado após rejeição não-reenviável (`lib/fiscal/documents.ts:495-499`) |
| Fila assíncrona com retry | **IMPLEMENTADO** | Outbox com backoff exponencial e 6 tentativas (`lib/fiscal/worker.ts:8-14`), cron a cada 2 min (`vercel.json:20-22`), lock de envio com reclamação de lock obsoleto (`lib/fiscal/documents.ts:169-192`) |
| Certificado A1 | **IMPLEMENTADO** (com ressalva de segurança) | Upload e sincronização com o provedor, incluindo tratamento de certificado já cadastrado (`lib/fiscal/providers/spedy/company.ts:191-228`). Ver §1.9. |
| Certificado A3 | **AUSENTE** | Não faz sentido no modelo (emissão server-side via provedor), mas registre-se: só `.p12`/`.pfx` são aceitos (`app/dashboard/fiscal/fiscal-page.tsx:1142`). |
| Alerta de vencimento de certificado | **AUSENTE** | `validTo` é persistido (`lib/fiscal/providers/spedy/company.ts:110`) mas nenhum cron ou notificação o consulta. |
| CT-e e MDF-e | **AUSENTE** | Nenhuma ocorrência no repositório. Relevante: a Ampere+ faz entrega própria. |

### 1.5 Obrigações acessórias e contabilidade

| Item | Status | Evidência |
|---|---|---|
| SPED Fiscal (EFD ICMS/IPI) | **AUSENTE** | Nenhuma ocorrência de `EFD` ou geração de arquivo SPED. |
| EFD-Contribuições | **AUSENTE** | Idem. |
| SPED Contábil (ECD) | **AUSENTE** | Idem. |
| Bloco K | **AUSENTE** | Idem. Existe o dado bruto (movimentações de estoque com saldo anterior/posterior em `productStockTransactions`, e produções em `services/drizzle/schema/productions.ts`), mas nenhuma geração. |
| Livro Registro de Inventário | **AUSENTE** | Existe valor imobilizado de estoque em tela (`app/dashboard/inventory/stocks-page.tsx:81-84`, `app/api/products/route.ts:416`), o que não é livro de inventário. |
| Exportação para o contador | **PARCIAL / muito fraco** | XML e PDF por documento, um a um (`app/api/fiscal/document-assets/route.ts:9-13`). Não há exportação em lote, zip ou por período. A única exportação XLSX pronta é de clientes (`lib/clients/export.ts:175-179`). |
| Plano de contas | **IMPLEMENTADO** | Árvore com natureza e conta pai (`services/drizzle/schema/financial.ts:40-61`) |
| Partida dobrada | **PARCIAL** | Cada lançamento tem exatamente uma conta de débito e uma de crédito (`services/drizzle/schema/financial.ts:104-109`). É partida dobrada simplificada 1:1 — não suporta lançamento multi-perna. Uma venda com receita, imposto, CMV e desconto exige vários lançamentos separados, sem amarração entre eles. |
| Lançamentos automáticos por origem | **IMPLEMENTADO** | Enum de origem cobre venda, compra, estorno, transferência, conciliação, perda de estoque, recorrência e pagamento de cartão (`services/drizzle/schema/enums.ts:208-218`); contas padrão resolvidas por organização (`lib/finances/resolve-accounting-default-accounts.ts:104`) |
| Validação de balanceamento | **IMPLEMENTADO** | O lançamento tem que bater com a soma das transações financeiras que o quitam (`lib/finances/accounting-entry-balance.ts:38`) |

**Leitura honesta:** o "financeiro" **não** é só fluxo de caixa — há plano de contas, competência, partida dobrada 1:1 e conciliação. É financeiro-gerencial de boa qualidade. Mas **não é contabilidade fiscal**: nada do que está aqui gera as obrigações que o contador precisa entregar. O contador da Ampere+ continuaria escriturando por fora, e agora sem os XMLs de entrada organizados (Parte 2).

### 1.6 Reforma tributária (CBS/IBS)

**AUSENTE.** Nenhuma ocorrência de CBS, IBS, split payment ou tributo dual no repositório. O único ponto de contato é uma flag desligada e hardcoded no payload de configuração da empresa no provedor: `taxReformFieldsEnabled: false` (`lib/fiscal/providers/spedy/company.ts:67`).

Sobre a pergunta estrutural — **o modelo de dados não comporta a convivência dos dois sistemas.** A tabela `fiscal_tax_groups` (`services/drizzle/schema/fiscal.ts:99-139`) é um conjunto plano de colunas nomeadas por tributo do regime atual (`csosn`, `aliquotaIcms`, `mvaSt`, `cstPis`, `aliquotaCofins`…), e o tipo de retorno do motor (`TItemTaxResult` em `lib/fiscal/engine/types.ts`) é igualmente fechado em `icms`/`pis`/`cofins`. Não há noção genérica de "tributo" com vigência. Adicionar CBS/IBS significa somar colunas e ramos, não configurar — e a transição, que exige calcular os dois regimes na mesma nota, forçaria uma reescrita do motor e do mapper.

Isso não é um problema para a decisão de migrar agora, mas é um problema de roadmap de produto que você deve precificar: **é uma refatoração de motor, não um incremento.**

### 1.7 Dívida técnica e risco de correção — Parte 1

- **Zero cobertura de teste no cálculo de imposto.** `lib/fiscal/engine/taxation.ts` (296 linhas), `lib/fiscal/engine/rules.ts`, `lib/fiscal/engine/cfop.ts` e `lib/fiscal/taxation-context.ts` não têm arquivo de teste. Único teste em `lib/fiscal/` é `auto-emission-policy.test.ts` (67 linhas, sobre exceção de método de pagamento).
- **Não existe CI.** Não há diretório `.github/`. Os scripts `test:goals` e `test:ai-quotes` (`package.json`) rodam manualmente e não incluem nada de fiscal.
- **`console.log` por item em caminho de produção.** `lib/fiscal/taxation-context.ts:96` loga cada item de cada venda emitida.
- **Comentários que descrevem um provedor que não é mais usado.** `lib/fiscal/auto-emission-capability.ts:6` fala em "provedor Nuvem Fiscal" enquanto o código valida Spedy — resquício de migração de provedor. O documento `docs/FISCAL-ALL-IN-ONE-AUDIT.md` está inteiro desatualizado pelo mesmo motivo. Isso é ruído perigoso: quem ler a doc conclui coisas erradas sobre o estado atual.
- **`cProd` é o UUID interno do produto** (`lib/fiscal/providers/spedy/mappers/invoice.ts:90`). Válido, mas ilegível no DANFE e sem correspondência com o código que a loja usa.
- **Fallback silencioso de grupo tributário.** Quando o produto não tem grupo, o motor monta um grupo sintético CSOSN 102 zerado (`lib/fiscal/taxation-context.ts:50-76`). Há erro bloqueante registrado junto (`lib/fiscal/taxation-context.ts:107-114`), então na emissão real ele barra — mas qualquer consumidor do cálculo que não cheque `erros` verá um imposto zerado plausível.

### 1.8 Nota de maturidade — Parte 1

**2 / 5** — a emissão de saída em Simples Nacional é sólida e bem arquitetada, mas fica ilhada: não há CST de regime normal, DIFAL, IPI, monofásico, contingência, nem uma única obrigação acessória, e o motor que calcula imposto de verdade não tem teste nem CI.

### 1.9 Achado de segurança que precisa de decisão antes de tudo

O certificado A1 é enviado do browser via `uploadFile` (`app/dashboard/fiscal/fiscal-page.tsx:1098-1102`), que grava em `public/syncrono/(orgId)CERTIFICADO_FISCAL_<orgId> - <ISO>` no bucket `files` e imediatamente chama `getPublicUrl` sobre esse caminho (`lib/files-storage/index.ts:153-161`). O mesmo bucket serve assets públicos por `getPublicUrl` em `lib/files-storage/public-assets.ts:45`. Os XMLs e PDFs fiscais também vão para um prefixo `public/` (`lib/fiscal/constants.ts:4`, usado em `lib/fiscal/storage.ts:26-33`).

Classificação: **INCERTO**, e só por um motivo — não consigo ler do repositório se o bucket `files` está marcado como público no Supabase, nem as policies de RLS de storage. **O que eu precisaria ver para decidir:** a configuração do bucket `files` no painel Supabase (flag `public`) e as policies da tabela `storage.objects`. Se o bucket for público, o `.pfx` da Ampere+ é baixável por quem souber ou adivinhar o caminho — e o caminho contém apenas o `organizationId` e um timestamp ISO.

A senha do certificado, essa, não é persistida no fluxo atual: `syncFiscalCompanyCertificate` grava só os metadados retornados pelo provedor (`lib/fiscal/settings.ts:130-138`, `lib/fiscal/providers/spedy/company.ts:100-114`). Mas o schema permite o campo (`schemas/fiscal.ts:75`) e a UI o lê do estado (`app/dashboard/fiscal/fiscal-page.tsx:1089`) — se algum caminho futuro salvar a configuração com esse campo preenchido, a senha vai para o JSONB em texto puro. Vale remover o campo do schema.

---

## Parte 2 — Módulo de entrada de nota fiscal

### 2.1 Captura e importação

| Item | Status | Evidência |
|---|---|---|
| **Importação de XML de NF-e** | **AUSENTE** | Os únicos MIME types aceitos são PDF, PNG, JPEG e WEBP (`lib/purchase/import.ts:4`, revalidados em `app/api/purchases/import-composition/route.ts:31-34`). Não existe parser de XML de NF-e no repositório. |
| Importação por leitura de documento (IA) | **IMPLEMENTADO** | Extração por visão com Sonnet (`lib/purchase/import.ts:61-84`), com prompt específico para DANFE/cupom (`lib/purchase/import.ts:37-58`) |
| Leitura de e-mail | **AUSENTE** | Nenhum ingest de e-mail para compras. |
| **Consulta ao DF-e da SEFAZ (distribuição)** | **AUSENTE (esqueleto presente)** | Toda a maquinaria existe — tabelas `fiscal_inbound_documents` e `fiscal_inbound_cursors` (`services/drizzle/schema/fiscal.ts:334-384`), varredura incremental por NSU (`lib/fiscal/inbound/index.ts:91-120`), cron de 2 em 2 horas (`vercel.json:24-26`), rotas e UI. **Mas `resolveInboundProvider()` retorna sempre `ManualInboundProvider`, que devolve zero documentos** (`lib/fiscal/inbound/providers.ts:15-17`, `lib/fiscal/inbound/providers.ts:4-6`), com o comentário explicando que a Spedy não expõe DF-e (`lib/fiscal/inbound/providers.ts:13-14`). |
| **Manifestação do destinatário** | **AUSENTE (fachada presente)** | O enum tem os quatro eventos (`services/drizzle/schema/enums.ts:382`), a rota existe, a auto-ciência roda (`lib/fiscal/inbound/index.ts:73-88`) — mas o provider apenas retorna `{ registrado: true, protocolo: null }` sem chamar ninguém (`lib/fiscal/inbound/providers.ts:8-10`) e o banco é atualizado como se tivesse manifestado (`lib/fiscal/inbound/index.ts:81`). **O sistema registra manifestações que nunca aconteceram.** Este é o achado mais perigoso da auditoria em termos de falso positivo operacional. |
| Entrada manual de nota | **IMPLEMENTADO** | Modal de compra com itens digitáveis (`components/Modals/Purchases/NewPurchase.tsx`, `components/Modals/Purchases/Blocks/Items.tsx`) |

### 2.2 Conferência

| Item | Status | Evidência |
|---|---|---|
| Conferência XML × pedido × recebimento físico | **AUSENTE** | Não há pedido de compra separado do recebimento: é a mesma entidade mudando de status (`services/drizzle/schema/purchases.ts:18`). Não há campo de "quantidade conferida" versus "quantidade pedida" — só `quantidade` (`services/drizzle/schema/purchases.ts:89`). |
| Divergência de valor total do documento | **PARCIAL** | Compara a soma das linhas lidas com o total impresso e avisa, com tolerância de R$ 0,05 (`app/api/purchases/import-composition/route.ts:84-94`). É conferência da **leitura**, não do recebimento. |
| Divergência de quantidade / preço no recebimento | **AUSENTE** | Após receber, os itens ficam congelados: qualquer alteração de produto, variante ou quantidade é bloqueada (`app/api/purchases/route.ts:454-470`). Correção só por cancelamento. |
| **De-para fornecedor → produto interno** | **IMPLEMENTADO** | Tabela `supplier_product_mappings` chaveada por código do fornecedor **ou** EAN, com índices únicos parciais (`services/drizzle/schema/suppliers.ts:33-73`); matching em 3 estágios — de-para aprendido, código exato, e IA conservadora com candidatos por similaridade (`lib/purchase/match-products.ts:107-229`); o de-para é aprendido no confirm da revisão (`components/Modals/Purchases/Blocks/Utils/ImportCompositionWithAI.tsx:426-443`) |
| **Conversão de unidade com fator** | **IMPLEMENTADO** | Fator persistido no de-para (`services/drizzle/schema/suppliers.ts:54-55`); detecção de divergência de unidade com dicionário de sinônimos brasileiros incluindo RL/rolo e M/metro (`lib/purchase/units.ts:11-56`, `lib/purchase/units.ts:68-73`); sugestão de fator lida da descrição, ex. "CX C/ 12" (`lib/purchase/units.ts:79-90`); conversão preservando o total da linha (`lib/purchase/units.ts:96-107`); valores originais do fornecedor guardados em `externoQtde`/`externoValor`/`externoUnidade`/`externoFatorConversao` (`services/drizzle/schema/purchases.ts:100-103`) |
| De-para de **NCM** do fornecedor | **AUSENTE** | O de-para mapeia código, EAN e unidade. NCM não é lido da nota nem comparado com o cadastro. |
| Produto que não existe no cadastro | **PARCIAL — fica em limbo** | A linha vem como `NAO_MAPEADO`, o checkbox de inclusão fica desabilitado (`components/Modals/Purchases/Blocks/Utils/ImportCompositionWithAI.tsx:661-666`) e o loop de inserção pula linhas sem produto (`components/Modals/Purchases/Blocks/Utils/ImportCompositionWithAI.tsx:387`). O operador precisa selecionar um produto existente; **não há criação de produto inline** e nenhum bloqueio impede confirmar a compra ignorando a linha. Só um aviso em amarelo (`components/Modals/Purchases/Blocks/Utils/ImportCompositionWithAI.tsx:641-648`). Na prática: item da nota some da compra sem trilha. |

**A conversão de unidade e o de-para são a melhor parte deste módulo** — foram claramente desenhados pensando no caso "fornecedor vende em caixa/rolo, loja vende em unidade/metro". Isso funciona e é útil para a Ampere+. O problema é o que vem antes: a fonte é uma foto ou PDF lido por LLM, não o XML.

### 2.3 Classificação da entrada — o ponto central

**Toda esta seção é AUSENTE.** Não há nenhum campo, enum ou lógica de finalidade de entrada em nenhum lugar do repositório:

- **Revenda × uso e consumo × imobilizado × matéria-prima:** **AUSENTE**. A busca por `USO_CONSUMO`, `IMOBILIZADO`, `MATERIA_PRIMA`, `finalidadeEntrada` não retorna nenhuma definição — só o texto de um placeholder de UI (`components/Modals/FiscalTaxGroup/Blocks/General.tsx:27`) e uma métrica financeira chamada `valorImobilizado` que é o valor do estoque a custo (`app/api/products/route.ts:416`), nada a ver com ativo imobilizado.
- **CFOP de entrada:** **AUSENTE**. `purchase_items` não tem coluna de CFOP (`services/drizzle/schema/purchases.ts:72-111`). O resolvedor de CFOP existe e sabe tratar prefixo 1/2 para entradas (`lib/fiscal/engine/cfop.ts:32-34`), mas nada na entrada de nota o chama.
- **Uso e consumo não gerando crédito e não entrando no estoque de revenda:** **AUSENTE**. Toda linha de compra recebida gera movimento de estoque de aquisição (`lib/purchase-processing/process-purchase-item-stock.ts:69-87`, tipo `ENTRADA_AQUISICAO` em `lib/purchase-processing/process-purchase-item-stock.ts:467`). Não há caminho para entrada sem estoque.
- **Imobilizado / CIAP:** **AUSENTE**. Nenhuma ocorrência de CIAP. Não há segregação contábil por finalidade — a conta de débito da compra é a conta padrão da organização (`lib/finances/resolve-accounting-default-accounts.ts:104`).
- **Devolução de compra:** **AUSENTE**. Nenhuma ocorrência de devolução em `lib/purchase*`, `app/api/purchases` ou `schemas/purchases.ts`. O estorno possível é desfazer o recebimento inteiro (`lib/purchase-processing/process-purchase-item-stock.ts:89-118`), e só enquanto nenhum lote foi tocado (`app/api/purchases/route.ts:475-487`).
- **Nota de complemento:** **AUSENTE** na entrada. A finalidade COMPLEMENTAR existe apenas para documentos de saída (`services/drizzle/schema/enums.ts:284`).
- **Recebimento parcial:** **PARCIAL / enganoso**. O status `RECEBIMENTO_PARCIAL` existe no enum (`services/drizzle/schema/enums.ts:358`), mas `isPurchaseConsideredReceived` só reconhece `RECEBIDA` com data de efetivação (`app/api/purchases/route.ts:308-310`). Uma compra marcada como recebimento parcial **não movimenta estoque nenhum**. O status é decorativo.

**Conclusão da seção:** a "entrada de nota" do RecompraCRM não é uma entrada fiscal. É um documento de compra que serve a três coisas — estoque, custo e contas a pagar — e faz essas três bem. Não serve à escrituração, ao crédito, nem à classificação fiscal.

### 2.4 Custo e estoque

| Item | Status | Evidência |
|---|---|---|
| Custo médio ponderado móvel | **IMPLEMENTADO** | `lib/purchase-processing/process-purchase-item-stock.ts:573-588`, com trilha completa (`saldoAnterior`, `saldoPosterior`, `custoUnitarioAnterior`, `custoUnitarioPosterior`) gravada em cada movimento (`lib/purchase-processing/process-purchase-item-stock.ts:470-486`) |
| FIFO / último custo / configurável | **AUSENTE** | Só média móvel; não há chave de configuração de método de custeio. Existem lotes com FEFO (`lib/stock/consume-stock-lots-fefo.ts`), mas eles controlam validade, não custo — e só são criados quando o operador informa data de validade (`lib/purchase-processing/process-purchase-item-stock.ts:197-201`), o que raramente ocorre em material elétrico. |
| **Rateio de frete, seguro, IPI, ICMS-ST e despesas acessórias no custo** | **AUSENTE** | O custo unitário é simplesmente `valorUnitarioLiquido ?? valorUnitarioBruto` (`lib/purchase-processing/process-purchase-item-stock.ts:172-174`). O frete lido da nota vira apenas um texto de aviso (`app/api/purchases/import-composition/route.ts:95-96`) e não é rateado. O único ajuste é um `acrescimosTotal` digitado item a item (`components/Modals/Purchases/Blocks/Utils/NewPurchaseItem.tsx:158-159`) — ou seja, rateio manual, na mão, linha por linha. **Para material elétrico com ST retido, isso significa custo subavaliado e margem falsamente alta.** |
| Custo alimenta a margem exibida na venda | **IMPLEMENTADO** | `products.precoCusto` é atualizado na entrada (`lib/purchase-processing/process-purchase-item-stock.ts:488-494`), lido na montagem do item de venda (`lib/sales/drafts/sync-draft-items.ts:114-115`) e congelado em `valorCustoUnitario`/`valorCustoTotal` no item de venda (`services/drizzle/schema/sales.ts:187-191`). A cadeia fecha. |
| Atualização de preço de venda por markup na entrada | **AUSENTE** | Nenhuma ocorrência de markup ou regra de precificação por família. |

### 2.5 Pergunta específica de negócio — saída para empresa coligada

**AUSENTE, nas três formas possíveis.**

- **Transferência entre empresas/filiais:** não existe entidade de filial nem `filialId` em nenhum schema; a organização é a unidade fiscal e tem um CNPJ (`lib/fiscal/settings.ts:22-24`). Não há movimento de estoque de transferência: o enum de movimento tem `ENTRADA_AQUISICAO`, `SAIDA`, `AJUSTE`, `ENTRADA_DEVOLUCAO`, `SAIDA_PRODUCAO`, `ENTRADA_PRODUCAO`, `DESCARTE` (`services/drizzle/schema/enums.ts:305-313`) — nenhum de transferência.
- **Saída com finalidade específica:** as finalidades disponíveis são de documento fiscal de saída (NORMAL, COMPLEMENTAR, AJUSTE, DEVOLUCAO — `services/drizzle/schema/enums.ts:284`), aplicadas a uma venda. Não há saída sem venda com finalidade de remessa/transferência/bonificação.
- **Centro de custo / obra:** nenhuma ocorrência de `centroCusto`, `costCenter` ou `obra` no repositório. O rastreio disponível é por conta contábil (`accounts_charts`, `services/drizzle/schema/financial.ts:40-61`) — plano de contas com hierarquia, que é uma dimensão só, e já usada para a natureza da despesa.

O único mecanismo hoje que chegaria perto seria criar contas contábeis filhas por destino e lançar manualmente — o que não resolve o rastreio de **estoque**, apenas o financeiro, e ainda assim exigiria disciplina manual. **A resposta honesta é: o ERP não resolve esse problema hoje, e resolvê-lo é feature nova, não configuração.**

### 2.6 Dívida técnica e risco de correção — Parte 2

- **Dependência de LLM no caminho crítico de dados fiscais.** Duas chamadas a modelo por importação: extração com Sonnet (`lib/purchase/import.ts:61`) e matching com Haiku (`lib/purchase/match-products.ts:54`). O matching falha de forma segura (linhas ficam não mapeadas — `lib/purchase/match-products.ts:230-233`), mas a **extração não tem validação cruzada além da soma do total**, e o total é opcional. Um item lido com quantidade errada entra no estoque errado, silenciosamente. Com XML isso seria determinístico e gratuito.
- **Limite de 3 MB por arquivo** (`app/api/purchases/import-composition/route.ts:17`) e 120 s de execução (`app/api/purchases/import-composition/route.ts:14`) — DANFEs de atacado com muitas páginas podem estourar os dois.
- **Nenhum teste em `lib/purchase/`** — nem para `units.ts` (conversão de unidade, que mexe direto em quantidade de estoque e custo unitário), nem para `match-products.ts`, nem para `process-purchase-item-stock.ts` (custo médio). Nenhum arquivo `.test.ts` nesses diretórios.
- **Custo médio com quantidade negativa:** `computeNextUnitCost` tem guardas para saldo ≤ 0 e resultado negativo (`lib/purchase-processing/process-purchase-item-stock.ts:576-588`), o que é bom, mas a estratégia de fallback (manter o custo anterior) mascara inconsistência em vez de sinalizá-la.
- **Compra recebida é imutável** (`app/api/purchases/route.ts:454-470`). Defensável para integridade dos lotes, mas na operação real, correção de nota é rotina — e a única saída oferecida é cancelar e refazer, o que reprocessa estoque e custo médio.

### 2.7 Nota de maturidade — Parte 2

**1 / 5** — o de-para de fornecedor, a conversão de unidade e o custo médio são bem-feitos, mas o módulo não lê XML, não classifica a finalidade da entrada, não atribui CFOP, não rateia frete/ST no custo, não tem devolução de compra, e apresenta como funcionais um DF-e e uma manifestação do destinatário que são stubs.

---

## Parte 5 — TEF / POS, conciliação e fechamento de caixa

### 5.1 Captura de pagamento

| Item | Status | Evidência |
|---|---|---|
| **TEF (SiTef, PayGo, Auttar)** | **AUSENTE** | Nenhuma ocorrência no repositório. |
| **POS / Smart POS via API (Stone, Cielo, PagSeguro, Getnet, Rede)** | **AUSENTE** | Nenhuma ocorrência. Os únicos provedores previstos no enum são LOCAL, MERCADO_PAGO, STRIPE_CONNECT e PAGARME (`services/drizzle/schema/enums.ts:362`), e os três últimos lançam `Error("... ainda não implementado")` (`lib/payments/index.ts:23-34`). **O único provider real é o `LocalPaymentProvider`**, que grava linhas em `financial_transactions` (`lib/payments/providers/local.ts:18-104`). |
| Pinpad conectado ao PDV | **AUSENTE** | Consequência do acima: o valor é digitado na maquininha e depois informado no sistema. **Esta é exatamente a fonte clássica de divergência de caixa que você citou, e ela permanece.** |
| **PIX — QR estático ou dinâmico, webhook de PSP, baixa automática** | **AUSENTE** | PIX existe apenas como rótulo de método de pagamento (`lib/payments/defaults.ts:40`, `schemas/shop.ts:124`) e como padrão de texto no reconhecedor de extrato (`lib/financial-reconciliation/normalize.ts:70`). Não há BR Code, EMV, txid ou webhook de PSP. O único PIX real do sistema é o da **cobrança da própria assinatura SaaS via Stripe** (`app/api/integrations/stripe/generate-checkout/route.ts:167`) — não serve à loja. |
| Devolução de PIX | **AUSENTE** | `refundPayment` apenas marca a transação como `ESTORNADO` no banco (`lib/payments/providers/local.ts:105-112`). |
| Múltiplas formas na mesma venda | **IMPLEMENTADO** | O checkout recebe um array de splits (`lib/payments/types.ts:16-24`) e cada um vira transação própria (`lib/payments/providers/local.ts:19-104`) |
| Pagamento parcelado | **IMPLEMENTADO** | Parcelas de cartão de crédito geram N transações mensais com resto ajustado na última (`lib/payments/providers/local.ts:24-68`) |
| Pagamento parcial (venda sem quitação total) | **PARCIAL** | Suportado no financeiro (transações `PENDENTE` com `dataPrevisao`), mas a emissão fiscal bloqueia se a soma dos pagamentos for menor que o total da venda (`lib/fiscal/documents.ts:399-405`). |
| **Comportamento offline do PDV** | **AUSENTE** | Nenhum service worker, IndexedDB ou fila local no repositório. O único tratamento de offline é uma tela de bloqueio no terminal público de fidelidade (`app/(external)/point-of-interaction/[orgId]/_shared/providers/connection-status-provider.tsx:148-149`). **Sem internet, o PDV não vende.** Combinado com a ausência de contingência de NFC-e (§1.4), uma queda de link para a loja. |

### 5.2 Conciliação

| Item | Status | Evidência |
|---|---|---|
| **Conciliação de vendas com cartão (bruto, MDR, líquido, data de recebimento)** | **AUSENTE** | Nenhuma ocorrência de MDR, taxa de adquirente, valor líquido de cartão ou antecipação. O recebível é gravado pelo valor bruto (`lib/payments/providers/local.ts:47-49`). |
| **Importação de EDI de adquirente** | **AUSENTE** | Nenhuma ocorrência de EDI ou adquirente. |
| Recebível de cartão vira contas a receber com data prevista | **IMPLEMENTADO** | Parcelas criadas com `dataPrevisao` mensal e status `PENDENTE` (`lib/payments/providers/local.ts:41-58`) |
| Chargeback | **AUSENTE** | Nenhuma ocorrência. O mais próximo é o status `ESTORNADO` genérico. |
| Antecipação de recebíveis | **AUSENTE** | Nenhuma ocorrência. |
| **Conciliação bancária por OFX** | **IMPLEMENTADO** | Parser determinístico cobrindo OFX 1.x (SGML) e 2.x (XML), extrato de conta e de cartão, com decodificação windows-1252 e idempotência por FITID (`lib/financial-reconciliation/parse/ofx.ts:10-73`) |
| Conciliação por planilha (CSV/XLS/XLSX) | **IMPLEMENTADO** | Células lidas deterministicamente por SheetJS, com identificação de colunas por heurística e fallback de IA enviando só cabeçalhos e amostra (`lib/financial-reconciliation/parse/tabular.ts:15-18, 106-110`) |
| Conciliação por PDF/imagem de extrato | **IMPLEMENTADO** | `lib/financial-reconciliation/parse/document.ts`, modelo em `lib/financial-reconciliation/constants.ts:20` |
| Matching em estágios + confirmação humana | **IMPLEMENTADO** | Exato (janela 2 dias), heurístico (7 dias, score ≥ 0,6) e IA (`lib/financial-reconciliation/constants.ts:7-18`); confirmação sempre humana, com efetivação da transação pela data do extrato e aprendizado de regra (`lib/financial-reconciliation/sync.ts:52-60`, `lib/financial-reconciliation/rules.ts`) |
| **CNAB** | **AUSENTE** | Nenhuma ocorrência. |
| **Open Finance** | **AUSENTE (esqueleto presente)** | Tabela de conexões (`services/drizzle/schema/financial-reconciliation.ts:24-56`), gestão de conexão (`lib/integrations/openfinance/index.ts:14`), sync (`lib/integrations/openfinance/sync.ts:23`) e rota de cron existem — mas o único provider registrado é um mock que retorna lista vazia (`lib/integrations/openfinance/providers.ts:33-41`), e o cron `/api/cron/openfinance-sync` **nem sequer está agendado** no `vercel.json`. |

### 5.3 Fechamento de caixa

Esta é a parte mais bem resolvida da Parte 5.

| Item | Status | Evidência |
|---|---|---|
| Abertura e fechamento por operador identificado | **IMPLEMENTADO** | `abertaPorUsuarioId`, `fechadaPorUsuarioId`, `conferidaPorUsuarioId` (`services/drizzle/schema/sales-sessions.ts:32-34`); uma sessão aberta por escopo, com guarda de unicidade (`app/api/pos/sales-sessions/open/route.ts:33-38`) |
| Fundo de troco | **IMPLEMENTADO** | `saldoInicial` somado ao esperado de gaveta (`lib/sales-sessions/compute-session-expected-by-method.ts:43-46`) |
| Sangria e suprimento | **IMPLEMENTADO** | Geram lançamento contábil de transferência + transação financeira carimbada com a sessão (`lib/sales-sessions/register-movement.ts:37-60`) |
| Cálculo de divergência por forma de pagamento | **IMPLEMENTADO** | Esperado por método = Σ entradas − Σ saídas da sessão, lido só de `financialTransactions.sessaoVendaId` (`lib/sales-sessions/compute-session-expected-by-method.ts:28-48`); diferença por método e total congelados no fechamento (`lib/sales-sessions/close-sales-session.ts:57-67`) |
| Snapshot imutável no fechamento | **IMPLEMENTADO** | Linhas de conferência gravadas e sessão atualizada na mesma transação (`lib/sales-sessions/close-sales-session.ts:70-96`) |
| Bloqueio por pendência fiscal do turno | **IMPLEMENTADO** | Documentos não autorizados das vendas da sessão barram o fechamento quando configurado (`lib/sales-sessions/close-sales-session.ts:34-45`) |
| Confirmação explícita quando há diferença | **IMPLEMENTADO** | Dois cliques: o primeiro arma "CONFIRMAR DIFERENÇA E FECHAR" (`components/Modals/Internal/SalesSessions/CloseSalesSession.tsx:85-95`) |
| **Conferência cega** | **PARCIAL — só na UI** | A flag existe (`schemas/organizations.ts:200`) e esconde os valores na tela (`components/Modals/Internal/SalesSessions/CloseSalesSession.tsx:157, 193, 203`). **Mas o servidor calcula e devolve `resumoEsperado` na resposta independentemente da flag** (`app/api/pos/sales-sessions/route.ts:43-47, 67`). Quem abrir o DevTools vê o esperado antes de contar. Como controle antifraude, não vale. |
| Fechamento assistido por dados de TEF/PIX/adquirente | **AUSENTE** | Consequência de §5.1 e §5.2 — não há fonte externa para assistir o fechamento. O "esperado" é a soma do que o próprio operador registrou. |
| Trilha de auditoria | **PARCIAL** | Há autoria por usuário nas transições e observações de abertura/fechamento (`services/drizzle/schema/sales-sessions.ts:32-34, 43-44`), e `operadorId` em cada movimento de estoque (`lib/purchase-processing/process-purchase-item-stock.ts:485`). Não há log de eventos da sessão (só três timestamps/autores), nem trilha de alteração. |

### 5.4 Dívida técnica e risco de correção — Parte 5

- **O "esperado" do caixa é circular.** Como não há TEF nem PSP, o valor esperado por método é a soma do que o operador digitou na venda. Uma venda em que o operador escolheu "PIX" mas o cliente pagou em dinheiro fecha o caixa sem divergência aparente. **O fechamento de caixa está bem implementado sobre uma fonte de dados que não é independente do operador** — que é justamente o que um fechamento deveria detectar.
- **Nenhum teste em `lib/sales-sessions/`.** Nem para `compute-session-expected-by-method.ts` nem para `close-sales-session.ts`.
- **`escopoChave` é o vendedor responsável, não o terminal** (`services/drizzle/schema/sales-sessions.ts:29-30`, comentário admite "terminal no futuro"). Com caixa + expedição na Ampere+, se dois operadores usarem o mesmo cadastro de vendedor, compartilham sessão; se um vendedor operar dois terminais, o sistema não distingue.
- **Conciliação bancária depende de IA em dois pontos** (mapeamento de colunas de planilha e extração de PDF), mas o caminho OFX é 100 % determinístico e idempotente por FITID — **oriente a Ampere+ a usar OFX**, é o caminho seguro.

### 5.5 Nota de maturidade — Parte 5

**2 / 5** — o fechamento de caixa e a conciliação bancária por OFX são de boa qualidade, mas não existe captura integrada de pagamento (TEF, POS, PIX), nem conciliação de adquirente, nem operação offline, e a conferência cega é apenas visual.

---

## Consolidado dos achados por criticidade

### Bloqueadores para a operação da Ampere+

| # | Achado | Onde |
|---|---|---|
| 1 | Entrada de nota não lê XML — só PDF/imagem via LLM | `lib/purchase/import.ts:4` |
| 2 | Entrada não classifica finalidade (revenda / uso e consumo / imobilizado) nem atribui CFOP | `services/drizzle/schema/purchases.ts:72-111` |
| 3 | DF-e e manifestação do destinatário são stubs que **registram manifestações que não aconteceram** | `lib/fiscal/inbound/providers.ts:3-17` |
| 4 | Nenhuma obrigação acessória (SPED, EFD-Contribuições, ECD, Bloco K, Inventário) e sem exportação em lote para o contador | ausência; `app/api/fiscal/document-assets/route.ts:9-13` |
| 5 | Sem contingência de NFC-e e sem PDV offline — queda de link para a loja | `lib/fiscal/providers/spedy/mappers/invoice.ts:79` |
| 6 | Sem rateio de frete/ST/IPI no custo de entrada → custo subavaliado e margem falsa | `lib/purchase-processing/process-purchase-item-stock.ts:172-174` |
| 7 | Recebimento parcial não movimenta estoque (status decorativo) | `app/api/purchases/route.ts:308-310` |

### Riscos de correção e de confiança

| # | Achado | Onde |
|---|---|---|
| 8 | Certificado A1 em caminho com prefixo `public/` em bucket que serve URLs públicas — **verificar antes de tudo** | `lib/files-storage/index.ts:153-161`; `app/dashboard/fiscal/fiscal-page.tsx:1098-1102` |
| 9 | Motor tributário (296 linhas) sem nenhum teste, e sem CI no repositório | `lib/fiscal/engine/taxation.ts`; ausência de `.github/` |
| 10 | Sem DIFAL em venda interestadual a consumidor final | ausência |
| 11 | Sem CST de ICMS — impossível emitir para regime normal (bloqueia venda do produto fora do Simples) | `services/drizzle/schema/enums.ts:299` |
| 12 | Conferência cega é só visual; o servidor entrega o esperado ao cliente | `app/api/pos/sales-sessions/route.ts:43-47` |
| 13 | Redução de base enviada como `pRedBC = 0` com base já reduzida | `lib/fiscal/providers/spedy/mappers/imposto.ts:11` |
| 14 | CC-e sempre com sequência 1 | `lib/fiscal/providers/spedy/documents.ts:118` |
| 15 | Devolução fiscal só da venda inteira | `lib/fiscal/documents.ts:784-822` |
| 16 | Documentação interna desatualizada descreve provedor que não é mais usado | `docs/FISCAL-ALL-IN-ONE-AUDIT.md`; `lib/fiscal/auto-emission-capability.ts:6` |

### O que está genuinamente pronto e é ativo para a migração

- Emissão de NFC-e e NF-e com fila, retry, lock, numeração atômica e trilha de eventos (`lib/fiscal/documents.ts`, `lib/fiscal/worker.ts`)
- Motor de cenário tributário por UF / destinatário / finalidade com resolução por especificidade (`lib/fiscal/engine/rules.ts`)
- De-para fornecedor → produto com aprendizado, e conversão de unidade com fator (`lib/purchase/match-products.ts`, `lib/purchase/units.ts`)
- Custo médio ponderado móvel com trilha completa por movimento (`lib/purchase-processing/process-purchase-item-stock.ts:443-495`)
- Plano de contas, competência e partida dobrada 1:1 com validação de balanceamento (`services/drizzle/schema/financial.ts`, `lib/finances/accounting-entry-balance.ts`)
- Sessão de caixa com sangria, suprimento, esperado por método e snapshot imutável (`lib/sales-sessions/`)
- Conciliação bancária por OFX, determinística e idempotente (`lib/financial-reconciliation/parse/ofx.ts`)

---

## O que eu precisaria ver para fechar os pontos INCERTOS

| Ponto | O que falta |
|---|---|
| Exposição do certificado A1 (§1.9) | Flag `public` do bucket `files` no painel Supabase e as policies de `storage.objects` |
| Cobertura real da Spedy | Contrato/OpenAPI da Spedy: se ela cobre DF-e, contingência SVC, NFS-e e campos da reforma tributária. Isso muda o esforço de vários itens de "implementar" para "integrar" |
| Comportamento em produção do motor tributário | Um lote de notas reais da Ampere+ processadas em homologação e comparadas item a item com o ERP atual. Sem isso, nenhum número aqui sobre acurácia de cálculo é verificável — só a estrutura é |
