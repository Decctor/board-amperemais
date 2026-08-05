# Planejamento — Evolução do Módulo Financeiro

**Status:** Em implementação  
**Data de consolidação:** 04/08/2026  
**Código de referência:** `C:\Users\Lucas\PROJETOS\syncroniza-control`  
**Repositório de implementação:** RecompraCRM

## Objetivo

Evoluir o módulo financeiro do RecompraCRM com:

- gestão completa de contas financeiras;
- tratamento correto de cartões de crédito e seus ciclos de fatura;
- lançamentos contábeis recorrentes;
- decomposição auditável dos valores de transações;
- integração segura dessas capacidades com vendas, compras, PDV, conciliação,
  Open Finance e contas gerenciadas pelo sistema.

O `syncroniza-control` é uma referência de comportamento, não uma fonte para
cópia direta. A implementação deve preservar a arquitetura atual do
RecompraCRM: App Router, isolamento por `organizacaoId`, permissões granulares,
rotas tipadas, estado dedicado, modais separados de criação e controle,
conciliação existente e contas first-party identificadas por `chaveSistema`.

## Como acompanhar este documento

- `[ ]` — pendente;
- `[x]` — concluído e verificado;
- itens concluídos devem, quando útil, receber o número da migration, PR ou
  commit ao lado;
- uma fase só deve ser considerada concluída quando seus critérios de aceite
  estiverem atendidos;
- descobertas que alterem uma decisão de modelagem devem ser registradas na
  seção **Decisões em aberto** antes da implementação divergente.

## Diagnóstico consolidado

| Área                   | RecompraCRM hoje                                                                             | Referência em `syncroniza-control`                                                                         | Tratamento neste plano                               |
| ---------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Contas financeiras     | Tipos `CAIXA`, `BANCO` e `CARTEIRA_DIGITAL`; rota apenas de leitura; tela sem criação/edição | Configuração discriminada por tipo e criação; operações de atualização existem, mas não há modal de edição | Adaptar e completar                                  |
| Cartão de crédito      | Não é um tipo de conta financeira                                                            | Ciclo, previsão de vencimento e saldo como passivo parcialmente implementados                              | Portar, endurecer e completar                        |
| Faturas de cartão      | Inexistentes                                                                                 | Documento de exploração recomenda visão derivada; implementação ainda ausente                              | Implementar como visão derivada                      |
| Recorrência contábil   | Inexistente                                                                                  | Regras, UI, geração e cron implementados                                                                   | Portar para App Router e reforçar idempotência       |
| Modificadores de valor | Apenas `valor`                                                                               | Base, juros, multa, taxas e desconto                                                                       | Portar de forma compatível                           |
| Conciliação            | Importação, matching, rematch e Open Finance já implementados                                | Implementação genérica                                                                                     | Preservar RecompraCRM e restringir por tipo de conta |
| Transferências         | Já implementadas com duas transações                                                         | Implementadas                                                                                              | Reutilizar para pagamento de cartão                  |
| Permissões             | `canViewFinances`, `canCreateFinances`, `canEditFinances`, `canReconcileFinances`            | Permissões do projeto de origem                                                                            | Preservar helpers do RecompraCRM                     |
| Contas first-party     | `chaveSistema`, provisionamento idempotente do iFood                                         | Sem o mesmo contrato                                                                                       | Preservar e proteger                                 |

## Decisões de modelagem firmadas

### 1. Conta financeira usa configuração discriminada

Campos específicos de banco, cartão ou integração ficam em
`financialAccounts.configuracao`, discriminados por `categoria`. O valor de
`configuracao.categoria` deve ser igual a `financialAccounts.tipo`.

Categorias previstas:

- `BANCO`;
- `CAIXA`;
- `CARTEIRA_DIGITAL`;
- `CARTAO_CREDITO`;
- `INVESTIMENTO`;
- `OUTRO`.

### 2. Saldo depende da natureza operacional da conta

```text
Contas de caixa:
saldo = saldoInicial + ENTRADAS - SAIDAS

Contas de passivo, como CARTAO_CREDITO:
saldo = saldoInicial + SAIDAS - ENTRADAS
```

O dashboard não deve somar caixa e passivos como se representassem a mesma
coisa. Deve apresentar, no mínimo, caixa disponível, passivos e posição
líquida.

### 3. Fatura de cartão é uma visão derivada

Não criar inicialmente tabelas persistentes de faturas ou itens de fatura. A
fatura é derivada de:

- conta financeira do cartão;
- `dataPrevisao` das transações;
- `dataCompetencia` do lançamento contábil;
- tipo da transação;
- configuração do ciclo;
- pagamentos registrados como entradas no cartão.

