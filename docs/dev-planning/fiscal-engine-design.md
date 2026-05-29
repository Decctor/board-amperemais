# Motor fiscal — design e estruturação

Data: 2026-05-28
Branch: `claude/fiscal-engine-Hl2EZ` (implementação, a partir de `fiscal-module`)
Status: **Fases 0–2 implementadas** (ver §11)
Contexto base: `docs/FISCAL-ALL-IN-ONE-AUDIT.md` (branch `fiscal-module`)

## Decisões de escopo (1º ciclo)

| Dimensão | Decisão | Implicação |
|---|---|---|
| Regime tributário | **Simples Nacional primeiro** (CRT 1/4) | Usa **CSOSN**, não CST de ICMS. PIS/COFINS saem com CST 49/valor zero (recolhidos no DAS). |
| Modelo de regras | **Grupos tributários reutilizáveis + exceções por cenário** (híbrido A+C) | Produto aponta para um grupo; exceções por UF/destinatário ficam em tabela-filha. |
| Abrangência | **Intraestadual + interestadual** | Exige resolução de CFOP 5.xxx vs 6.xxx, alíquotas interestaduais e tratamento de ST. |

---

## 1. Diagnóstico: o que falta hoje

O módulo atual é uma **camada de integração** com a Nuvem Fiscal, não um **motor de apuração**.

Evidência direta nos mappers (`lib/fiscal/providers/nuvem-fiscal/mappers/nfce.ts` e `nfe.ts`):

```js
imposto: { vTotTrib: 0 }              // bloco de impostos do item vazio
total: { ICMSTot: { vICMS: 0, vPIS: 0, vCOFINS: 0, ... } }   // totais zerados
```

Não há grupo `ICMS`/`ICMSSN`, `PIS` nem `COFINS` por item. O payload é sintaticamente válido, mas **tributariamente vazio** — aceitável como protótipo de integração, rejeitável (ou incorreto) em produção.

Modelos de dados atuais e o que lhes falta:

| Tabela | Tem hoje | Falta para o motor |
|---|---|---|
| `productFiscalProfiles` | origem, NCM, CEST, CFOP padrão, unidade, cód. benefício | CST/CSOSN, alíquotas, vínculo a grupo tributário |
| `fiscalOperationProfiles` | finalidade, presença, CFOP padrão, natureza | (mantém-se como dimensão "operação"; sem tributo) |
| `OrganizationFiscalConfig` | `regimeTributario` (CRT) | nada consome o CRT para decidir CSOSN vs CST |

**Lacuna central:** não existe a camada que, dado `(regime + operação + UF origem→destino + destinatário + NCM/produto)`, **decide** CSOSN/CST, **calcula** bases e valores de ICMS/PIS/COFINS, **resolve** o CFOP do cenário e **valida** o item antes de enviar ao provider.

---

## 2. Como ERPs maiores modelam (referência)

Bling, Tiny, Omie, TOTVS Protheus e SAP convergem para 3 camadas:

1. **Identidade fiscal do produto** — NCM, CEST, origem, unidade. O que o produto *é*. (Já existe.)
2. **Grupo/cenário tributário reutilizável** — "como esta classe de produto é tributada". No Protheus é o **TES**; no Bling/Tiny é o "grupo de tributação". Muitos produtos → um grupo.
3. **Matriz de resolução por operação** — CST/CSOSN, CFOP e alíquota **finais** dependem da combinação `(regime × operação × UF origem→destino × destinatário contribuinte?)`, resolvida **no momento da emissão**.

Anti-padrões a evitar:
- **Cravar alíquota/CST no produto** (opção B): quebra na 1ª venda interestadual ou mudança de alíquota; obriga reconfigurar milhares de produtos.
- **Matriz pura por `(regime+UF+NCM)`** (opção C): explode em combinações e ninguém consegue popular.

**Recomendação adotada:** híbrido — **grupos tributários** (base mantível) **+** tabela-filha de **exceções por cenário** só para o que varia por UF/destinatário.

---

## 3. Simplificações por escolher Simples Nacional (importante)

Estas reduzem muito o esforço da Fase 1 — e evitam construir o que o SN não exige:

- **ICMS por CSOSN**, não CST. Casos dominantes no varejo:
  - `CSOSN 102` — sem permissão de crédito (mais comum no balcão).
  - `CSOSN 101` — com permissão de crédito de ICMS (informa `pCredSN`/`vCredICMSSN`).
  - `CSOSN 500` — ICMS já cobrado anteriormente por **substituição tributária**.
  - `CSOSN 400` — não tributada pelo SN.
