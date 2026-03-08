# Phase 2 - Day 2

## Objetivo do dia
Entregar a orquestracao completa de campanhas RECORRENTES para campaign flows, com deduplicacao/frequency cap consistente e fechamento correto de execucoes de lote.

## Escopo
- Criar cron dedicado de campaign flows recorrentes.
- Implementar regra de agenda diaria/semanal/mensal baseada em `recorrencia*`.
- Aplicar frequency cap e deduplicacao por cliente antes do disparo.
- Garantir atualizacao de progresso de lote (`loteClientesProcessados`) e finalizacao de status de lote.
- Registrar cron no `vercel.json`.

## Arquivos-alvo principais
- `pages/api/cron/process-recurrent-campaign-flows.ts` (novo)
- `lib/campaign-flows/execution-orchestrator.ts`
- `lib/campaign-flows/index.ts`
- `vercel.json`

## Plano de implementacao detalhado
1. Criar cron de recorrencia para flows
   - Reaproveitar padrao de time blocks existente (`00:00`, `03:00`, ..., `21:00`).
   - Selecionar flows `ATIVO` + `RECORRENTE` + `recorrenciaBlocoHorario` do bloco atual.
   - Aplicar `shouldCampaignRunToday` equivalente para `DIARIO`, `SEMANAL`, `MENSAL`.

2. Resolver publico e gerar lote
   - Para cada flow elegivel:
     - resolver publico (`publicoId`) ou todos os clientes da organizacao;
     - criar execucao `LOTE` com total previsto;
     - disparar run por cliente elegivel.

3. Frequency cap e deduplicacao unificados
   - Introduzir helper de elegibilidade por cliente para flows, cobrindo:
     - recorrencia permitida vs nao permitida;
     - janela de frequencia (intervalo/medida);
     - bloqueio de concorrencia (ja em `EM_EXECUCAO` para mesmo flow/cliente).
   - Reusar esse helper em cron e manual execute.

4. Progresso e fechamento do lote
   - Ao terminar run de cliente, incrementar `loteClientesProcessados`.
   - Quando processados == total, finalizar execucao de lote como:
     - `CONCLUIDA` (sem falhas impeditivas) ou
     - `FALHOU` (quando politica definida marcar lote com erro agregado).
   - Registrar erro agregado em `erro` quando aplicavel.

5. Operacionalizacao em Vercel
   - Adicionar entrada no `vercel.json` para `process-recurrent-campaign-flows`.
   - Manter cron legado intacto (V1 em paralelo).

## Criterios de aceite
- Cron encontra e executa somente flows recorrentes elegiveis do bloco atual.
- Frequency cap impede reenvio indevido.
- Cliente em execucao nao dispara em duplicidade no mesmo periodo.
- Progresso de lote atualiza de forma confiavel.
- Status final de lote reflete resultado real do processamento.

## Riscos e mitigacoes
- Risco: explosao de fanout em horarios de pico -> Mitigar com loteamento interno e backoff leve.
- Risco: corrida entre jobs concorrentes -> Mitigar com checagem de execucao em andamento por cliente/flow.
- Risco: cron atrasado processar bloco incorreto -> Mitigar com funcao de bloco mais recente (padrao existente no projeto).

## Validacao recomendada
- Simular flow recorrente diario no bloco atual e confirmar execucao.
- Simular semanal/mensal com dias validos e invalidos.
- Rodar cron duas vezes seguidas e validar deduplicacao.
- Conferir no banco:
  - `campaign_flow_executions.lote_total_clientes`
  - `campaign_flow_executions.lote_clientes_processados`
  - status final e erros.

## Entregaveis do dia
- Cron recorrente de campaign flows em producao tecnica (codigo + schedule).
- Dedup/frequency cap aplicado no caminho recorrente e manual.
- Lote com progresso/fechamento confiaveis.
