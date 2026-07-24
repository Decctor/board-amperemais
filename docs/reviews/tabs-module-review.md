# Revisão — Módulo de Tabs (commits 13eebec0..a4e0c002)
Data: 2026-07-24 | Revisor: Codex (GPT-5)

## Sumário executivo

O módulo tem uma base transacional boa (locks de abertura, `FOR UPDATE`, uniques e CAS da venda), mas não está seguro para produção no estado revisado. Foram encontrados **7 SEV-1**, **5 SEV-2** e **4 SEV-3**. Os bloqueadores principais são: extrato público acessível depois do fechamento, referências cross-tenant aceitas na abertura/contabilidade, fechamento com pagamentos arbitrários e inconsistências de estoque em entrega parcial, composição e estorno. A aprovação de pedidos QR também não cumpre a atomicidade descrita no plano. Todas as dimensões solicitadas tiveram ao menos um achado; não foi encontrada enumeração viável dos tokens de 256 bits nem injeção persistente executável no board (o React escapa os textos).

## Achados

### [SEV-1] QR de tab fechada continua expondo o extrato — CONFIRMADO
- **Arquivo**: `app/(external)/tab/[token]/page.tsx:19`
- **Dimensão**: segurança
- **Problema**: a página resolve qualquer tab pelo hash e sempre renderiza pedidos, itens e total. `status !== "ABERTA"` apenas desabilita novos pedidos; não revoga a leitura, apesar do comentário da própria página e do plano dizerem que o QR efêmero é revogado/rotacionado no fechamento.
- **Cenário de falha**: alguém fotografa o QR durante o atendimento → a conta é fechada ou cancelada → a mesma URL continua mostrando indefinidamente os itens consumidos e seus valores.
- **Sugestão**: negar a renderização do extrato quando a tab não estiver aberta e rotacionar/inutilizar `tokenPublicoHash` no fechamento/cancelamento.

### [SEV-1] Abertura aceita cliente e vendedor de outra organização — CONFIRMADO
- **Arquivo**: `lib/tabs/open-tab.ts:76`
- **Dimensão**: multi-tenant
- **Problema**: `clienteId` e `responsavelVendedorId` são gravados sem consulta que valide `organizacaoId`. As FKs são globais por `id`; depois, `app/api/tabs/route.ts:41` carrega e devolve nome e telefone do cliente e nome do vendedor sem filtro adicional.
- **Cenário de falha**: membro da organização A envia um UUID válido de cliente da organização B ao `POST /api/tabs` → a tab de A passa a expor nome/telefone de B no GET e no board.
- **Sugestão**: resolver ambos os IDs por `(id, organizacaoId)` antes do insert e rejeitar referências que não pertençam à sessão; considerar constraints compostas para defesa no banco.

### [SEV-1] Contas contábeis cross-tenant podem ser usadas no fechamento — CONFIRMADO
- **Arquivo**: `lib/tabs/close-tab.ts:56`
- **Dimensão**: multi-tenant
- **Problema**: `contaDebitoId` e `contaCreditoId` vindos do request substituem os defaults sem validar a organização. `createAccountingEntry` apenas insere as FKs recebidas (`lib/sales/sale-processing/create-accounting-entry.ts:23`), e a FK de `accountingEntries` não inclui `organizacaoId`.
- **Cenário de falha**: operador da organização A envia IDs de contas do plano contábil de B → o lançamento de A fica ligado às contas de B, contaminando relatórios e isolamento contábil.
- **Sugestão**: validar as duas contas por `(id, organizacaoId)` e natureza esperada dentro do service antes da transação; idealmente reforçar a pertença com chave/constraint composta.