Esta decisão deve ser revisitada somente se integrações futuras exigirem uma
identidade externa durável de fatura.

### 4. Pagamento de cartão reutiliza transferência

Pagamento de fatura gera um par de movimentos:

- `SAIDA` na conta bancária/caixa;
- `ENTRADA` na conta de cartão, reduzindo o passivo.

O fluxo deve reutilizar a infraestrutura de transferência, com regras e
rótulos específicos para pagamento de fatura.

### 5. Recorrência materializa lançamentos futuros

A recorrência persiste uma regra e templates. Um cron materializa lançamentos
e suas transações dentro de uma janela de antecedência. Instâncias já geradas
não são reescritas quando a regra muda.

### 6. Idempotência de recorrência pertence ao banco

A combinação `(recorrenciaRegraId, recorrenciaInstanciaData)` deve ser única.
O gerador deve inserir cada ocorrência de forma atômica e usar a restrição
única como proteção contra crons concorrentes. Não depender apenas de uma
consulta anterior ao insert.

### 7. Valores monetários relevantes ficam em colunas

```text
valor = valorBase + valorJuros + valorMulta + valorTaxas - valorDesconto
```

`modificadoresMetadata` guarda apenas contexto não monetário, como origem,
regra aplicada, parâmetros e observações.

### 8. Contas first-party não são contas comuns

Contas com `chaveSistema` continuam provisionadas e identificadas pelo
sistema. A UI não deve permitir mudança de tipo, exclusão ou alteração de sua
chave. Campos que possam ser editados pelo usuário devem ser definidos
explicitamente.

## Ordem de implementação

```text
Fase 1 — Fundação de contas e valores
        ↓
Fase 2 — CRUD e modais de contas
        ↓
Fase 3 — Semântica de cartão de crédito
        ↓
Fase 4 — Recorrência contábil
        ↓
Fase 5 — Faturas derivadas e pagamento
        ↓
Fase 6 — Integrações, rollout e limpeza
```

As fases podem ser divididas em PRs menores, mas a dependência acima deve ser
respeitada.

## Registro da implementação atual

### Entregue nesta etapa

- [x] Fundação de configuração discriminada de contas, incluindo cartão de
      crédito, investimento e campos legados de banco compatíveis.
- [x] CRUD protegido de contas financeiras, com menus separados de criação e
      controle, validação de organização, conta contábil, conta de pagamento e
      contas first-party.
- [x] Previsão de vencimento de cartão centralizada no servidor e saldo de
      cartão tratado como passivo.
- [x] Regra de recorrência manual com configuração, templates, edição de
      status e materialização idempotente por cron.
- [x] Criação de lançamento e regra recorrente na mesma transação de banco.
- [x] Modificadores monetários em transações, normalização compatível e
      migration `drizzle/0066_financial_transaction_modifiers.sql`.
- [x] Faturas derivadas por cartão/vencimento, com status de aberto, parcial,
      pago, vencido e credor.
- [x] Pagamento de cartão como movimento atômico banco/conta de cartão,
      com classificação `PAGAMENTO_CARTAO` e idempotência opcional.
- [x] Migrations manuais `drizzle/0064a_financial_account_enums.sql`,
      `drizzle/0064_financial_account_configuration.sql` e
      `drizzle/0065_financial_recurring_rules.sql` preparadas para aplicação.

### Verificações executadas

- [x] 14 testes unitários financeiros focados passaram.
- [x] Oxlint nos arquivos alterados passou sem warnings ou erros.
- [x] Oxfmt nos arquivos alterados passou.
- [x] TypeScript não reportou erros nos arquivos alterados; o projeto ainda
      possui erros preexistentes fora deste corte.
- [ ] Migrations aplicadas em banco de desenvolvimento.
- [ ] Smoke tests autenticados de CRUD, cartão e cron executados.

---

## Fase 1 — Fundação de contas financeiras e valores

### Enums

- [x] Adicionar `CARTAO_CREDITO`, `INVESTIMENTO` e `OUTRO` ao
      `financialAccountTypeEnum` em `services/drizzle/schema/enums.ts`.
- [x] Espelhar os valores em `FinancialAccountTypeEnum` de
      `schemas/enums.ts`.
- [x] Adicionar `PAGAMENTO` ao enum PostgreSQL e ao enum Zod de tipo de conta
      bancária.
- [x] Adicionar `RECORRENCIA` ao enum PostgreSQL e ao enum Zod de origem de
      lançamento contábil.
