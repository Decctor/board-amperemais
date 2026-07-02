# Review completo do módulo fiscal (motor de composição, emissão, fila e providers)

Data: 2026-07-01
Escopo revisado: `lib/fiscal/**` (engine, taxation-context, documents, worker, settings, operation-profile, providers Nuvem Fiscal/Manual, inbound, storage, notifications, rejections), `app/api/fiscal/**`, `app/api/cron/fiscal-*`, `services/drizzle/schema/fiscal.ts` + `fiscal_outbound_documents` (financial.ts), `schemas/fiscal.ts`, integração com o fluxo de venda (`process-sale-automatic-fiscal-emission.ts`).

> **Status (2026-07-02):** os achados CRÍTICOS (C1–C4) e ALTOS (A1–A6) foram corrigidos neste branch.
> Os itens MÉDIOS/BAIXOS permanecem em aberto.
>
> **Atenção — deploy do A1:** as unique constraints exigem `npm run db:push` e falharão se houver
> duplicatas pré-existentes. Verificar antes com:
> ```sql
> select organizacao_id, referencia, count(*) from ampmais_fiscal_outbound_documents group by 1, 2 having count(*) > 1;
> select organizacao_id, tipo_documento, ambiente, serie, count(*) from ampmais_fiscal_series group by 1, 2, 3, 4 having count(*) > 1;
> select organizacao_id, produto_id, coalesce(produto_variante_id, ''), count(*) from ampmais_product_fiscal_profiles where ativo group by 1, 2, 3 having count(*) > 1;
> ```
> **Atenção — deploy do A6:** definir `CRON_SECRET` em produção passou a ser obrigatório
> (as rotas de cron respondem 401 sem ele).

Legenda de severidade:
- **CRÍTICO** — pode emitir documento fiscal errado ou travar/duplicar emissão em produção.
- **ALTO** — corrupção de dados, corrida ou falha silenciosa com impacto fiscal.
- **MÉDIO** — rejeição SEFAZ em cenários específicos ou comportamento incorreto de borda.
- **BAIXO** — higiene, observabilidade, código morto.

---

## CRÍTICOS

### C1. Worker perde o contexto de devolução — pode emitir NF-e NORMAL duplicada da venda
`processFiscalQueue` (`lib/fiscal/worker.ts:67-73`) reconstrói o input de emissão apenas com `vendaId`, `tipo`, `organizacaoId` e `lancamentoContabilId`. Os campos `documentoOrigemId`, `chaveAcessoReferencia` e `operationProfileId` do documento **não são repassados**.

Como `buildFiscalReference` (`lib/fiscal/constants.ts:8-12`) inclui o sufixo `:dev:` somente quando `documentoOrigemId` está presente, ao processar um documento de devolução enfileirado por `createReturnFiscalDocument` o worker recalcula a referência **sem** o sufixo:

- Se o documento original da venda for **NF-e autorizada**: `emitFiscalDocument` encontra o original pela referência base e retorna cedo ("já autorizado"). O documento de devolução fica preso em `PRONTO_PARA_ENVIO` para sempre e o worker o contabiliza como "enviado".
- Se o original for **NFC-e** (referência `t:NFCE` diferente): nenhum documento casa com a referência base → `createOrUpdateDraftDocument` cria um **novo** documento `v:<venda>:t:NFE`, o prepara com perfil de operação **NORMAL** (a finalidade DEVOLUCAO se perdeu), reserva numeração e **emite uma NF-e de venda normal duplicando fiscalmente uma venda já acobertada por NFC-e**.

Correção sugerida: o worker deve repassar `operationProfileId`, `documentoOrigemId` e `chaveAcessoReferencia` a partir do próprio registro (`doc.documentoOrigemId`, `doc.chaveAcessoReferencia`) — ou, melhor, `emitFiscalDocument` deveria aceitar re-emitir *um documento específico por id* em vez de reconstruir tudo pela referência.