### [SEV-1] Servidor fecha a conta com total de pagamentos incorreto ou negativo — CONFIRMADO
- **Arquivo**: `lib/tabs/close-tab.ts:54`
- **Dimensão**: dinheiro
- **Problema**: o servidor exige apenas um pagamento, mas não compara a soma com `sales.valorTotal`. `CheckoutPaymentSplitSchema` também não exige `valor > 0` (`lib/payments/schemas.ts:14`), e o provider local persiste o valor sem outra validação (`lib/payments/providers/local.ts:75`). A única conferência de soma está no client.
- **Cenário de falha**: conta de R$ 100 recebe payload com pagamento de R$ 1 (ou -R$ 100) → venda e tab são confirmadas/fechadas, contabilidade registra R$ 100 e o financeiro registra o valor arbitrário.
- **Sugestão**: dentro da transação, validar valores finitos/positivos, regras de parcelamento e igualdade da soma com o total autoritativo dentro da tolerância de centavos.

### [SEV-1] Entrega parcial baixa e marca a quantidade inteira — CONFIRMADO
- **Arquivo**: `lib/tabs/process-tab-order-status-change.ts:56`
- **Dimensão**: dinheiro
- **Problema**: `PARCIALMENTE_ENTREGUE` exige saída física (`attendance.ts:52`), porém a API recebe somente o status, sem quantidades por item. `processStockDeduction` calcula o delta integral e grava toda a quantidade como entregue (`process-stock-deduction.ts:156` e `:233`).
- **Cenário de falha**: pedido de 10 unidades passa de `PRONTO` para `PARCIALMENTE_ENTREGUE` após 4 unidades servidas → o estoque baixa 10 e `quantidadeEntregue` vira 10; o fechamento não encontra delta remanescente.
- **Sugestão**: exigir deltas entregues por item na transição parcial e atualizar/baixar somente esses deltas; alternativamente, proibir esse status para `tabOrder` até existir suporte granular.

### [SEV-1] Estorno de item por composição devolve o produto errado — CONFIRMADO
- **Arquivo**: `lib/tabs/cancel-tab-order.ts:81`
- **Dimensão**: dinheiro
- **Problema**: a entrega de produto `COMPOSICAO` baixa os insumos da ficha técnica, mas o cancelamento com `devolverEstoque=true` chama `applyStockMovement` para o produto/variante vendido. A ficha técnica não é explodida no caminho inverso.
- **Cenário de falha**: um prato baixa carne e acompanhamentos → o pedido entregue é cancelado com devolução → os insumos continuam reduzidos e surge saldo artificial do prato acabado.
- **Sugestão**: centralizar a composição dos movimentos de estoque e reutilizá-la com sinal inverso no estorno, preservando os mesmos produtos, variantes, quantidades e vínculos da saída original.

### [SEV-1] Modo composição ignora o opt-out de rastreamento do produto/variante vendido — CONFIRMADO
- **Arquivo**: `lib/sales/sale-processing/process-stock-deduction.ts:71`
- **Dimensão**: invariante
- **Problema**: a consulta que decide `COMPOSICAO` não carrega nem verifica `rastreamentoEstoqueAtivo`. Assim, com rastreamento global ligado, a receita é explodida mesmo quando o produto (ou a variante vendida) está com rastreamento desativado, divergindo da invariante 10.
- **Cenário de falha**: produto composto é configurado com `rastreamentoEstoqueAtivo=false` → ao entregar, seus insumos ainda são baixados.
- **Sugestão**: carregar produto e variante com filtro de organização e aplicar o mesmo gate de rastreamento antes de qualquer explosão de receita.

### [SEV-2] Aprovação QR não é atômica e pode ficar presa em PROCESSANDO — CONFIRMADO
- **Arquivo**: `app/api/tabs/order-requests/route.ts:79`
- **Dimensão**: concorrência
- **Problema**: o CAS para `PROCESSANDO`, a possível abertura da tab, `launchTabOrder` e a conclusão da solicitação ocorrem em transações separadas. Uma queda após o claim deixa a solicitação invisível no polling (`PENDENTE,ERRO`); uma queda após criar o pedido deixa o pedido criado e a solicitação em `PROCESSANDO`, sem retry aceito.
- **Cenário de falha**: processo cai depois de `launchTabOrder` e antes do update para `CONCLUIDA` → o pedido existe, mas a solicitação nunca conclui nem pode ser reaprovada.
- **Sugestão**: executar claim, resolução/abertura, lançamento e conclusão em uma única transação caller-owned; fazer `openTab`/`launchTabOrder` aceitarem `tx` em vez de abrirem transações próprias.