- [x] Atualizar `FinancialAccountTypeOptions` e
      `AccountingEntryOriginTypeOptions` em `utils/select-options.tsx`.
- [ ] Revisar todos os `Record` e switches exaustivos afetados pelos novos
      valores.

### Configuração discriminada

- [x] Definir schemas Zod de configuração em `schemas/financial.ts`.
- [x] Exportar `TFinancialAccountConfiguration`.
- [x] Cobrir configurações de banco, caixa, carteira digital, cartão,
      investimento e outro.
- [x] Incluir em cartão:
  - [x] `limiteCredito`;
  - [x] `diaFechamentoFatura`;
  - [x] `diaVencimentoFatura`;
  - [x] `contaPagamentoPadraoId`;
  - [x] `taxaJurosMensal`;
  - [x] `taxaMulta`;
  - [x] `taxaFixa`.
- [x] Validar dias de fechamento/vencimento entre 1 e 31.
- [x] Adicionar `configuracao` JSONB ao schema Drizzle de contas financeiras.
- [x] Garantir que seeds e provisionadores sempre informem uma configuração
      válida.

### Classificação e cálculo de saldo

- [x] Criar um módulo puro em `lib/finances/` para classificar contas como
      caixa ou passivo.
- [x] Concentrar nesse módulo o cálculo de saldo por tipo.
- [x] Substituir fórmulas locais existentes na rota de contas e no gráfico.
- [x] Testar entradas, saídas, saldo inicial e data do saldo inicial para
      ambos os tipos de saldo.

### Decomposição do valor de transações

- [x] Adicionar às transações financeiras:
  - [x] `valorBase`;
  - [x] `valorJuros`;
  - [x] `valorMulta`;
  - [x] `valorTaxas`;
  - [x] `valorDesconto`;
  - [x] `modificadoresMetadata`.
- [x] Criar schema Zod tipado para metadata não monetária.
- [x] Criar normalizador compartilhado em `lib/finances/financial-transaction-value.ts`.
- [x] Validar a equação do valor total no servidor.
- [x] Reutilizar a tolerância contábil de `0,02` para arredondamentos.

### Migration de compatibilidade

- [x] Criar migration SQL prefixada com `ampmais_`.
- [x] Adicionar novos valores de enums em etapa compatível com PostgreSQL.
- [x] Adicionar `configuracao` inicialmente nullable.
- [x] Backfill de configuração a partir das colunas bancárias atuais.
- [x] Backfill das demais contas com configuração mínima por tipo.
- [x] Tornar `configuracao` obrigatória após o backfill.
- [x] Adicionar colunas de modificadores (`0066`).
- [x] Backfill `valorBase = valor` e demais modificadores com zero (`0066`).
- [x] Não remover as colunas bancárias legadas nesta fase.
- [x] Documentar aplicação manual da migration conforme o padrão atual do
      repositório.

### Critérios de aceite da Fase 1

- [ ] Todas as contas existentes parseiam com o novo schema.
- [ ] Seeds de organização e contas first-party continuam funcionando.
- [ ] Saldos de contas antigas permanecem iguais antes e depois da migration.
- [x] Uma conta de cartão calcula saldo devedor com a semântica inversa.
- [x] Testes unitários cobrem configuração, classificação e saldo.

---

## Fase 2 — CRUD e modais de contas financeiras

### Rota App Router

- [x] Evoluir `app/api/finances/financial-accounts/route.ts` para GET
      multi-mode:
  - [x] listagem padrão;
  - [x] busca por ID.
- [x] Adicionar POST para criação.
- [x] Adicionar PUT para atualização.
- [ ] Avaliar DELETE apenas para contas sem vínculos; desativação deve ser o
      fluxo padrão.
- [x] Exportar todos os tipos de input e output.
- [x] Manter `{ data, message }` nas respostas de mutação.
- [x] Aplicar `canViewFinances`, `canCreateFinances` e `canEditFinances` de
      acordo com o método.
- [x] Validar posse por `organizacaoId` em todas as relações.
- [x] Validar `contaContabilId` dentro da organização.
- [x] Validar correspondência entre `tipo` e `configuracao.categoria`.
- [x] Validar que `contaPagamentoPadraoId`, quando presente, é ativa,
      cash-like e da mesma organização.
- [x] Impedir alteração de `chaveSistema` pelo payload.
- [x] Aplicar regras de edição para contas first-party.

### Queries, mutations e estado

