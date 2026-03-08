# Phase 3 - Day 3

## Objetivo do dia
Concluir o rollout full-scope conectando todos os gatilhos EVENTO aos campaign flows e estabilizar observabilidade/operacao para ambiente real.

## Escopo
- Integrar flows event-driven nos pontos de entrada:
  - `app/api/point-of-interaction/new-transaction/route.ts`
  - `pages/api/cron/rfm-analysis.ts`
  - `pages/api/cron/birthday-notify.ts`
  - `pages/api/cron/cashback-expiring-notify.ts`
- Aplicar pipeline unificado: match de trigger -> check audience -> frequency cap/dedup -> criar execucao INDIVIDUAL -> disparar workflow.
- Refinar logs estruturados e tratamento de erro para operacao.
- Validar coexistencia V1 + Campaign Flows sem regressao.

## Arquivos-alvo principais
- `app/api/point-of-interaction/new-transaction/route.ts`
- `pages/api/cron/rfm-analysis.ts`
- `pages/api/cron/birthday-notify.ts`
- `pages/api/cron/cashback-expiring-notify.ts`
- `lib/campaign-flows/execution-orchestrator.ts`
- `lib/campaign-flows/index.ts`

## Plano de implementacao detalhado
1. Integracao no new-transaction
   - Apos processamento V1, buscar flows ativos por gatilho:
     - `NOVA-COMPRA`
     - `PRIMEIRA-COMPRA`
     - `CASHBACK-ACUMULADO`
     - `QUANTIDADE-TOTAL-COMPRAS`
     - `VALOR-TOTAL-COMPRAS`
   - Para cada flow candidato:
     - validar `shouldTriggerFire` com `eventoMetadados`;
     - validar publico (`checkClientInAudience`);
     - validar dedup/frequency cap;
     - criar execucao `INDIVIDUAL` e disparar run.

2. Integracao nos crons de evento
   - `rfm-analysis`: conectar `ENTRADA-SEGMENTACAO` e `PERMANENCIA-SEGMENTACAO`.
   - `birthday-notify`: conectar `ANIVERSARIO-CLIENTE`.
   - `cashback-expiring-notify`: conectar `CASHBACK-EXPIRANDO`.
   - Manter processamento V1 existente sem alteracao destrutiva.

3. Confiabilidade e observabilidade
   - Padronizar logs com chaves:
     - `organizacaoId`, `campanhaId`, `executionId`, `clienteId`, `trigger`, `nodeId`, `status`.
   - Garantir que erros de flow nao interrompam processamento global da organizacao.
   - Garantir idempotencia basica em reprocessamentos de evento.

4. Validacao de convivencia V1 + Flows
   - Garantir ordem de execucao conforme estrategia:
     - V1 primeiro
     - Campaign Flows depois
   - Confirmar ausencia de regressao funcional no legado.

5. Fechamento tecnico
   - Revisar tipos exportados das rotas e libs alteradas.
   - Revisar mensagens de erro/sucesso em portugues conforme padrao.
   - Atualizar notas rapidas de operacao (como monitorar execucoes e steps).

## Criterios de aceite
- Todos os gatilhos EVENTO mapeados disparam campaign flows quando elegiveis.
- Audience + frequency cap + dedup funcionam de forma consistente em todos os entry points.
- Falhas isoladas nao derrubam pipeline de processamento da organizacao.
- V1 continua funcionando em paralelo.

## Riscos e mitigacoes
- Risco: duplicidade V1 + Flow para mesmo contexto -> Mitigar com regras de dedup e monitoramento por cliente/evento.
- Risco: alto volume em eventos -> Mitigar com dispatch assincrono e limites de concorrencia progressivos.
- Risco: divergencia de subtipos com acento/underscore -> Mitigar com normalizacao de subtipos na camada de trigger.

## Validacao recomendada
- Cenarios manuais por trigger:
  - nova compra
  - primeira compra
  - entrada/permanencia RFM
  - aniversario
  - cashback expirando
- Conferir por caso:
  - criou execucao `INDIVIDUAL`;
  - workflow run disparado;
  - steps registrados;
  - resultado final coerente.

## Entregaveis do dia
- Entry points de evento integrados ao motor de campaign flows.
- Pipeline full-scope ativo (manual + recorrente + evento).
- Base de observabilidade suficiente para operacao/diagnostico.