### C2. `vNF` do payload usa `venda.valorTotal` em vez do total calculado pelo motor
Os mappers (`mappers/nfe.ts:135`, `mappers/nfce.ts:130`) preenchem `ICMSTot.vNF` com `context.venda.valorTotal`, ignorando `taxation.totais.vNF`. A SEFAZ valida `vNF = vProd - vDesc + vST + vFCPST + ...` (regra W16). Consequências:

- Qualquer grupo com **ICMS-ST** (vST > 0) gera divergência garantida → rejeição.
- Qualquer diferença entre `venda.valorTotal` e `Σ(valorVendaTotalBruto) - Σ(valorTotalDesconto)` (ex.: frete embutido, ajuste no total da venda, arredondamento) → rejeição.

Agravante: o próprio motor calcula `totais.vNF` **sem** somar `vFCPST` (`engine/taxation.ts:216`), então mesmo trocar para `totais.vNF` exige incluir `+ totals.vFCPST` conforme NT 2016.002.

### C3. NFC-e com cliente de outra UF é montada como operação interestadual
`buildSaleScenario` (`lib/fiscal/taxation-context.ts:28-43`) deriva `ufDestino`/`escopo` do endereço do destinatário **independentemente do tipo de documento**. Para NFC-e (mod 65), a operação é sempre interna: o mapper fixa `idDest: 1` (`mappers/nfce.ts:52`), mas o motor pode selecionar regra INTERESTADUAL e resolver **CFOP 6xxx** — combinação rejeitada pela SEFAZ (NFC-e só aceita CFOP iniciado em 5).

Correção: quando `tipoDocumento === "NFCE"`, forçar `ufDestino = ufOrigem` / `escopo = "INTRAESTADUAL"` na montagem do cenário.

### C4. `resolveCfop` gera CFOP inexistente para revenda de mercadoria com ST (5405 → "6405")
A troca ingênua do primeiro dígito (`engine/cfop.ts:21-22`) assume que todo CFOP 5xxx tem correspondente 6xxx com os mesmos três dígitos finais. O par mais comum do varejo quebra a regra: **5405 (venda de mercadoria sujeita a ST, contribuinte substituído) tem correspondente interestadual 6404 — "6405" não existe na tabela CFOP** → rejeição de schema/CFOP inválido em qualquer venda interestadual desses produtos (justamente os com CEST/CSOSN 500).

Correção: tabela de exceções no resolvedor (no mínimo `405 → 404` quando muda para 6) ou validação local contra a tabela CFOP.

---

## ALTOS

### A1. Falta de unique constraints em pontos críticos de idempotência
- `fiscal_outbound_documents.referencia` tem apenas índice comum (`financial.ts:311`). `enqueueFiscalDocument`/`emitFiscalDocument` fazem *find-then-insert* (`documents.ts:225-243, 475-480`): duas requisições concorrentes (ex.: confirmação de venda + clique manual, ou duplo clique) criam **dois documentos com a mesma referência**, cada um reservando um número da série, com possível **dupla emissão** no provedor. Sugestão: unique `(organizacao_id, referencia)` + tratamento de conflito.
- `fiscal_series` não tem unique `(organizacao_id, tipo_documento, ambiente, serie)` (`schema/fiscal.ts:65`) — duas linhas para a mesma série = dois contadores independentes = numeração duplicada (rejeição 204/539).
- `product_fiscal_profiles` sem unique `(organizacao_id, produto_id, produto_variante_id)` — perfis duplicados fazem `find()` escolher um arbitrário.

### A2. `proximoNumero` da série é livremente editável (pode regredir)
O PUT de séries (`app/api/fiscal/series/route.ts:95`) aceita qualquer `proximoNumero` e `upsertFiscalSeries` grava direto (`settings.ts:169-180`). Um operador pode (por engano) retroceder o contador → chaves duplicadas → rejeições 204/539 em série. Sugestão: impedir redução abaixo do maior número já emitido (ou exigir confirmação/permissão especial) e nunca sobrescrever o contador em edições que não o alterem intencionalmente (o update `.set(input)` regrava o contador com o valor que o cliente carregou na tela, desfazendo reservas concorrentes feitas entre o load e o save).