- [x] Adicionar query `useFinancialAccountById` em `lib/queries/finances.ts`.
- [x] Expor a `queryKey` da query por ID.
- [x] Adicionar `createFinancialAccount` em `lib/mutations/finances.ts`.
- [x] Adicionar `updateFinancialAccount` em `lib/mutations/finances.ts`.
- [x] Criar `state-hooks/use-internal-financial-account-state.tsx`.
- [x] Incluir defaults por tipo de conta.
- [x] Redefinir a configuração ao trocar o tipo para evitar payloads híbridos.
- [x] Expor `state`, atualizadores, `redefineState` e `resetState`.

### Modais e blocos

- [x] Criar `components/Modals/Finances/FinancialAccounts/NewFinancialAccount.tsx`.
- [x] Criar `components/Modals/Finances/FinancialAccounts/ControlFinancialAccount.tsx`.
- [x] Criar blocos reutilizáveis para:
  - [x] informações gerais;
  - [x] saldo inicial;
  - [x] vínculo contábil;
  - [x] dados bancários;
  - [x] configuração de cartão;
  - [x] status e informações de conta first-party.
- [x] Carregar e hidratar o modal de controle pela query por ID.
- [x] Incluir callbacks padronizados nos dois modais.
- [x] Invalidar listagem, detalhe, gráficos e configurações relacionadas após
      mutações.
- [x] Exibir erros com `getErrorMessage` e sucesso em português.

### Página de contas

- [x] Adicionar ação “Nova conta” conforme a permissão de criação.
- [x] Permitir abrir `ControlFinancialAccount` a partir do card.
- [x] Exibir todos os novos tipos com ícones e cores consistentes.
- [x] Exibir detalhes bancários a partir de `configuracao`.
- [x] Exibir resumo de ciclo e limite para cartões.
- [x] Diferenciar visualmente saldo atual de saldo devedor.
- [x] Oferecer criar a primeira conta no estado vazio.
- [x] Respeitar a permissão de edição na UI sem depender dela como proteção
      única.

### Critérios de aceite da Fase 2

- [ ] Usuário autorizado cria cada tipo de conta suportado.
- [ ] Usuário autorizado edita uma conta e vê a listagem atualizar.
- [ ] Usuário sem permissão recebe bloqueio no servidor e não vê ações na UI.
- [ ] Conta first-party não pode ter tipo, chave ou identidade estrutural
      alterados indevidamente.
- [ ] Relações de outra organização são rejeitadas.
- [ ] Conta em uso pode ser desativada sem quebrar o histórico.

---

## Fase 3 — Semântica de cartão de crédito

### Ciclo e previsão

- [x] Portar o cálculo de previsão de cartão para `lib/finances/credit-card.ts`.
- [x] Usar a data de competência como data de referência da compra.
- [x] Calcular `dataPrevisao` como vencimento da fatura correspondente.
- [x] Definir explicitamente o tratamento de compra no dia do fechamento.
- [x] Truncar dias 29, 30 e 31 para o último dia do mês quando necessário.
- [x] Tratar vencimento no mesmo mês ou mês seguinte conforme fechamento.
- [x] Centralizar a regra no servidor; a UI apenas antecipa o resultado.
- [ ] Definir override manual deliberado, com indicação visual e metadata.

### Formulários e fluxos afetados

- [x] Atualizar transações de lançamentos contábeis.
- [ ] Atualizar controle simplificado de transação financeira.
- [ ] Atualizar transações de compras.
- [ ] Revisar geração de transações de vendas.
- [ ] Ao trocar a conta selecionada, recalcular ou solicitar confirmação da
      previsão conforme o tipo.
- [ ] Exibir fechamento e vencimento junto à opção de cartão.
- [ ] Manter transações antigas com previsão manual intactas.

### Saldos, gráficos e totais

- [x] Tornar a listagem de contas type-aware.
- [x] Tornar o gráfico de conta type-aware.
- [x] Exibir `totalCaixa`. (Entregue no workspace de fluxo de caixa — `/dashboard/finance/reports/cash-flow`, ver `finance-analytics-and-route-separation-plan.md`.)
- [x] Exibir `totalPassivos`. (Idem — chip "PASSIVOS" no card CAIXA CONSOLIDADO.)
- [x] Exibir `posicaoLiquida = totalCaixa - totalPassivos`. (Idem — calculada em `lib/finances/analytics/balances.ts` e exposta por `/api/finances/analytics/cash-flow`.)
- [ ] Não incluir investimento em “caixa disponível” sem uma decisão explícita
      sobre liquidez; usar total separado se necessário.
- [x] Revisar labels e cores para não representar dívida como dinheiro
      disponível.

### Restrições em recebimentos e integrações