- **PIS/COFINS**: em regra **CST 49** ("outras operações de saída") com **valor zero** na NFC-e/NF-e, pois são recolhidos dentro do DAS. Isso elimina a necessidade de motor de PIS/COFINS na Fase 1.
- **DIFAL de partilha (EC 87/2015)**: optante do SN **não recolhe** o diferencial em venda a consumidor final não contribuinte de outra UF (ADI 5464 / cláusula 9ª suspensa). Logo, interestadual B2C do SN precisa só de **CFOP 6.xxx + CSOSN corretos** — sem cálculo de DIFAL. **Não construir DIFAL agora.**
- **ICMS-ST** (`CSOSN 500` / produtos com `CEST`) **continua aplicável** e é a parte pesada: exige MVA por NCM/UF. Tratar como fase posterior com fonte de dados explícita (ver §7).

> Resumo: para a maioria das vendas SN (intra e interestadual B2C sem ST), a Fase 1 entrega nota tributariamente correta com CSOSN 101/102 + PIS/COFINS CST 49 zero. ST e B2B com crédito vêm depois.

---

## 4. Modelo de dados proposto

### 4.1 Novo: `fiscalTaxGroups` (grupos de tributação)

Escopo por organização, nomeado, reutilizável. Carrega os **defaults intraestaduais**.

Campos (nomes Drizzle camelCase / coluna snake_case PT):
- `organizacaoId`, `nome`, `descricao`, `ativo`, `dataInsercao`
- ICMS (SN): `csosn` (enum), `aliquotaIcms` (numérico, p/ casos com débito), `percentualReducaoBc`, `modalidadeBc`
- ST: `temSubstituicaoTributaria` (bool), `mvaSt`, `aliquotaIcmsSt`, `aliquotaInternaDestino` — opcionais, preenchidos na fase ST
- Crédito SN (CSOSN 101): `percentualCreditoSn`
- PIS: `cstPis` (default `49`), `aliquotaPis` (default 0)
- COFINS: `cstCofins` (default `49`), `aliquotaCofins` (default 0)
- IPI: `cstIpi`, `aliquotaIpi` — opcional, fora do MVP de varejo SN

### 4.2 Novo: `fiscalTaxGroupRules` (exceções por cenário) — filha de `fiscalTaxGroups`

Só existe quando o grupo precisa variar. Resolução por especificidade (regra mais específica vence).

- `grupoTributarioId` (FK cascade)
- `escopoUf`: enum `INTRAESTADUAL` | `INTERESTADUAL` | UF específica (ex.: `SP`)
- `indicadorDestinatario`: `CONTRIBUINTE` | `NAO_CONTRIBUINTE` | `QUALQUER`
- `finalidade`: reaproveita `FiscalOperationFinalityEnum` | `QUALQUER`
- Overrides: `csosn`, `cfop`, `aliquotaIcms`, `temSubstituicaoTributaria`, `mvaSt`, `aliquotaIcmsSt`...
- `dataInsercao`

### 4.3 Alteração: `productFiscalProfiles`

- Adicionar `grupoTributarioId` (FK nullable → `fiscalTaxGroups`).
- Mantém NCM/CEST/origem/unidade (identidade do produto).
- Migração: criar 1 grupo "padrão" por organização e vincular perfis existentes (backfill).

### 4.4 Sem alteração estrutural

- `fiscalOperationProfiles` permanece como a dimensão "operação" (finalidade, presença, natureza, CFOP padrão intra).
- `OrganizationFiscalConfig.regimeTributario` passa a ser **lido** pelo motor (hoje é ignorado).

### Diagrama de relações

```
organization 1───* fiscalTaxGroups 1───* fiscalTaxGroupRules
                          ▲
                          │ grupoTributarioId (nullable)
                          │
product 1───* productFiscalProfiles
fiscalOperationProfiles (operação)   ── entram como dimensões na resolução
```

---

## 5. O motor (`lib/fiscal/engine/`)

Camada **pura** (sem I/O, sem provider), testável isoladamente.

### 5.1 Entrada e saída

