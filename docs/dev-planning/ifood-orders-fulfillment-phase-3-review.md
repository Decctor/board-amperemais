# Review da Fase 3 — Política de canal e esteira unificada do iFood

> Documento de referência: [`ifood-orders-fulfillment-plan.md`](./ifood-orders-fulfillment-plan.md)
>
> Escopo: alterações presentes na working tree relacionadas à Fase 3.

## Resumo executivo

A implementação estabelece corretamente a base da política de canal, inclui pedidos do iFood na esteira de atendimento e introduz o status operacional canônico nos conectores. Os principais riscos identificados estão concentrados em:

1. idempotência sob imports concorrentes;
2. conclusão manual de pedidos que deveriam ser concluídos somente por evento do iFood;
3. ausência da etapa explícita de início de preparo;
4. repetição de efeitos para vendas válidas de valor zero;
5. despacho sem considerar quem realiza a entrega;
6. ausência do cancelamento de pedidos confirmados na interface unificada.

Também foi revisada a recomendação inicial sobre autorização. Operar pedidos vindos de integrações deve exigir permissões de **vendas**, e não permissão para gerenciar a configuração das integrações.

---

## 1. Autorização da esteira

### Situação encontrada

A nova API de confirmação/recusa verifica autenticação, vínculo com a organização e acesso ao ERP, mas não verifica uma permissão específica de vendas. No frontend, a fila recebe `canManage` fixo como `true`.

### Regra recomendada

- Visualizar o board, a fila e os motivos de cancelamento: `permissoes.vendas.visualizar`.
- Confirmar, recusar, cancelar ou mudar o status de um pedido: `permissoes.vendas.editar`.
- Configurar, conectar ou reconectar o iFood: `permissoes.integracoes.gerenciar`.

Essa separação permite que a equipe operacional gerencie pedidos sem receber acesso às credenciais e configurações da integração.

### Ajustes sugeridos

1. Exigir `vendas.visualizar` nos endpoints de leitura da esteira e dos motivos.
2. Exigir `vendas.editar` nos endpoints de confirmação, recusa e transição de atendimento.
3. Calcular o `canManage` do frontend a partir de `permissoes.vendas.editar`, removendo o valor fixo `true`.
4. Manter `integracoes.gerenciar` apenas nas superfícies administrativas da integração.

---

## 2. Idempotência e concorrência de imports

### Problema

O pipeline consulta as vendas existentes e depois decide entre `INSERT` e `UPDATE`. Não existe uma constraint única para `(organizacaoId, idExterno)`, nem lock ou `UPSERT` que torne essa decisão atômica.

Dois webhooks ou imports simultâneos podem:

- inserir duas vendas para o mesmo pedido externo;
- calcular `becameValid = true` nas duas transações;
- atualizar métricas mais de uma vez;
- gerar cashback, campanhas e interações duplicadas;
- tentar baixar estoque simultaneamente.

As guardas atuais de cashback e estoque também seguem o padrão `SELECT` seguido de `INSERT`, que não garante exclusão mútua em transações concorrentes.

### Ajuste mínimo recomendado

1. Adicionar unicidade no banco para `sales(organizacao_id, id_externo)`.
2. Tratar a criação da venda com `INSERT ... ON CONFLICT`/UPSERT.
3. Adquirir um `pg_advisory_xact_lock` por organização no início da transação de importação.

O lock por organização faz com que dois batches já coletados possam aguardar um ao outro. Quando o segundo entrar na seção crítica, ele verá o estado persistido pelo primeiro.

### Solução robusta para os efeitos

Criar uma tabela de execução idempotente dos efeitos, por exemplo:

```text
sale_effect_executions
- id
- organizacao_id
- venda_id
- efeito
- sujeito_id
- data_insercao

UNIQUE (organizacao_id, venda_id, efeito, sujeito_id)
```

Exemplos de chaves:

- `PURCHASE_METRICS`;
- `STOCK_DEDUCTION`;
- `BASE_CASHBACK`, com o cliente em `sujeito_id`;
- `CAMPAIGN`, com a campanha em `sujeito_id`;
- `CONVERSION_ATTRIBUTION`.

Antes de executar um efeito, o serviço tenta registrar a chave usando `ON CONFLICT DO NOTHING RETURNING id`. Se nenhum registro for retornado, o efeito já foi processado.

O claim e o efeito devem ocorrer na mesma transação. Se o efeito falhar, o claim também deve sofrer rollback.

### Observação sobre cashback

Uma constraint genérica em `(venda, cliente, tipo)` não é suficiente, pois uma mesma venda pode gerar cashback base e cashback de campanha. O identificador do efeito precisa distinguir essas origens.

---

## 3. Conclusão manual indevida de pedidos iFood

### Problema