- [ ] Excluir cartões corporativos das contas selecionáveis no PDV.
- [ ] Excluir cartões das contas padrão de métodos de recebimento.
- [ ] Validar essa restrição também em
      `resolve-payment-financial-account.ts`.
- [ ] Permitir Open Finance somente para tipos compatíveis.
- [ ] Restringir importação de extrato bancário a contas compatíveis enquanto
      extrato de cartão não possuir fluxo próprio.
- [ ] Atualizar a prioridade e os filtros da tela de conciliação.

### Testes obrigatórios

- [x] Compra antes do fechamento.
- [ ] Compra no fechamento.
- [x] Compra após o fechamento.
- [ ] Vencimento maior que o fechamento.
- [ ] Vencimento menor que o fechamento.
- [ ] Fevereiro comum e bissexto.
- [x] Mês com 30 dias e configuração no dia 31.
- [x] Saldo devedor com compras e pagamentos parciais.
- [ ] Rejeição de cartão como conta de recebimento.

### Critérios de aceite da Fase 3

- [ ] Compra em cartão recebe a previsão correta no cliente e no servidor.
- [ ] Saldo de cartão representa dívida, não disponibilidade.
- [x] Totais do dashboard separam caixa e passivos. (Atendido pelo workspace de fluxo de caixa; ver `finance-analytics-and-route-separation-plan.md`.)
- [ ] Cartão não aparece onde apenas contas de recebimento são válidas.
- [ ] Fluxos bancários existentes não sofrem regressão.

---

## Fase 4 — Lançamentos contábeis recorrentes

### Schema e migration

- [x] Criar `financialRecurringRules` no schema financeiro.
- [x] Incluir `organizacaoId`, `autorId` e lançamento de origem.
- [x] Incluir status `ATIVA`, `PAUSADA` e `ENCERRADA`.
- [x] Persistir configuração de frequência e templates em JSONB tipado.
- [x] Incluir `proximaGeracaoEm`, `ultimaGeracaoEm`, `gerarAte`, timestamps e
      índices.
- [x] Adicionar aos lançamentos:
  - [x] `recorrenciaRegraId`;
  - [x] `recorrenciaInstanciaData`;
  - [x] `recorrenciaGeradoEm`.
- [x] Criar índice único parcial por regra e data da instância.
- [x] Definir FKs e comportamento de exclusão compatíveis com
      `organizacaoId` e histórico contábil.
- [x] Criar migration manual prefixada com `ampmais_`.

### Schemas e módulo de recorrência

- [x] Criar schemas Zod para frequência, status, configuração e input.
- [x] Suportar frequências diária, semanal, mensal e anual.
- [x] Suportar intervalo, início, término, dia do mês, dia da semana,
      antecedência e timezone.
- [x] Criar funções puras para normalização e cálculo de ocorrências.
- [x] Limitar loops e horizonte para evitar expansão sem limite.
- [x] Criar template sem o ID do lançamento gerado, preservando referências
      contábeis necessárias.
- [x] Criar templates de transação com modo de previsão:
  - [x] mesma data da competência;
  - [x] dia fixo;
  - [x] inferir pela conta.
- [x] Para cartão, inferir previsão pelo ciclo da conta no momento da geração.

### Integração com a rota de lançamentos

- [ ] Incluir `recurrenceRule` nos inputs de criação e atualização.
- [x] Inicialmente aceitar recorrência apenas em lançamentos `MANUAL`.
- [x] Criar regra e lançamento de origem na mesma transação de banco.
- [x] Atualizar template e configuração sem alterar instâncias existentes.
- [x] Pausar ou encerrar regra de forma explícita.
- [x] Retornar regra junto à consulta por ID.
- [x] Impedir que uma instância gerada seja transformada em nova regra por
      acidente.
- [ ] Definir regras de edição para lançamentos com origem `RECORRENCIA`.

### Estado e UI

- [ ] Estender `use-internal-accounting-entry-state.tsx` com regra recorrente.
- [x] Criar bloco `Recurrence.tsx` nos modais de lançamento.
- [x] Incluir toggle de recorrência.
- [x] Incluir frequência, intervalo, término e âncoras de calendário.
- [ ] Exibir resumo humano da regra.
- [ ] Exibir aviso de que mudanças valem apenas para instâncias futuras.
- [ ] Exibir status, última e próxima geração em regra existente.
- [ ] Mostrar banner de origem e restringir edição em instâncias geradas.

### Geração e cron

- [x] Criar módulo de geração em `lib/finances/`.
- [x] Buscar somente regras ativas cuja próxima ocorrência esteja no
      horizonte.