```ts
// resolução por item
type TResolveItemTaxInput = {
  regime: number;                 // CRT do emitente
  operacao: TFiscalOperationProfileEntity;
  ufOrigem: string;
  ufDestino: string;
  destinatario: { contribuinte: TFiscalClientTaxIndicatorEnum; consumidorFinal: boolean };
  produtoPerfil: TProductFiscalProfileEntity;
  grupo: TFiscalTaxGroupEntity & { regras: TFiscalTaxGroupRuleEntity[] };
  item: { quantidade; valorUnitario; valorBruto; valorDesconto };
};

type TItemTaxResult = {
  cfop: string;
  origem: string;
  icms: { csosn: string; vBC: number; pICMS: number; vICMS: number;
          st?: { vBCST; pMVAST; pICMSST; vICMSST } | null;
          credSN?: { pCredSN; vCredICMSSN } | null };
  pis: { cst: string; vBC: number; pPIS: number; vPIS: number };
  cofins: { cst: string; vBC: number; pCOFINS: number; vCOFINS: number };
  vTotTrib: number;               // Lei 12.741 — ver §7 (IBPT)
  erros: TFiscalValidationError[];
};
```

### 5.2 Funções

- `resolveCfop({ operacao, ufOrigem, ufDestino, consumidorFinal })` → 5.xxx vs 6.xxx, deriva sufixo da `cfopPadrao` da operação/produto.
- `resolveCsosn({ grupo, regras, cenário })` → aplica a regra mais específica.
- `computeItemTaxation(input): TItemTaxResult` → orquestra ICMS(SN)/PIS/COFINS/ST.
- `computeDocumentTotals(items): ICMSTot` → soma para o bloco `total`.
- `aliquotaInterestadual(ufOrigem, ufDestino, origemMercadoria)` → tabela estática (7% / 12% / **4%** para importados).
- `validateItem(input)` / `validateDocument(...)` → erros estruturados **antes** do provider.

### 5.3 Tabelas estáticas (em `lib/fiscal/engine/data/`)

- `UF_TO_IBGE_CODE` — mover do mapper para cá (hoje duplicado em `nfce.ts`).
- `aliquotas-interestaduais.ts` — matriz origem→destino.
- (Fase ST) MVA por NCM/UF — fonte externa, ver §7.

---

## 6. Integração com o que já existe

### 6.1 Mappers

`nfce.ts` / `nfe.ts` deixam de hardcodar `imposto: { vTotTrib: 0 }`. Para cada item chamam o motor e montam o grupo correto:

```ts
const tax = computeItemTaxation({ ... });
return {
  ...prod,
  imposto: {
    vTotTrib: tax.vTotTrib,
    ICMS: { ICMSSN102: { orig, CSOSN: tax.icms.csosn } },   // por CSOSN
    PIS:    { PISOutr:  { CST: tax.pis.cst, vBC: 0, pPIS: 0, vPIS: 0 } },
    COFINS: { COFINSOutr:{ CST: tax.cofins.cst, vBC: 0, pCOFINS: 0, vCOFINS: 0 } },
  },
};
// total.ICMSTot ← computeDocumentTotals(items)
```

O `switch` por CSOSN (101→`ICMSSN101`, 102/103/300/400→`ICMSSN102`, 500→`ICMSSN500`...) fica isolado num helper do mapper.

### 6.2 Validação pré-envio (`lib/fiscal/documents.ts`)

Estender o `readiness` atual: rodar `validateDocument` (NCM ausente, grupo não vinculado, UF destino sem endereço, CSOSN×CFOP incoerentes) e **persistir os erros em `mensagens`** com status interno de bloqueio, **antes** de chamar o provider. Evita rejeição cara da SEFAZ por erro detectável localmente.

### 6.3 Onde o destinatário vem

`indicadorInscricaoEstadual` já existe em `FiscalClientProfileSchema` — passa a ser entrada obrigatória da resolução (define contribuinte vs não, e portanto CFOP/CSOSN do cenário interestadual).

---

## 7. `vTotTrib` via tabela IBPT (decidido)

### 7.0 Verificar antes de construir (build-vs-buy)

A Nuvem Fiscal **pode** calcular o `vTotTrib` por NCM no lado dela (vários providers expõem um flag tipo `calculoAutomaticoIbpt`). **Antes de construir o pipeline abaixo, confirmar na doc/sandbox da Nuvem Fiscal** se existe esse cálculo automático. Se existir, basta habilitar o flag e enviar `vTotTrib` ausente/zero — pula-se a tabela inteira. O desenho a seguir é o caminho caso a Nuvem Fiscal **não** calcule.

### 7.1 Decisão de armazenamento: tabela no Postgres (não JSON empacotado)

Motivo = volume + cadência de atualização. A IBPT é distribuída **por UF** (27 arquivos CSV `;`-delimitados, encoding latin1, ~12–15k NCMs cada → **~350–400k linhas**) e tem **vigência** (atualiza ~a cada 6 meses, fora do ciclo de release).