### [SEV-2] Pedido de um ponto pode ser aprovado em tab de outro ponto — CONFIRMADO
- **Arquivo**: `app/api/tabs/order-requests/route.ts:88`
- **Dimensão**: segurança
- **Problema**: quando o QR é de ponto e o operador informa `tabId`, o servidor só valida que a tab pertence à organização (dentro de `launchTabOrder`), não que `tab.servicePointId === request.servicePointId`. A UI oferece todas as tabs abertas (`OrderRequestsSection.tsx:65`).
- **Cenário de falha**: solicitação feita na Mesa 12 é aprovada por engano na comanda aberta da Mesa 7 → cozinha e cobrança recebem o pedido na conta errada.
- **Sugestão**: restringir server-side a tab de destino às tabs abertas do ponto da solicitação e filtrar a mesma lista no client.

### [SEV-2] Idempotência do lançamento é opcional na API — CONFIRMADO
- **Arquivo**: `app/api/tabs/orders/route.ts:37`
- **Dimensão**: concorrência
- **Problema**: `tabOrderId` é `.optional().nullable()`. O modal atual envia UUID, mas qualquer caller/retry que omita o campo cria uma nova rodada; portanto a invariante 6 não é garantida pela superfície autoritativa.
- **Cenário de falha**: cliente autenticado envia um pedido sem `tabOrderId`, perde a resposta e repete o POST → dois pedidos, itens e valores são adicionados à conta.
- **Sugestão**: tornar `tabOrderId` UUID obrigatório no schema e no tipo do service; manter o tratamento de retry existente.

### [SEV-2] Rascunho de tab continua editável pelo fluxo comum de orçamento — CONFIRMADO
- **Arquivo**: `app/api/pos/sales/route.ts:263`
- **Dimensão**: invariante
- **Problema**: GET/PUT do rascunho POS filtram organização e status, mas não `tabId IS NULL` nem rejeitam `existing.tabId`. O endpoint de tabs devolve `vendaRascunhoId`, então o rascunho pode ser aberto/editado fora do board, contrariando a invariante 11; apenas a confirmação comum foi bloqueada.
- **Cenário de falha**: operador obtém `vendaRascunhoId` pelo GET da tab e abre o checkout POS → altera descontos/acréscimos/metadados do rascunho sem passar pelos totais e fluxo da conta.
- **Sugestão**: rejeitar vendas com `tabId` em todas as operações do fluxo de rascunho POS e filtrar `tabId IS NULL` nas listagens/telas de orçamento.

### [SEV-2] Código depende de migração 0046 ainda não aplicada — CONFIRMADO
- **Arquivo**: `drizzle/0046_tab_order_requests.sql:1`
- **Dimensão**: operacional
- **Problema**: conforme o estado operacional informado para a revisão, a tabela `tab_order_requests` ainda não existe no banco, enquanto páginas e APIs do range a consultam. A migração é manual via script e também não aparece no journal do Drizzle.
- **Cenário de falha**: deploy do commit `a4e0c002` antes da aplicação manual → board e POST público falham em runtime com relação inexistente.
- **Sugestão**: tornar 0045/0046 pré-condição verificável do deploy, registrar a versão aplicada e adicionar um smoke check antes de liberar as rotas.

### [SEV-3] Rate limit público é contornável ou multiplicado pela topologia — PLAUSÍVEL
- **Arquivo**: `app/api/public/tab-order-requests/route.ts:125`
- **Dimensão**: operacional
- **Problema**: a chave confia no primeiro valor de `x-forwarded-for`, cuja autenticidade depende do proxy, e o contador vive em memória por processo (`lib/tabs/public-rate-limit.ts:6`). Em múltiplas instâncias/restarts, cada instância concede uma janela nova.
- **Cenário de falha**: infraestrutura permite header de origem controlável ou distribui requests entre N instâncias → atacante alterna IP declarado/instância e cria muito mais que 10 solicitações por minuto.
- **Sugestão**: obter IP apenas de metadata confiável da plataforma e usar limiter compartilhado/atômico; incluir também limites por token e organização.