### A3. Cancelamento apaga `dataEmissao`/`dataAutorizacao` do documento
`applyProviderDocumentDetails` (`documents.ts:209-211`) faz `dataEmissao: details.dataEmissao ?? null` para **qualquer** retorno do provedor. O retorno de cancelamento (`providers/nuvem-fiscal/documents.ts:131-153`) não traz `dataEmissao`/`dataAutorizacao` → o patch **zera as datas históricas** do documento autorizado. Sugestão: patch parcial (só sobrescrever campos presentes) ou preservar valores existentes.

### A4. Emissão manual ignora o lock da fila (`bloqueadoEm`)
O worker faz claim atômico (`worker.ts:19-32`), mas a rota manual `POST /api/fiscal/documents` chama `emitFiscalDocument` diretamente, que não verifica `bloqueadoEm` nem trata `PRONTO_PARA_ENVIO` como estado em andamento (early-return cobre só `AUTORIZADO`/`EM_PROCESSAMENTO`, `documents.ts:496`). Janela real de **duas chamadas simultâneas a `provider.emitirDocumento`** para o mesmo documento (worker + usuário). A idempotência fica dependendo do comportamento da Nuvem Fiscal com `referencia` repetida.

### A5. Falha da emissão automática é silenciosa
Em `process-sale-automatic-fiscal-emission.ts:66` a notificação `notifyFiscalEmissionFailure` está **comentada**; resta um `console.log`. Falhas de preparação (`enqueueFiscalDocument` lança e grava `statusInterno: "ERRO"` com `proximaTentativaEm: null`) **não são retentadas pelo worker** (a query exige `proximaTentativaEm` não nulo) e ninguém é avisado — vendas ficam sem nota até alguém olhar a tela do módulo fiscal.

### A6. Cron fail-open sem `CRON_SECRET`
`assertCronAuthorized` (`lib/cron/assert-cron-authorized.ts:6`) só valida o header **se** `CRON_SECRET` estiver definido. Sem a env var, `/api/cron/fiscal-queue` e `/api/cron/fiscal-inbound` ficam públicos. Sugestão: fail-closed (exigir a env var em produção).

---

## MÉDIOS

### M1. ICMS-ST do substituto sem dedução do ICMS da operação própria
`computeIcms` (`engine/taxation.ts:107`) calcula `vICMSST = max(vBCST × pICMSST − vICMS, 0)`. Para CSOSN 201/202/203 o emitente do Simples normalmente tem `aliquotaIcms = 0` → `vICMS = 0` → **nenhuma dedução**. O Convênio ICMS 142/18 (cláusula 13ª) permite ao substituto optante do SN deduzir o valor resultante da alíquota interna/interestadual sobre a operação própria. Como está, o ST sai superestimado (imposto pago a maior). Confirmar o enquadramento com o contador; se aplicável, calcular a dedução presumida em vez de usar `vICMS`.

### M2. PIS/COFINS: CST 03 mapeado errado e inconsistência item × totais
- `buildPisNode`/`buildCofinsNode` (`mappers/imposto.ts:51-70`) jogam CST `03` (tributação por quantidade) no nó `PISNT` — o correto seria `PISQtde` (que o motor nem calcula). Se alguém configurar CST 03, o documento sai estruturalmente errado.
- Para CST `04`–`09` com alíquota configurada > 0, `computeContribuicao` (`engine/taxation.ts:20-26`) calcula `vPIS/vCOFINS` e os **totais** somam esses valores (`computeDocumentTotals`), mas o nó do item (`PISNT`) não carrega valor → divergência item × total → rejeição. Sugestão: zerar valores quando CST for 04–09 e/ou validar combinação CST × alíquota no cadastro do grupo.
- CST `99` com alíquota > 0 é silenciosamente zerado — vale um aviso de validação no cadastro.