| Opção | Veredito |
|---|---|
| JSON/CSV empacotado no repo | ❌ ~30–60 MB no bundle; atualizar exige redeploy; pesado em memória serverless |
| Só arquivo na nuvem, parse em runtime | ❌ lento e repetido a cada cold start |
| **Postgres + import script + cache** | ✅ indexado, consulta barata, atualiza sem deploy |

**Fonte dos arquivos:** os CSVs por UF (ex.: De Olho no Imposto / portais que disponibilizam download) ficam no **Supabase Storage** como proveniência; o **import script** popula a tabela.

### 7.2 Tabela `fiscalIbptRates` (referência global, sem `organizacaoId`)

Dado **compartilhado** entre organizações — não leva tenancy.

- `id`, `ncm` (8 dígitos), `uf`, `exTipi` (nullable)
- `descricao`
- `aliquotaNacionalFederal`, `aliquotaImportadosFederal`, `aliquotaEstadual`, `aliquotaMunicipal` (numéricos, %)
- `versao`, `vigenciaInicio`, `vigenciaFim`, `chave`, `fonte`
- `dataInsercao`
- Índice em `(ncm, uf)`; consulta filtra a vigência válida na data de emissão.

### 7.3 Lookup no motor (`lib/fiscal/engine/ibpt.ts`)

```
vTotTrib(item) = vProd × (federal + estadual + municipal) / 100
```
- `federal` = `aliquotaImportadosFederal` se origem for importada (origemMercadoria 1/2/3/8), senão `aliquotaNacionalFederal`.
- Seleção: linha de `(ncm, uf)` com vigência cobrindo a data de emissão; **fallback por prefixo de NCM** se não houver match exato; se nada → `vTotTrib = 0` + warning na validação (não bloqueia).
- **Cache em memória** (LRU por instância) para `(ncm, uf, vigência)` quentes.
- Guardar `chave`/`versao`/`fonte` da IBPT para rastreabilidade (e eventual `infAdProd`/observação, se a UF exigir).

### 7.4 Import script

- Lê o CSV por UF do Supabase Storage (latin1 → utf8), faz **upsert** por `(ncm, uf, versao)`.
- Disparo manual (admin) ou cron quando sair nova vigência; idempotente.

## 7.5 Demais pontos em aberto

- **MVA / ICMS-ST por NCM+UF**: **configuração manual por grupo tributário** por enquanto (decidido). Sem fonte automática nesta fase; campos `mvaSt`/`aliquotaIcmsSt`/`aliquotaInternaDestino` ficam no grupo/regra e são preenchidos à mão. Integração de tabela ST fica para depois, se houver demanda.
- **Benefícios fiscais / `cBenef`**: já há `codigoBeneficioFiscal` no perfil; mapear quando houver caso real.

---

## 8. Faseamento sugerido

| Fase | Entrega | Depende de |
|---|---|---|
| **0 — Modelagem** | `fiscalTaxGroups` + `fiscalTaxGroupRules` + FK no perfil; backfill grupo padrão; CRUD/UI mínima de grupos | — |
| **1 — Motor SN intra** | `computeItemTaxation` para CSOSN 101/102/400 + PIS/COFINS CST 49; totais; testes unitários por cenário | Fase 0 |
| **2 — Mappers + validação + IBPT** | mappers consomem o motor (ICMSSN/PIS/COFINS reais); `validateDocument` pré-envio; `vTotTrib` (verificar cálculo automático da Nuvem Fiscal §7.0; senão tabela `fiscalIbptRates` + import script) | Fase 1 |
| **3 — Interestadual** | CFOP 6.xxx, alíquotas interestaduais, regras por UF/destinatário; (sem DIFAL p/ SN) | Fase 2 |
| **4 — ST + hardening** | CSOSN 500/ST com MVA; bateria de homologação por UF; catálogo de rejeições acionáveis | Fase 3 |

A Fase 1+2 já entrega **NFC-e de balcão e NF-e intraestadual tributariamente corretas** para optante do SN — o maior salto de risco do score 3/10.

---

## 9. Critérios de aceite (Fases 1–2)

- Item com grupo CSOSN 102 gera `ICMSSN102` + `PISOutr`/`COFINSOutr` CST 49 valor zero, e `vTotTrib` preenchido.
- `total.ICMSTot` bate com a soma dos itens (vProd, vDesc, vNF) — sem zeros indevidos.
- Documento sem NCM, sem grupo vinculado, ou com CSOSN×CFOP incoerente é **bloqueado localmente** com mensagem acionável, sem ir ao provider.
- Testes unitários do motor cobrem: intra balcão, intra com crédito (101), interestadual B2C, produto sem perfil (erro).
- Homologação: emissão autorizada em ambiente de homologação para ≥1 cenário real por tipo de documento.