- [ ] Processar em lotes para evitar timeout serverless.
- [x] Criar cada ocorrência e suas transações em uma transação de banco.
- [x] Usar insert protegido pela chave única para concorrência.
- [x] Atualizar o cursor somente após geração confirmada.
- [x] Isolar falhas por regra e retornar contadores e erros.
- [ ] Adicionar logs com IDs de regra e organização, sem dados sensíveis.
- [x] Criar `/app/api/cron/generate-recurring-entries/route.ts`.
- [x] Usar `assertCronAuthorized`.
- [x] Registrar o cron diário em `vercel.json`.
- [ ] Definir comportamento para backlog maior que uma execução.

### Testes obrigatórios

- [ ] Próxima ocorrência diária, semanal, mensal e anual.
- [ ] Intervalos maiores que um.
- [x] Dia 31 em meses curtos.
- [ ] Término inclusivo/exclusivo conforme decisão documentada.
- [ ] Timezone `America/Sao_Paulo`.
- [ ] Pausa e encerramento.
- [ ] Alteração sem reescrever instâncias existentes.
- [ ] Duas execuções simultâneas sem duplicidade.
- [ ] Retomada após falha parcial.
- [ ] Previsão recorrente em cartão de crédito.

### Critérios de aceite da Fase 4

- [ ] Usuário cria, edita, pausa e encerra uma recorrência manual.
- [ ] Cron gera lançamento e transações dentro da antecedência configurada.
- [ ] Execuções repetidas ou concorrentes não duplicam ocorrências.
- [ ] Instâncias geradas mantêm rastreabilidade até a regra.
- [ ] Alterações afetam somente ocorrências futuras.

---

## Fase 5 — Faturas derivadas e pagamento de cartão

### Consulta de faturas

- [x] Definir input por conta, período e vencimento.
- [x] Criar rota App Router `app/api/finances/credit-card-invoices/route.ts`.
- [x] Agrupar saídas do cartão por ciclo/data de vencimento.
- [x] Subtrair entradas que representem pagamentos.
- [x] Expor vencimento, total faturado, valor pago, créditos, saldo restante,
      status derivado e transações componentes.
- [x] Definir tratamento de pagamento parcial e pagamento em excesso (`CREDORA`).
- [x] Evitar inferir quitação apenas por data; usar os movimentos no cartão.

### UI de faturas

- [x] Adicionar visão de faturas na área financeira.
- [x] Exibir faturas abertas, futuras e pagas.
- [ ] Permitir abrir os lançamentos/transações que compõem a fatura.
- [ ] Exibir limite total, valor utilizado e limite disponível quando
      configurado.
- [ ] Exibir aviso quando o limite não estiver configurado.

### Pagamento

- [x] Criar menu “Pagar fatura”.
- [x] Pré-selecionar `contaPagamentoPadraoId` quando válido.
- [x] Permitir pagamento total ou parcial, bloqueando excesso no servidor.
- [x] Reutilizar a infraestrutura transacional de transferência.
- [x] Validar origem cash-like e destino `CARTAO_CREDITO`.
- [x] Criar classificação contábil `PAGAMENTO_CARTAO` entre passivo e caixa.
- [x] Proteger reenvios com `chaveIdempotencia` e migration `0067`.
- [x] Invalidar conta, gráfico, faturas, transações e lançamentos após o
      pagamento.

### Critérios de aceite da Fase 5

- [x] Fatura derivada fecha com a soma de suas transações.
- [x] Pagamento parcial reduz corretamente saldo da fatura e do cartão.
- [x] Pagamento total marca a fatura como quitada pela regra derivada.
- [x] Conta bancária e cartão refletem lados opostos do pagamento.
- [x] Não há tabela persistente de faturas sem nova decisão arquitetural.

---

## Fase 6 — Integrações, rollout e limpeza

### Call sites e compatibilidade

- [ ] Atualizar `config/onboarding.tsx` e criação de organizações.
- [ ] Atualizar `app/api/organizations/route.ts`.
- [ ] Atualizar `lib/finances/first-party-accounts.ts`.
- [ ] Atualizar `components/Settings/SettingsFinances.tsx`.
- [ ] Atualizar `lib/payments/resolve-payment-financial-account.ts`.
- [ ] Atualizar o endpoint de contas financeiras do POS.
- [x] Atualizar compras e suas tabelas de transações.
- [x] Atualizar vendas, fechamento de conta e sessões de caixa para preencher
      `valorBase` e modificadores legados.
