# Phase 1 - Day 1

## Objetivo do dia

Entregar a base executavel do runtime de campaign flows com Vercel Workflows, cobrindo o fluxo manual (UNICA/trigger manual) ponta a ponta com rastreabilidade por execucao e steps.

## Escopo

- Criar endpoint de workflow runner em `app/api/workflows/campaign-flow/route.ts` com `serve()`.
- Definir contrato de payload do runner (executionId, campaignId, organizationId, clientId, eventMetadata).
- Implementar loop de execucao de grafo por cliente (load graph -> process node -> branch -> finalizar).
- Implementar suporte real a delay com `context.sleep()`.
- Integrar envio imediato para acao `ENVIAR-WHATSAPP` via `processSingleInteractionImmediately`.
- Conectar `POST /api/campaign-flows/execute` ao disparo do workflow (fanout inicial para clientes elegiveis).

## Arquivos-alvo principais

- `app/api/workflows/campaign-flow/route.ts` (novo)
- `lib/campaign-flows/execution-orchestrator.ts`
- `app/api/campaign-flows/execute/route.ts`
- `lib/campaign-flows/index.ts`
- `package.json` (dependencia `@vercel/workflow`, se ausente)

## Plano de implementacao detalhado

1. Criar endpoint do workflow runner
   - Implementar `POST = serve<CampaignFlowRunInput>(...)`.
   - Validar payload recebido e falhar cedo com erro explicito.
   - Carregar grafo (`loadFlowGraph`) e validar pre-condicoes (gatilho unico, conectividade minima).

2. Implementar maquina de execucao por cliente
   - Iniciar no no de entrada (`GATILHO`).
   - Para cada no:
     - inserir `campaign_flow_execution_steps` como `EM_EXECUCAO`;
     - processar no via `processNode`;
     - atualizar step para `CONCLUIDO`, `FALHOU`, `PULADO` ou `AGUARDANDO_DELAY`;
     - resolver proximo no via `getNextNodeId`.
   - Adicionar protecao de ciclo infinito (ex.: limite maximo de steps por run).

3. Delay real com Workflows
   - Em no `DELAY`, persistir `delayAte`.
   - Chamar `context.sleep(<label>, <ms>)`.
   - Retomar no mesmo run e seguir para proximo no automaticamente.

4. Integracao da acao WhatsApp no runner
   - Se resultado do node indicar `requiresImmediateProcessing`, montar `ImmediateProcessingData`.
   - Buscar dados necessarios (cliente, template, conexao/credenciais) e chamar `processSingleInteractionImmediately`.
   - Registrar no `resultado` do step metadados importantes (interactionId, status envio, erro se houver).

5. Conectar execute manual ao runtime
   - Em `/api/campaign-flows/execute`, apos `triggerBatchFlow`, obter client IDs elegiveis e disparar runs.
   - Executar fanout assincrono (nao bloquear resposta por tempo excessivo).
   - Resposta da API permanece curta e imediata com `executionId` e total planejado.

## Criterios de aceite

- Disparo manual cria execucao de lote e inicia runs por cliente elegivel.
- Cada run gera trilha de steps com status coerente.
- Nos de delay realmente esperam e retomam.
- Acao de WhatsApp no flow envia (ou enfileira) mensagem via pipeline atual.
- Falhas de node atualizam corretamente step e execucao.

## Riscos e mitigacoes

- Risco: loops no grafo -> Mitigar com limite de iteracoes por run + erro controlado.
- Risco: timeout em fanout grande -> Mitigar com disparo assincrono e processamento desacoplado.
- Risco: divergencia de status em erro parcial -> Mitigar com bloco de finalizacao padrao para execucao/step.

## Validacao recomendada

- Teste manual com fluxo linear simples: GATILHO -> ACAO.
- Teste com delay curto (ex.: 1 minuto) para validar resume.
- Teste com condicao SIM/NAO para validar branching.
- Conferencia nas tabelas:
  - `campaign_flow_executions`
  - `campaign_flow_execution_steps`

## Entregaveis do dia

- Runner de workflow funcional.
- Execute manual conectado ao runner.
- Documentacao breve de payload e fluxo de status (comentarios de alto nivel no arquivo novo, quando necessario).