---

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Popular grupos é trabalhoso para o lojista | Grupo padrão no onboarding + sugestão de CSOSN por regime; importação por NCM |
| ST sem fonte de MVA confiável | Adiar para Fase 4; config manual no grupo enquanto isso; deixar claro no produto |
| `vTotTrib` zerado fere Lei 12.741 | Integrar IBPT na Fase 2 |
| Refactor dos mappers sem rede | Testes unitários do motor + snapshot de payload antes/depois |
| TS global do projeto com erros (ver auditoria) | Motor isolado em `lib/fiscal/engine/` com tipos próprios e testes, reduz dependência do estado global |

---

## 11. Status de implementação

Implementado nesta branch (`claude/fiscal-engine-Hl2EZ`), a partir de `fiscal-module`:

**Fase 0 — Modelagem** ✅
- Enums `FiscalIcmsCsosnEnum`, `FiscalPisCofinsCstEnum`, `FiscalTaxRuleScopeEnum` (Zod + pgEnum).
- Tabelas `fiscalTaxGroups` e `fiscalTaxGroupRules`; FK `grupoTributarioId` em `productFiscalProfiles`.
- Schemas Zod e tipos inferidos.

**Fase 1 — Motor puro** (`lib/fiscal/engine/`) ✅
- `cfop.ts`, `rules.ts`, `taxation.ts`, `validation.ts`, `data/uf.ts`, `data/aliquotas-interestaduais.ts`.
- `computeItemTaxation` (ICMS/CSOSN, crédito SN, ST manual, PIS/COFINS) + `computeDocumentTotals`.
- Validado por smoke test (22 cenários). Todos os imports externos são `import type` → motor sem dependência de runtime.

**Fase 2 — Integração** ✅
- `lib/fiscal/taxation-context.ts`: `computeSaleTaxation` (fonte única para validação e mappers).
- Mappers NFC-e/NF-e consomem o motor: bloco `imposto` real (ICMSSN/PIS/COFINS) e `ICMSTot` calculado.
- `lib/fiscal/documents.ts`: carrega grupos com regras no contexto e roda `assertFiscalTaxationValid` antes do provedor.

### Pendências antes de produção

- **`db:push`**: o schema novo (tabelas + enums + coluna) precisa ser aplicado (`npm run db:push`).
- **`vTotTrib`**: ainda 0 (seam pronto em `computeItemTaxation`). Verificar §7.0 (cálculo automático da Nuvem Fiscal) antes de construir a tabela IBPT.
- **UI/CRUD** de grupos tributários e vínculo no perfil do produto (Fase 0 não inclui telas).
- **Backfill**: criar grupo padrão por organização e vincular perfis existentes.
- **Validação de campos exatos** do payload ICMSSN/PIS/COFINS contra a sandbox da Nuvem Fiscal (leiaute oficial NF-e 4.00 seguido; confirmar em homologação).
- **Verificação não pôde rodar `tsc`/lint completos** no ambiente (policy de rede bloqueia `npm ci` por causa do pacote `xlsx` via CDN). Typecheck foi feito de forma dirigida nos arquivos fiscais + smoke test do motor.

---

## 12. Roadmap P0–P1 (em execução)

Decisões: fila = **outbox (fiscalDocuments) + Vercel Cron**; token = **remover 100% o fallback**; catálogo de rejeições = **constante na codebase** (sem tabela/CRUD).

### Etapa 1 — Remover fallback de token
- `providers/nuvem-fiscal/client.ts`: exigir `apiToken` da organização; remover `process.env.NUVEM_FISCAL_API_TOKEN`. `baseURL` dirigido pelo `ambiente` da org.
- `assertFiscalReadiness`: validar token por org antes de emitir/sincronizar empresa.

### Etapa 2 — vTotTrib via IBPT (compliance Lei 12.741)
- Tabela global `fiscalIbptRates (ncm, uf, aliqNacionalFederal, aliqImportadosFederal, aliqEstadual, aliqMunicipal, versao, vigenciaInicio/Fim, chave)`.
- `scripts/import-ibpt.ts`: importa do JSON por UF de github.com/nfe/ibpt; upsert por `(ncm, uf, versao)`.
- `lib/fiscal/engine/ibpt.ts`: lookup puro (`fed+est+mun`, nacional vs importado por origem).
- `buildSaleFiscalContext` carrega as taxas dos NCMs+UF e anexa ao contexto; `taxation-context` preenche o seam `vTotTrib`. Motor segue puro.
- vTotTrib é opcional no XSD (não bloqueia autorização) mas exigido pela Lei 12.741 p/ B2C. Confirmar comportamento da Nuvem Fiscal em sandbox.