### [SEV-3] Consultas novas omitem filtro explícito de organização — PLAUSÍVEL
- **Arquivo**: `lib/tabs/launch-tab-order.ts:58`
- **Dimensão**: multi-tenant
- **Problema**: as consultas de custo de produtos/variantes, de ponto/vendedor e a consulta do modo de baixa em `process-stock-deduction.ts:71` filtram só por ID. Os fluxos atuais validam parte desses IDs antes, reduzindo a explorabilidade direta, mas a regra de isolamento não é local e dados corrompidos/novos callers podem atravessar tenants.
- **Cenário de falha**: um registro legado ou caller futuro introduz FK de produto/ponto/vendedor cross-tenant → o service lê custo, nome ou configuração da outra organização e os replica na venda.
- **Sugestão**: adicionar `organizacaoId` em toda consulta e update, inclusive quando a FK veio de uma entidade já validada; preferir helpers que exijam `orgId`.

### [SEV-3] CAS da tab ocorre depois dos efeitos financeiros — CONFIRMADO
- **Arquivo**: `lib/tabs/close-tab.ts:123`
- **Dimensão**: invariante
- **Problema**: a invariante 3 exige `ABERTA → FECHADA` antes de qualquer efeito financeiro. O código confirma a venda/cria contabilidade/pagamentos e só depois executa o CAS da tab. O `FOR UPDATE` e o rollback protegem os callers atuais, mas a ordem diverge da guarda autoritativa documentada.
- **Cenário de falha**: um novo caminho altera a tab sem respeitar o mesmo lock → o fechamento executa todo o pipeline antes de descobrir o conflito no CAS final (e depende integralmente do rollback de todas as camadas).
- **Sugestão**: mover o update condicional da tab para o início da transação, após validar pré-condições e antes de confirmar a venda; preencher o snapshot final posteriormente sob o mesmo estado reservado.

### [SEV-3] UI e rotas desviam dos padrões obrigatórios do módulo — CONFIRMADO
- **Arquivo**: `components/Modals/Internal/Tabs/NewTab.tsx:25`
- **Dimensão**: padrão
- **Problema**: os modais novos mantêm estado inline e não criam os state hooks previstos; callbacks não seguem o contrato completo; `ControlServicePoint` recebe a linha pronta em vez de carregar/hidratar no padrão `Control*`. Há ainda `window.confirm` em `ControlTab.tsx:74` e `ControlServicePoint.tsx:86`, `getSessionWithERP` duplicado em várias rotas e `PublicShell` duplicado nas duas páginas públicas.
- **Cenário de falha**: novas regras/campos exigem alterações repetidas e confirmações encadeadas confundem “Cancelar” com uma escolha de negócio (por exemplo, manter a saída de estoque), aumentando regressões.
- **Sugestão**: extrair hooks de estado e guards compartilhados, adotar modal de confirmação explícito com ações nomeadas, completar o contrato de callbacks e mover `PublicShell` para `_components`.

## Invariantes do plano — checklist