- [x] Atualizar transferência, efeito e controle de transações.
- [ ] Atualizar conciliação, rematch e importações.
- [ ] Atualizar Open Finance.
- [ ] Atualizar estatísticas, gráficos e relatórios.
- [ ] Revisar serialização de `configuracao` e datas em queries.

### Observabilidade e operação

- [ ] Adicionar logs estruturados para geração recorrente.
- [ ] Definir contadores de regras processadas, ocorrências criadas e falhas.
- [ ] Definir alerta para falhas repetidas do cron.
- [ ] Registrar procedimento de reprocessamento seguro.
- [ ] Validar impacto de volume nos índices e queries do dashboard.

### Remoção de legado

- [ ] Confirmar que nenhum caller lê `codigoBanco`, `nomeBanco`, `agencia`,
      `numeroConta`, `digitoConta` ou `tipoConta` diretamente.
- [ ] Remover esses campos dos schemas Zod e Drizzle.
- [ ] Criar migration separada para remover colunas legadas.
- [ ] Não remover colunas no mesmo deploy que introduz o novo formato.

### Verificação final

- [ ] Executar testes financeiros focados.
- [ ] Executar `npm run lint`.
- [ ] Executar `npm run format:check`.
- [ ] Executar verificação TypeScript/build conforme o fluxo vigente do repo.
- [ ] Smoke test de conta bancária existente.
- [ ] Smoke test de criação e edição de cada tipo de conta.
- [ ] Smoke test de compra e pagamento em cartão.
- [ ] Smoke test de recorrência e reexecução do cron.
- [ ] Smoke test de conciliação bancária.
- [ ] Smoke test de venda/PDV sem permissão financeira administrativa.
- [ ] Confirmar ausência de lockfiles de outros package managers.

### Critérios de aceite da Fase 6

- [ ] Fluxos financeiros existentes continuam operacionais.
- [ ] Nenhuma conta de outra organização pode ser referenciada.
- [ ] Contas de cartão não vazam para seletores de recebimento.
- [ ] Migration e rollback operacional estão documentados.
- [ ] Colunas legadas só são removidas após comprovação de ausência de uso.

---

## Estratégia de migrations e deploy

### Ordem de aplicação atual

O script `scripts/apply-sql-migration.ts` executa cada arquivo em uma
transação. Por isso o enum precisa ser confirmado em uma migration separada:

```powershell
npx tsx ./scripts/apply-sql-migration.ts drizzle/0064a_financial_account_enums.sql
npx tsx ./scripts/apply-sql-migration.ts drizzle/0064_financial_account_configuration.sql
npx tsx ./scripts/apply-sql-migration.ts drizzle/0065_financial_recurring_rules.sql
npx tsx ./scripts/apply-sql-migration.ts drizzle/0066_financial_transaction_modifiers.sql
npx tsx ./scripts/apply-sql-migration.ts drizzle/0067a_accounting_payment_enum.sql
npx tsx ./scripts/apply-sql-migration.ts drizzle/0067_financial_card_payment_idempotency.sql
```

As migrations `0066` e `0067` são compatíveis com reexecução (`IF NOT
EXISTS`). A aplicação em desenvolvimento e os smoke tests autenticados ainda
dependem da execução pelo operador.

### Deploy A — Compatibilidade

- [ ] Adicionar enums, `configuracao`, modificadores e estruturas de
      recorrência.
- [ ] Executar backfills.
- [ ] Verificar contagens e ausência de configuração inválida.
- [ ] Manter colunas bancárias antigas.

### Deploy B — Código novo

- [ ] Publicar leitura pelo novo formato.
- [ ] Publicar CRUD de contas.
- [ ] Publicar semântica de cartão e recorrência.
- [ ] Monitorar erros de parse, saldo e cron.

### Deploy C — Limpeza

- [ ] Confirmar estabilidade e ausência de rollback pendente.
- [ ] Remover leituras legadas.
- [ ] Aplicar migration de remoção das colunas antigas.

## Estratégia de testes

### Correções de sincronização e performance dos menus

- [x] Derivar o valor total de base, juros, multa, taxas e desconto no submenu
      de transação.
- [x] Validar o detalhamento monetário antes de anexar a transação ao
      lançamento.
- [x] Preservar modificadores existentes ao hidratar e atualizar compras.
- [x] Centralizar a invalidação das consultas financeiras afetadas por
      mutações.
- [x] Evitar que refetches sobrescrevam alterações ainda não salvas nos menus.
- [x] Evitar deslocamento de data por fuso na efetivação de transações.
- [x] Consultar contas sem estatísticas nos seletores e agrupar transações uma
      única vez no cálculo de saldos.