### Etapa 3 — Outbox + Vercel Cron
- `fiscalDocuments`: + `proximaTentativaEm`, `bloqueadoEm` (claim). `tentativasEnvio` já existe.
- `process-sale-confirmation`: emissão síncrona → enqueue (cria doc `PRONTO_PARA_ENVIO` + número reservado, retorna na hora).
- `lib/fiscal/worker.ts`: claim transacional → emite → aplica retorno; falha transitória agenda backoff exponencial; esgota tentativas → `ERRO`.
- Rota `/api/fiscal/worker` protegida + cron em `vercel.json` (1–2 min).

### Etapa 4 — Catálogo de rejeições (constante na codebase)
- `lib/fiscal/rejections.ts`: mapa `cStat -> { descricao, causaProvavel, acaoSugerida, categoria, reenviavel }`. Sem tabela.
- Parsing do `cStat`/motivo em `applyProviderDocumentDetails`; gravar `codigoRejeicao` no documento.
- Lookup resolvido em runtime para exibição.

### Etapa 5 — Painel na fiscal-page
- Cards de resumo por status + filtro de problemáticos na aba Documentos.
- Detalhe de rejeição (código + causa/ação do catálogo) e ações operacionais.

Schema novo (etapas 2–4) aplicado num único `db:push` ao final.

### Status P0–P1 (implementado)

- **Etapa 1** ✅ token por organização exigido; fallback global removido; baseURL por ambiente.
- **Etapa 2** ✅ `fiscalIbptRates` + `engine/ibpt.ts` + `import:ibpt`; vTotTrib preenchido por NCM+UF.
- **Etapa 3** ✅ outbox (`proximaTentativaEm`/`bloqueadoEm`) + `lib/fiscal/worker.ts` + cron `/api/cron/fiscal-queue` (2min); venda enfileira via `enqueueFiscalDocument`.
- **Etapa 4** ✅ `lib/fiscal/rejections.ts` (catálogo constante) + captura de `cStat` → `codigoRejeicao`.
- **Etapa 5** ✅ filtro por status + detalhe acionável de rejeição na aba Documentos.

Pendências de ativação: `npm run db:push` (colunas/tabela novas), `npm run import:ibpt ./ibpt-data`, definir `CRON_SECRET`, e backfill de grupo padrão. Confirmar campos do payload e comportamento do vTotTrib em sandbox.

---

## 13. Roadmap P2 — completude do motor (planejado)

Escopo decidido: **NFC-e vs NF-e automático** + **FCP**. Variantes: mantida a herança do produto base (sem CRUD por variante). IPI: adiado (varejo SN não é contribuinte). ST: já manual.

### Item A — Seleção automática NFC-e vs NF-e
Hoje a auto-emissão é cravada em `NFCE` (`process-sale-confirmation`). Sinais já existentes na venda: `canal`, `entregaModalidade`, `entregaLocalizacaoId`, CPF/CNPJ do destinatário.

- `lib/fiscal/document-type.ts`: `resolveAutoDocumentType({ venda, cliente })` →
  - destinatário com CNPJ (B2B) → **NFE**
  - canal `SHOP`, ou com entrega/`entregaLocalizacaoId` → **NFE**
  - caso contrário (balcão/presencial) → **NFCE**
- Fallback: se o tipo resolvido não tiver operação/série configurada, cai para NFCE (default varejo); readiness surfa erro claro se nada configurado.
- `process-sale-confirmation` passa o `tipo` resolvido para `enqueueFiscalDocument`. Fila/worker já são agnósticos ao tipo.

### Item B — FCP (Fundo de Combate à Pobreza)
- Schema: `fiscalTaxGroups` + `fiscalTaxGroupRules` ganham `aliquotaFcp` e `aliquotaFcpSt` (Zod + pgEnum n/a; doublePrecision).
- Engine: `computeIcms` calcula `vFCP` (sobre BC de ICMS quando há débito) e `vFCPST` (sobre BC de ST). `TIcmsTaxResult`/`TEffectiveTaxConfig`/`TDocumentTaxTotals` ganham os campos; totais somam.
- Mappers: preenchem `vFCP` no grupo ICMS aplicável e `vFCPST` no grupo ST; `ICMSTot.vFCP`/`vFCPST` deixam de ser 0.
- UI: campos de FCP no bloco ICMS/ST do modal de grupo tributário.
- FCP no SN aparece sobretudo no caminho de ST (CSOSN 201/202/203/500/900); acoplado ao que já existe.