| # | Invariante | Status (OK/DIVERGE/NÃO VERIFICÁVEL) | Evidência |
|---|---|---|---|
| 1 | Uma venda `ORCAMENTO` por tab | OK | Partial unique `idx_sales_tab_rascunho` em `services/drizzle/schema/sales.ts:98`. |
| 2 | `quantidadeEntregue` deduplica toda baixa por delta | DIVERGE | Delta e update transacional existem (`process-stock-deduction.ts:156`), mas `PARCIALMENTE_ENTREGUE` baixa o delta inteiro sem quantidades por item. |
| 3 | Pedido/fechamento só em tab aberta; CAS da tab antes de efeitos | DIVERGE | Locks e checks existem, mas o CAS de fechamento ocorre após `processSaleConfirmationInTransaction` (`close-tab.ts:123-136`). |
| 4 | Confirmação de venda usa CAS `ORCAMENTO` | OK | `process-sale-confirmation.ts:75-89` aborta em zero linhas antes de contabilidade/pagamentos. |
| 5 | Abertura por ponto usa advisory lock + reconsulta; código tem partial unique | OK | `open-tab.ts:51-70`, `utils.ts:49` e `tabs.ts:50-53`. |
| 6 | Número único sob lock e ID client-side deduplica retry | DIVERGE | Lock e unique existem, porém `tabOrderId` é opcional na rota e no service. |
| 7 | Rodadas usam service próprio | OK | `processTabOrderStatusChange` é chamado pela rota própria; não passa pelo service de atendimento da venda. |
| 8 | Fiscal e cashback disparam uma vez no fechamento | OK | CAS da venda precede efeitos internos e fiscal roda pós-commit em `close-tab.ts:145`; não há disparo por rodada. |
| 9 | Fechamento usa a sessão de caixa de quem fecha | OK | `close/route.ts:29-39` valida a sessão e o ID é propagado a venda/transações. |
| 10 | Sem rastreamento global ou por produto/variante, não há baixa | DIVERGE | Gate global existe; caminho `COMPOSICAO` não consulta `rastreamentoEstoqueAtivo` do item vendido. |
| 11 | Orçamentos comuns excluem `tabId` | DIVERGE | GET/PUT de `app/api/pos/sales/route.ts` aceitam rascunhos de tab; só a confirmação comum os rejeita. |
| 12 | POS comum não confirma venda de tab | OK | `app/api/pos/sales/confirm/route.ts:53-55` rejeita `saleDraft.tabId`. |
| 13 | Nenhum I/O externo dentro da transação | OK | Provider atual é local/DB; emissão fiscal é chamada apenas após commit em `close-tab.ts:145-146`. |

## Observações menores

- Tokens públicos usam 32 bytes aleatórios, são persistidos somente como SHA-256 e possuem índice unique; não foi encontrada enumeração prática por força bruta.
- O payload público limita quantidade de itens, quantidade por item e tamanho de observações. Nomes/observações persistidos são renderizados como texto React; não foi encontrado `dangerouslySetInnerHTML` nesse caminho.
- A aprovação reprecifica produto/variante na organização e verifica a pertença da variante ao produto. Entretanto, não exige que ambos continuem ativos no momento da aprovação.
- Na corrida de idempotência pública com a mesma chave e payloads diferentes, o ramo pós-`onConflictDoNothing` não compara novamente `payloadHash`; o loser recebe “já registrada” em vez de conflito.
- `recomputeTabDraftSaleTotals` atende o cancelamento integral da v1, mas soma o valor total do item sempre que `quantidadeCancelada < quantidade`; não suporta cancelamento parcial futuro.
- Polling ocorre a cada 15 s para preparo/solicitações e 30 s para tabs, sempre com consultas não paginadas e relações profundas. É aceitável em volume inicial, mas deve ter métricas/limites antes de escalar.
- A ausência ou invalidade de `serviceSettings` cai de forma segura no preset “Balcão”, com pontos/contas/pedidos públicos desabilitados; nenhum achado nessa condição.
- `git diff --check` não encontrou erros de whitespace. O typecheck global manteve o baseline conhecido; não foi observado erro emitido nos arquivos do range durante a filtragem.

---

## Validação dos achados (Claude, 2026-07-24)

Cada achado foi verificado contra o código real. Veredito e ação tomada:

| Achado | Veredito | Ação |
|---|---|---|
| SEV-1 QR de tab fechada expõe extrato | **VÁLIDO** | Corrigido: `tab/[token]` nega a leitura do extrato quando `status != ABERTA`. |
| SEV-1 Abertura aceita cliente/vendedor cross-tenant | **VÁLIDO** | Corrigido: `openTab` valida `clienteId` e `responsavelVendedorId` por `(id, organizacaoId)`. |
| SEV-1 Contas contábeis cross-tenant no fechamento | **VÁLIDO** | Corrigido em `closeTab` E no confirm do POS (mesma classe de falha, pré-existente): contas validadas contra `accountsCharts` da organização. |
| SEV-1 Fechamento com pagamentos arbitrários | **VÁLIDO** | Corrigido: valores positivos/finitos validados antes da transação; soma comparada ao `valorTotal` autoritativo da venda rascunho (tolerância de 1 centavo) dentro da transação. |
| SEV-1 Entrega parcial baixa a quantidade inteira | **VÁLIDO** | Corrigido por bloqueio: `PARCIALMENTE_ENTREGUE` rejeitado para tabOrders até existir suporte a quantidades por item (registrado como evolução). |
| SEV-1 Estorno de composição devolve o produto errado | **VÁLIDO** | Corrigido: a devolução agora reverte as transações de SAÍDA realmente registradas por item (`productStockTransactions`), cobrindo composição, adicionais e splits de FEFO com os mesmos produtos/quantidades da baixa original. |
| SEV-1 Composição ignora rastreamento do produto vendido | **REFUTADO** | `applyStockMovement` já retorna `applied: false` quando o produto/variante movimentado tem `rastreamentoEstoqueAtivo = false` (apply-stock-movement.ts:148 e :231) — o gate é aplicado no grão do INSUMO, que é quem tem saldo. Exigir o flag do prato composto quebraria a feature: pratos ficam com rastreamento desativado por design (nunca têm saldo próprio — plano seção 5.1). A invariante 10 é satisfeita. |
| SEV-2 Aprovação presa em PROCESSANDO | **VÁLIDO (parcial)** | Mitigado: `PROCESSANDO` agora é reivindicável no CAS e aparece no polling do operador — retry é seguro porque `launchTabOrder` dedupa pelo id da solicitação (o pedido nunca duplica). A transação única caller-owned (openTab/launchTabOrder aceitando `tx`) fica como refactor futuro; com a dedupe, a janela residual não produz duplicação nem estado irrecuperável. |
| SEV-2 Pedido aprovado em tab de outro ponto | **VÁLIDO** | Corrigido: server valida `tab.servicePointId === request.servicePointId` (e conta ABERTA) para tab escolhida pelo operador; select do client filtrado pelo ponto. |
| SEV-2 Idempotência opcional no lançamento | **VÁLIDO** | Corrigido: `tabOrderId` UUID obrigatório no schema da rota e no tipo do service. |
| SEV-2 Rascunho de tab editável no fluxo POS | **VÁLIDO** | Corrigido: GET e PUT do rascunho POS rejeitam vendas com `tabId`. |
| SEV-2 Migração 0046 não aplicada | **VÁLIDO** | Operacional: aplicação manual pelo responsável (diretiva do projeto); comando documentado no próprio SQL. |
| SEV-3 Rate limit contornável | **VÁLIDO (aceito)** | Limitação registrada no código e em future-improvements (gatilho: multi-instância). Chave já combina IP + token. |
| SEV-3 Queries sem filtro de organização | **PARCIAL** | Endurecido: filtros de organização adicionados nas queries de custo do launch e na query de modo de baixa da dedução. As demais (ponto/vendedor da tab já validada) permanecem seguras pelos callers atuais; `applyStockMovement`/FEFO já validam organização internamente. |
| SEV-3 CAS da tab após efeitos financeiros | **VÁLIDO** | Corrigido: `ABERTA -> FECHADA` (CAS) agora acontece antes da confirmação da venda; o snapshot de `valorTotal` é preenchido depois, sob o mesmo estado reservado. |
| SEV-3 Desvios de padrão de UI | **PARCIAL** | Corrigido: `requireERPSession` compartilhado (lib/authentication/erp-session.ts) substituiu as 10 cópias; `PublicShell` extraído para `_components`. Pendentes (aceitos por ora): state hooks dedicados nos modais, substituir `window.confirm` por modal de confirmação nomeado, contrato completo de callbacks. |
| Obs.: corrida de idempotência pública sem recomparar payloadHash | **VÁLIDO** | Corrigido: o ramo pós-conflito recompara o hash e retorna 409 quando diverge. |
| Obs.: aprovação não exige produto/variante ativos | **VÁLIDO** | Corrigido: filtros `ativo = true` nas queries de precificação da aprovação. |