### M3. Pagamentos × vNF (NFC-e regra YA01)
`assertFiscalReadiness` (`documents.ts:356-361`) compara a soma dos pagamentos com `venda.valorTotal` com tolerância de 0,01, mas a SEFAZ exige `Σ vPag ≥ vNF` exato (e `vTroco` quando pago a maior — o mapper não emite `vTroco`, `mappers/pagamento.ts`). Pagamento em dinheiro com troco registrado pelo valor entregue rejeita a NFC-e.

### M4. Inutilização usa o ano corrente
`inutilizeNuvemFiscalNumber` (`providers/nuvem-fiscal/documents.ts:208`) envia `ano: new Date().getFullYear() % 100`. Inutilizar em janeiro um número reservado em dezembro rejeita (ano da numeração ≠ ano corrente). Derivar o ano de `documento.dataInsercao`/`dataEmissao`.

### M5. Renovação do token OAuth pode virar "renova a cada request"
`RENEW_BEFORE_EXPIRY_MS = 24h` (`access-token.ts:11`). Se o token da Nuvem Fiscal expirar em ≤ 24h (o padrão deles é 24h), a condição `agora ≥ expiração − 24h` é verdadeira imediatamente após obter o token → toda chamada busca token novo no OAuth + grava no banco. Risco de rate-limit no endpoint de token e latência extra. Usar margem pequena (ex.: 5 min) ou fração do `expires_in`.

### M6. Rejeições não-reenviáveis reutilizam o mesmo número para sempre
O catálogo `FISCAL_REJECTION_CATALOG` marca 204/539 como `reenviavel: false`, mas nada no fluxo consulta isso: `prepareFiscalDocumentForSend` (`documents.ts:448`) reusa `documento.numero` em toda retentativa. Uma rejeição por duplicidade entra em loop de rejeição até esgotar `MAX_ATTEMPTS`. Sugestão: ao detectar `codigoRejeicao` não-reenviável, limpar `numero` (reservando novo) ou exigir intervenção manual explícita.

### M7. Inbound: erros engolidos sem log e auto-ciência em loop
- `pollInboundForAllOrganizations` (`inbound/index.ts:119-121`) tem `catch {}` sem qualquer log — uma organização quebrada falha silenciosamente para sempre.
- `autoManifestCiencia` re-manifesta docs cuja manifestação falhou (ex.: evento já registrado na SEFAZ por outro sistema) a cada rodada, silenciosamente, sem backoff nem marcação de erro.
- Dedupe de `fiscal_inbound_documents` é *find-then-insert* sem unique `(organizacao_id, chave_acesso)` — corrida do cron pode duplicar notas recebidas.

### M8. Prontidão NFC-e exige CSC mesmo no provedor MANUAL
`assertFiscalReadiness` (`documents.ts:352-355`) verifica `nuvemFiscal.nfce.csc/idCsc` para todo NFCE, inclusive quando `fiscalProvedor = "MANUAL"` — bloqueia um fluxo que nunca chamará a Nuvem Fiscal.

### M9. IBPT: seleção de taxa e vigência frouxas
`selectIbptRate` (`engine/ibpt.ts:29-36`) aceita prefixo nos dois sentidos (`rateNcm` mais longo que o NCM alvo vence por ordenação de tamanho) — um NCM de 8 dígitos "parecido" pode ser escolhido para um alvo de 4 dígitos. E `loadIbptRatesForSale` não filtra `vigenciaFim` vencida. Impacto limitado (vTotTrib é informativo), mas vale endurecer.

---

## BAIXOS / HIGIENE