Schema novo (FCP) entra no mesmo `db:push` pendente.

### Status P2 (implementado)

- **Item A** ✅ `lib/fiscal/document-type.ts` (regra CNPJ/SHOP/entrega → NF-e, fallback NFC-e); `process-sale-confirmation` decide o tipo antes de enfileirar.
- **Item B** ✅ FCP: `aliquotaFcp`/`aliquotaFcpSt` no grupo e regras; motor calcula `vFCP`/`vFCPST` e soma nos totais; mappers e UI atualizados. Validado por smoke (9 cenários).
- Variantes: mantida herança do produto base (sem trabalho). IPI: adiado.

Schema novo (FCP) entra no mesmo `db:push` pendente.

---

## 14. Roadmap P3 — ciclo de vida fiscal (planejado)

Escopo de SAÍDA decidido: **CC-e + Inutilização + NF-e de devolução**. Contingência/NFS-e adiados. Manifestação do destinatário tratada à parte como **módulo de entrada (P3-Entrada / DF-e)**, por ser arquitetura inbound separada (ver §15).

Comum a todos: novos event types (Zod + pgEnum), métodos no `IFiscalProvider` (impl Nuvem Fiscal + stub manual), confirmação de endpoints/campos na sandbox.

### Item A — CC-e (Carta de Correção)
- `IFiscalProvider.cartaCorrecaoDocumento`; impl Nuvem Fiscal (~`POST /nfe/{id}/carta-correcao`, `correcao` + `sequencia_evento`).
- Guard: só `NFE` autorizada (NFC-e não aceita CC-e). Não muda status; gera evento + XML de evento.
- Event type `CARTA_CORRECAO`; serviço `registerFiscalCorrection`; rota `POST /api/fiscal/documents/correction`; ação no menu do documento.

### Item B — Inutilização de numeração
- `IFiscalProvider.inutilizarNumeracao` (~`POST /nfe|nfce/inutilizacoes`: cnpj/ano/modelo/série/faixa/justificativa).
- Trigger: documento em `ERRO` com `numero` reservado → inutiliza; status → `INUTILIZADA` (enum já existe). Opcional: faixa manual por série.
- Event type `INUTILIZACAO`; serviço + rota + ação na tela (docs com erro).

### Item C — NF-e de devolução
- Emissão com `finalidade=DEVOLUCAO`, `refNFe` da original, vínculo via `documentoOrigemId`/`chaveAcessoReferencia` (colunas já existem).
- Motor: caminho de **CFOP de entrada** (1.202/2.202) — `resolveCfop` hoje só alterna 5/6 (saída); adicionar resolução de devolução.
- Fluxo de UI: gerar devolução a partir de venda/documento autorizado.

---

## 15. P3-Entrada — Distribuição DF-e e manifestação do destinatário (planejado, módulo à parte)

Inbound (notas recebidas), separado do motor de saída. Pareia com o módulo de Compras.

- **Provider:** Distribuição DF-e — consultar por cursor `NSU` (incremental) + registrar eventos de manifestação (ciência 210210, confirmação 210200, desconhecimento 210220, não realizada 210240).
- **Dados:** `fiscalInboundDocuments` (chave, fornecedor, valor, dataEmissão, `nsu`, situação resumo/completo, evento atual, `xmlStoragePath`, vínculo à compra) + cursor `ultNSU` por organização.
- **Worker:** cron de polling incremental por organização.
- **Manifestação:** serviço + rota + provider; opcional auto-ciência (destrava XML completo).
- **UI:** aba "Notas recebidas" com ações de manifestar.
- **Fase 2:** transformar NF-e recebida em compra (estoque/custo/financeiro) — payoff de ERP.

### Status P3-saída (implementado)

- **CC-e** ✅ provider + serviço + rota + ação (NF-e autorizada).
- **Inutilização** ✅ provider + serviço + rota + ação (docs em ERRO); status INUTILIZADA/INUTILIZADO.
- **NF-e de devolução** ✅ CFOP de entrada no motor, encadeamento, tpNF=0/refNFe no mapper, serviço/rota/UI. Exige perfil de operação de devolução (NF-e, finalidade DEVOLUCAO) configurado.
- Endpoints CC-e/inutilização e o payload de devolução (tpNF/refNFe) precisam de confirmação em sandbox (mesmo caveat do vTotTrib). Schema novo (lifecycle INUTILIZADO, eventos) no mesmo db:push.

---

## 16. P3-Entrada detalhado — DF-e / manifestação (planejado)