O adapter aceita `ENTREGUE` e `PARCIALMENTE_ENTREGUE` como transições locais. O board também oferece a coluna `ENTREGUE` para cards do iFood.

Isso permite que o usuário conclua localmente um pedido que ainda não foi concluído pelo canal, podendo disparar antecipadamente:

- baixa de estoque;
- cashback;
- atualização das quantidades entregues;
- emissão fiscal quando a política for ativada.

O plano estabelece que a conclusão do iFood deve chegar pelo evento `CONCLUDED`.

### Ajustes sugeridos

1. No backend, rejeitar `ENTREGUE` e `PARCIALMENTE_ENTREGUE` como ações manuais para o canal iFood.
2. No frontend, retirar esses destinos de `getValidBoardTargets` quando `card.integracaoCanal === "IFOOD"`.
3. Não mostrar o diálogo “Receber e entregar” para cards do iFood.
4. Manter `CONCLUDED → ENTREGUE` exclusivamente no `sync-sales`.
5. Executar os efeitos de entrega somente quando a ingestão aplicar essa transição.

Exemplo de guarda no adapter:

```ts
if (toStatus === "ENTREGUE" || toStatus === "PARCIALMENTE_ENTREGUE") {
	throw new createHttpError.BadRequest(
		"A entrega deste pedido será confirmada automaticamente pelo iFood.",
	);
}
```

---

## 4. Confirmação e início de preparo estão colapsados

### Problema

Depois de confirmar um pedido, a implementação promove imediatamente o atendimento local para `EM_PREPARO`. Entretanto, o endpoint `startPreparation` não é chamado.

Como o card já aparece em `EM_PREPARO`, não existe uma transição posterior capaz de representar a ação “iniciar preparo”. O fluxo unificado, portanto, confirma o pedido, mas não inicia oficialmente o preparo no iFood.

### Mapeamento recomendado

| Status iFood | Estado local |
| --- | --- |
| `PLACED` | pendente de confirmação, fora do board |
| `CONFIRMED` | `NAO_INICIADO` |
| `PREPARATION_STARTED` / `SEPARATION_STARTED` | `EM_PREPARO` |
| `SEPARATION_ENDED` / `READY_TO_PICKUP` | `PRONTO` |
| `DISPATCHED` / `COLLECTED` | `EM_ENTREGA` |
| `CONCLUDED` | `ENTREGUE` |
| `CANCELLED` | `CANCELADO` |

### Ajustes sugeridos

1. Ao confirmar o pedido, alterar somente `statusVenda` para `CONFIRMADA` e manter `statusAtendimento` em `NAO_INICIADO`.
2. Mapear `CONFIRMED` para `NAO_INICIADO` no conector.
3. Fazer `NAO_INICIADO → EM_PREPARO` chamar `startIfoodOrderPreparation`.
4. Preferencialmente restringir o iFood a transições sequenciais, evitando saltos que exigiriam várias chamadas externas encadeadas.

Exemplo da promoção local após a confirmação:

```ts
await db
	.update(sales)
	.set({
		statusVenda: "CONFIRMADA",
		statusAtendimento: "NAO_INICIADO",
	})
	.where(eq(sales.id, sale.id));
```

---

## 5. Vendas válidas de valor zero repetem efeitos

### Problema

Atualmente, `previouslyValid` exige que a natureza seja `SN01` e que `valorTotal > 0`. Já `becameValid` considera apenas o sinal canônico `sale.isValidSale`.

Uma venda gratuita ou de valor zero pode ser considerada válida pelo conector. Nesse caso, `previouslyValid` continuará falso em todas as sincronizações, fazendo a venda “tornar-se válida” repetidamente.

Isso pode repetir:

- incremento das métricas do cliente;
- atribuição de conversão;
- campanhas de compra;
- tentativas de cashback e interações.

### Correção imediata

Remover a condição de valor:

```ts
const previouslyValid = existingSale
	? existingSale.natureza === "SN01"
	: false;
```

O valor da venda não deve determinar se ela já atravessou a transição de validade.

### Correção definitiva

Usar o claim `PURCHASE_METRICS`/`SALE_BECAME_VALID` descrito na seção de idempotência. Dessa forma, a execução única não depende de inferir o histórico a partir de `natureza`, `valorTotal` ou `statusVenda`.

---

## 6. Dispatch sem considerar o responsável pela entrega

### Problema

Toda transição para `EM_ENTREGA` chama `dispatchIfoodOrder`. Entretanto, essa ação só deve ser feita quando `delivery.deliveredBy === "MERCHANT"`.

Para pedidos entregues pela logística do iFood, o card deve avançar exclusivamente pelos eventos externos `DISPATCHED` e `COLLECTED`.

Atualmente, `deliveredBy` não chega ao card nem ao adapter.

### Solução recomendada

Adicionar essa informação ao modelo canônico:

```ts
type TCanonicalSale = {
	// ...
	fulfillment?: {
		deliveredBy: "MERCHANT" | "IFOOD" | string | null;
	};
};
```

Persistir o valor na venda, idealmente em um campo explícito como `entregaResponsavel`, e expô-lo no card.

Regras da interface e do backend:

- `MERCHANT`: permite a ação manual de despacho;
- `IFOOD`: não oferece `EM_ENTREGA` como transição manual;
- valor desconhecido: comportamento conservador, sem despacho manual.

### Alternativa de curto prazo

Consultar os detalhes atuais do pedido antes de chamar `dispatch` e rejeitar a ação quando `deliveredBy !== "MERCHANT"`. Essa alternativa protege o backend, mas não permite esconder antecipadamente a ação inválida na interface.

Também é recomendável limitar `readyToPickup` a pedidos cuja modalidade seja retirada.

---

## 7. Cancelamento de pedidos já confirmados

### Situação encontrada

O input de transição aceita `cancellationCode`, mas a esteira não oferece uma ação de cancelamento para cards já confirmados.

### Ajustes sugeridos

1. Adicionar “Cancelar pedido” às ações do card iFood enquanto o pedido estiver em um estado cancelável.
2. Abrir um dialog/drawer e carregar os motivos somente quando necessário.
3. Exigir a seleção de um `cancellationCode`.
4. Chamar `requestCancellation` sem alterar imediatamente o estado local.
5. Manter o card na coluna atual até a ingestão receber `CANCELLED`.
6. Disparar `runDataCollectingV2` em background após a solicitação para tentar antecipar a atualização.
7. Desabilitar novas solicitações enquanto o cancelamento estiver pendente, se essa informação puder ser persistida ou consultada.

---

## 8. Ordem de implementação recomendada

1. Adicionar unicidade de venda externa e serialização do import.
2. Implementar claims idempotentes para os efeitos.
3. Bloquear a conclusão manual de pedidos iFood.
4. Separar `CONFIRMED` de `PREPARATION_STARTED` e integrar `startPreparation`.
5. Aplicar `vendas.visualizar`/`vendas.editar` nas APIs e na interface.
6. Persistir `deliveredBy` e condicionar `dispatch`.
7. Implementar cancelamento dos cards confirmados.
8. Atualizar o documento de planejamento com o mapeamento final adotado.

---

## 9. Matriz mínima de testes

### Concorrência e idempotência

- Executar dois imports concorrentes contendo o mesmo evento `PLACED`: deve existir apenas uma venda.
- Executar dois imports concorrentes contendo o mesmo `CFM`: métricas, cashback, conversão e campanhas devem executar uma vez.
- Executar dois imports concorrentes contendo o mesmo `CON`: estoque deve ser baixado uma vez.
- Reprocessar sequencialmente os mesmos eventos: nenhuma métrica ou efeito deve mudar.

### Ciclo de atendimento

- `PLACED`: aparece somente na fila de confirmação.
- Confirmação aceita: passa a card `NAO_INICIADO`.
- `NAO_INICIADO → EM_PREPARO`: chama `startPreparation` antes da mudança local.
- Retirada em `EM_PREPARO → PRONTO`: chama `readyToPickup`.
- Entrega própria em `PRONTO → EM_ENTREGA`: chama `dispatch`.
- Entrega pelo iFood: não oferece despacho manual.
- Tentativa manual de `ENTREGUE`: rejeitada no backend.
- Evento `CONCLUDED`: move para `ENTREGUE` e baixa estoque uma vez.
- Cancelamento solicitado: card permanece no estado atual.
- Evento `CANCELLED`: move para `CANCELADO`.

### Permissões

- Sem `vendas.visualizar`: não acessa a fila nem o board.
- Com `vendas.visualizar`, sem `vendas.editar`: visualiza, mas não opera pedidos.
- Com `vendas.editar`: confirma, recusa, cancela e move pedidos.
- Sem `integracoes.gerenciar`: continua podendo operar vendas, mas não altera a configuração do iFood.

### Casos de regressão

- Venda válida com valor zero não repete métricas ou campanhas.
- Venda interna continua usando o fluxo local atual.
- Conectores sem granularidade de fulfillment continuam com o comportamento legado.
- Política `fulfillment: false` mantém vendas externas fora do board.
- Política `estoque: false` não realiza baixa na conclusão.
- Falha na baixa de estoque não desfaz a importação do evento externo.

---

## 10. Validação realizada durante o review

- O lint focado nos arquivos da Fase 3 terminou sem erros e com um aviso de estilo.
- O typecheck global do repositório não está verde por erros em outras áreas da tree.
- Não foram encontrados erros de TypeScript nos caminhos da Fase 3 ao filtrar a saída global.
- Nenhum arquivo de produto foi alterado durante o review; este documento é apenas a consolidação das recomendações.