- [x] Normalizar entradas numéricas em formatos `pt-BR` e `en-US`.
- [x] Usar identificadores estáveis na prévia de múltiplas transações.
- [x] Exibir o vencimento calculado pelo ciclo do cartão.
- [ ] Executar smoke test autenticado dos fluxos de criação, edição,
      efetivação e compra.

### Testes unitários

- [x] Equação e compatibilidade de modificadores monetários.
- [x] Agrupamento e status de faturas derivadas.

- [ ] Configuração padrão por tipo.
- [ ] Correspondência tipo/configuração.
- [ ] Classificação caixa/passivo.
- [ ] Cálculo de saldo.
- [ ] Ciclo de cartão.
- [ ] Normalização do valor da transação.
- [ ] Cálculo de ocorrências recorrentes.
- [ ] Resolução da previsão de transações recorrentes.

### Testes de integração

- [ ] CRUD com permissões e isolamento por organização.
- [ ] Validação de conta contábil e conta de pagamento.
- [ ] Geração atômica de ocorrência e transações.
- [ ] Idempotência concorrente.
- [ ] Pagamento de cartão como transferência.
- [ ] Restrições em POS, pagamentos, Open Finance e conciliação.

### Casos de regressão

- [ ] Organização antiga com contas bancárias existentes.
- [ ] Conta first-party do iFood.
- [ ] Venda confirmada com conta padrão de recebimento.
- [ ] Compra com múltiplas transações.
- [ ] Transferência entre duas contas cash-like.
- [ ] Importação e conciliação de extrato bancário.

## Fora do escopo deste ciclo

- Persistência própria de faturas e itens de fatura.
- Integrações diretas com emissores de cartão.
- Parcelamento ou refinanciamento formal de fatura.
- Conciliação automática de extrato de cartão antes de existir um formato de
  importação específico.
- Recorrência automática para vendas ou compras originadas por entidades de
  negócio; a primeira versão cobre lançamentos manuais.
- Reescrita retroativa de instâncias já geradas.
- Conversão automática entre moedas.
- Contabilidade por partidas múltiplas além do modelo atual de débito/crédito.

## Decisões em aberto

- [ ] **Compra no dia do fechamento:** entra na fatura atual ou na seguinte?
      Recomendação inicial: considerar a fatura atual até o fim do dia de
      fechamento, salvo regra mais precisa de uma futura integração.
- [ ] **Override da previsão do cartão:** permitir sempre ou apenas por ação
      explícita? Recomendação: ação explícita com indicador visual e metadata.
- [ ] **Liquidez de investimentos:** incluir em caixa disponível ou separar?
      Recomendação: separar até existir classificação de liquidez.
- [ ] **Hard delete de conta:** disponibilizar ou trabalhar apenas com
      desativação? Recomendação: hard delete somente para conta manual sem qualquer
      vínculo; caso contrário, desativar.
- [ ] **Campos editáveis de conta first-party:** somente nome/descrição ou
      nenhum? Recomendação: permitir descrição e bloquear identidade, tipo e
      configuração estrutural.
- [ ] **Identidade de pares de transferência:** adicionar `grupoTransferenciaId`
      agora ou em evolução futura? Recomendação: avaliar antes da Fase 5, pois
      melhora a associação inequívoca de pagamentos de cartão.

## Sequência sugerida de PRs

- [ ] **PR 1:** enums, configuração discriminada, migration compatível,
      classificação e testes puros.
- [ ] **PR 2:** rota completa e modais de criação/controle de contas.
- [ ] **PR 3:** modificadores, ciclo de cartão, saldos e seletores compatíveis.
- [ ] **PR 4:** schema, UI e módulo de recorrência.
- [ ] **PR 5:** cron idempotente e observabilidade.
- [ ] **PR 6:** faturas derivadas e pagamento.
- [ ] **PR 7:** compatibilidade transversal e remoção posterior do legado.

## Definição de pronto global

- [ ] Todos os critérios de aceite das fases foram concluídos.
- [ ] Migrations foram aplicadas na ordem documentada.
- [ ] Contas existentes preservaram seus saldos e vínculos.
- [ ] Cartões operam como passivo e possuem ciclo previsível.
- [ ] Contas podem ser criadas e controladas por modais próprios.
- [ ] Recorrências são geradas sem duplicidade.
- [ ] Faturas derivadas e pagamentos fecham matematicamente.
- [ ] Permissões e isolamento por organização foram verificados no servidor.
- [ ] Vendas, compras, PDV, conciliação, Open Finance e contas first-party
      passaram por regressão.
- [ ] Documentação operacional e decisões finais foram atualizadas.