Decisões: UI no **módulo de Compras**; **auto-ciência** configurável (default on); **Fase 1 → Fase 2**.
Princípio: o DF-e **descobre e manifesta**; **Compras** faz estoque/financeiro (não duplicar). Inbound gera uma `purchase` e o fluxo de compras existente cuida do resto.

### Módulo `lib/fiscal/inbound/` (isolado do motor de saída)
- **Provider inbound** separado (Distribuição DF-e), não polui o `IFiscalProvider` de emissão: `consultarDistribuicao({ ultNSU }, org)` + `manifestarDocumento(evento, chave, org)`.

### Dados
- `fiscalInboundDocuments`: `organizacaoId`, `chaveAcesso` (única/org), `nsu`, `completo` (bool resumo/XML), `emitenteCnpj`, `emitenteNome`, `valorTotal`, `dataEmissao`, `situacao` (origem: autorizada/cancelada), `manifestacaoAtual` (enum), `xmlStoragePath`, `compraId` (FK nullable → `purchases`), `dataInsercao`.
- `fiscalInboundCursors`: `organizacaoId`, `ultNSU`, `maxNSU`.
- `fiscalSupplierProductMap` (Fase 2): `organizacaoId`, `fornecedorCnpj`, `codigoFornecedor`/`ean`, `produtoId`/`produtoVarianteId` — de-para reutilizável.
- Enums: `FiscalInboundManifestEventEnum = [CIENCIA, CONFIRMACAO, DESCONHECIMENTO, NAO_REALIZADA]` (Zod + pgEnum). Config: flag `dfeAutoCiencia` em `OrganizationFiscalConfig`.

### Fase 1 — Distribuição + manifestação + lista (descoberta/compliance)
- Worker cron `/api/cron/fiscal-inbound`: por org, varre `ultNSU → maxNSU`, grava resumos/XMLs, avança cursor. Auto-ciência opcional ao chegar nota.
- Serviços/rotas de manifestação (4 eventos) + download de XML; armazenamento no Supabase Storage.
- UI: aba "Notas recebidas" no módulo de Compras (lista: fornecedor, valor, data, situação, manifestação; ações: manifestar, baixar XML).

### Fase 2 — Virar compra (payoff ERP)
- `createPurchaseFromInboundDocument(inboundId)`: emitente → fornecedor; itens da NF-e → `purchaseItems` (custo dos valores da nota); cria `purchase`; seta `inbound.compraId`.
- **De-para de produtos** (`fiscalSupplierProductMap`): match por GTIN/EAN → NCM+descrição → confirmação manual; reutilizado nas próximas entradas.
- A partir da compra criada, o fluxo existente faz estoque (`process-purchase-item-stock`) e financeiro (lançamento + `financialTransactions` SAIDA = contas a pagar).

Schema novo (tabelas inbound + de-para + enums + flag) em `db:push`. Endpoints de distribuição/manifestação a confirmar na sandbox.

### Refinamentos decididos (§16)

- **Tabelas separadas** para inbound (agregados disjuntos: emite vs recebe).
- **Rename `fiscalDocuments` → `fiscalOutboundDocuments`** (semântica correta; sem dados, migração indolor). Passo 0 da Fase 1 — rename mecânico amplo (schema/relations/documents.ts/worker.ts/mappers/rotas/queries/fiscal-page).
- **Entidade `suppliers`** (dedup por CNPJ, contato/prazos): âncora do de-para e elo inbound↔compra↔financeiro. `purchases` ganha `fornecedorId` (mantendo snapshot denormalizado); inbound faz resolve-or-create por CNPJ.
- De-para renomeado para **`supplierProductMappings`** (genérico, sem prefixo fiscal), keyed por `fornecedorId` + código/EAN do fornecedor → `produtoId`/`produtoVarianteId`.

### Status P3-Entrada Fase 1 (implementado)

- **Rename** fiscalDocuments → fiscalOutboundDocuments ✅
- **Schema** suppliers + supplierProductMappings + fiscalInboundDocuments + fiscalInboundCursors + enum manifestação + flag dfeAutoCiencia ✅
- **Backend** provider DF-e (Nuvem Fiscal + manual), polling por NSU, resolve-or-create fornecedor, dedupe, auto-ciência, manifestação (4 eventos), XML; cron /api/cron/fiscal-inbound (2h) ✅
- **UI** aba "Notas recebidas" em Compras (lista + manifestar + baixar XML) ✅
- Pendente: endpoints de Distribuição/manifestação a confirmar em sandbox; Fase 2 (de-para + virar compra) não iniciada. Schema novo no db:push.