1. **`console.log("[COMPUTE SALE TAXATION] Item", item)`** (`taxation-context.ts:93`) roda em produção para cada item, duas vezes por emissão (validação + mapper) — ruído e dados de venda em log. Remover.
2. **Payload completo logado na emissão** (`dfe-messages.ts:112`) inclui CPF/CNPJ, nome e e-mail do destinatário — PII em logs de produção. Reduzir ao preview já existente ou condicionar a env de debug.
3. `consumeFiscalSeriesNumber` (`settings.ts:182`) é código morto (só `reserveFiscalSeriesNumber` é usado).
4. `selectMatchingRule` (`engine/rules.ts:24-28`) desempata pela ordem retornada pelo banco — não determinístico entre regras de mesma especificidade. Desempatar por `dataInsercao`/`id`.
5. `schemas/fiscal.ts:120-121`: default de `nuvemFiscal.api.baseUrl` aponta para **sandbox** com a linha de produção comentada; o campo nem é lido pelo client (a baseURL vem do `ambiente` em `client.ts`). Config morta e enganosa — remover ou passar a usá-la.
6. Mensagem de erro em `client.ts:18` fala em "token da organização", mas o token é global da aplicação.
7. `formatNcmForNuvemFiscal` (`mappers/utils.ts:8-15`) inventa NCM com `padStart`/`slice`/"00000000" — melhor bloquear na validação local (o NCM inválido vira rejeição 778 na SEFAZ) do que "consertar" silenciosamente.
8. `resolveCfop` retorna `digits.slice(0, 4)` para CFOPs 3xxx/7xxx — o comentário diz "retornados sem alteração", mas o valor é normalizado/truncado.
9. Backoff do worker: a primeira retentativa usa `BACKOFF_MINUTES[1]` (5 min); o índice 0 (1 min) nunca é usado. `tentativasEnvio` é incrementado no `prepare` e recontado do snapshot no worker — contagem imprecisa (inofensiva, mas confusa).
10. `vDesc` do item: NFC-e omite quando 0, NF-e envia sempre (inclusive 0) — padronizar (omitir quando 0).
11. `dhEmi` em ISO UTC (`Z`); o leiaute pede offset local (`-03:00`). A Nuvem Fiscal aparentemente normaliza, mas vale confirmar em produção.
12. Assets fiscais gravados sob `public/organizations/fiscal/...` no bucket `files` (`storage.ts`) — confirmar que o bucket/prefixo não é público, pois XML/DANFE contêm dados pessoais. O download autenticado já existe via `/api/fiscal/document-assets`.
13. Valores fiscais em `doublePrecision` — o arredondamento via `round2` cobre o essencial, mas somas de muitos itens podem divergir de centavos entre item e total (a SEFAZ tolera 0,01 por item em algumas regras; monitorar rejeições 610/629).
14. Perfis fiscais de variantes são ignorados (`loadProductFiscalProfilesForSale` filtra `isNull(produtoVarianteId)`, `documents.ts:263-274`) — se variantes puderem ter NCM próprio, isso emitirá com o perfil do produto pai.
15. `emitFiscalDocument`/rota manual permite emitir NF-e para venda que já tem NFC-e autorizada (referências diferentes) sem qualquer aviso — pode ser intencional (complementar?), mas merece guarda de UX.

---

## Pontos positivos

- Separação limpa motor puro (`engine/`) × contexto (`taxation-context`) × provider — o motor é 100% testável sem banco.
- Outbox pattern com claim atômico (`bloqueadoEm`) e backoff no worker é a arquitetura certa para emissão assíncrona.
- Validação local bloqueante antes do envio (`assertFiscalTaxationValid`) evita queimar rejeições na SEFAZ.
- Reserva de numeração via `UPDATE ... RETURNING` atômico (sem race no incremento em si).
- Autenticação/permissões (`fiscal.visualizar/emitir/cancelar/configurar`) aplicadas consistentemente em todas as rotas, com escopo de organização em todas as queries.
- Snapshot do destinatário e da venda persistido no documento (auditoria).
- Catálogo de rejeições e trilha de eventos (`fiscal_document_events`) bem pensados.

## Recomendação prioritária

O módulo **não tem nenhum teste automatizado** e o motor é puro — o maior retorno imediato é uma suíte de unit tests para `engine/` (taxation com/sem ST, FCP, crédito SN, CFOP incluindo 5405/6404, regras por especificidade, IBPT) e testes de integração dos mappers comparando `ICMSTot` com a soma dos itens (invariantes W16/610/685). Isso congela o comportamento antes de corrigir C1–C4, que devem ser tratados antes de qualquer go-live de emissão em produção — em especial C1 (devolução) e C2 (vNF), que produzem documento fiscal errado, não apenas rejeição.
