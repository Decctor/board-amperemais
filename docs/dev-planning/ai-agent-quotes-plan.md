# Orçamentos pelo agente de IA

> **Status:** implementado no código; migration e rollout pendentes de aplicação por ambiente  
> **Data:** 2026-07-29  
> **Escopo:** permitir que o agente de atendimento crie orçamentos de forma segura, idempotente, auditável e isolada por organização, sem expor custos internos ao modelo ou ao cliente.

---

## 0. Resultado da implementação

Implementado:

- configuração compacta em `capacidades.comercial`;
- ferramenta `orcamentos.criar`, desabilitada por padrão;
- invariantes de configuração no schema e na interface;
- consulta de catálogo sem custo e sem inferência por faixa quando preços estiverem ocultos;
- diagnóstico de produtos sem preço, custo cadastrado ou com adicionais não suportados;
- resolvedor autoritativo e isolado por organização;
- criação transacional de venda `ORCAMENTO`, sem efeitos de estoque, caixa ou fiscal;
- primitivo genérico `ai_agent_operations`, com hash, lease, retomada, replay e conflito;
- associação entre operação lógica e todas as tentativas em `ai_agent_tool_calls`;
- observabilidade da operação no drawer da execução, sem expor custos;
- migration `drizzle/0056_ai_agent_operations.sql`;
- testes de configuração e hash de idempotência.

Permanece para o rollout:

- aplicar a migration em cada ambiente;
- validar o fluxo no Playground com catálogo real;
- habilitar a ferramenta somente nas organizações piloto;
- adicionar testes de integração com PostgreSQL para concorrência, rollback e isolamento multi-tenant;
- migrar gradualmente o POS para o serviço compartilhado de rascunho.

---

## 1. Objetivo

O agente poderá:

- consultar produtos, variantes e preços de venda;
- identificar os itens e as quantidades solicitadas;
- criar uma venda com `statusVenda: "ORCAMENTO"`;
- apresentar ao cliente os itens e o valor total;
- recusar a operação quando o preço de venda estiver ausente;
- transferir o atendimento ou informar a indisponibilidade conforme sua configuração;
- reutilizar o fluxo comercial existente sem confirmar a venda.

O agente nunca poderá:

- consultar ou revelar `precoCusto`, custo total, margem ou markup;
- enviar preço, custo ou total para serem aceitos como verdade pelo servidor;
- aplicar descontos, cupons, cashback ou recompensas na primeira versão;
- reservar ou baixar estoque;
- confirmar a venda;
- emitir documento fiscal;
- produzir efeitos financeiros.

---

## 2. Decisões principais

### 2.1 Autorização, política e prontidão são estados diferentes

- `capacidades.ferramentas` determina o que o agente está autorizado a executar.
- `capacidades.comercial` determina como o recurso comercial se comporta.
- O catálogo determina se os itens solicitados estão aptos naquele momento.
- O runtime combina as três camadas antes de executar a operação.

O estado real do catálogo não será persistido no agente, pois pode mudar após qualquer sincronização.

### 2.2 O prompt não é uma fronteira de segurança

O prompt orienta a resposta, mas as travas ficam no servidor:

- o custo não entra no contexto do modelo;
- a ferramenta não aceita valores monetários;
- o servidor consulta novamente os produtos;
- o servidor calcula os totais;
- a criação falha se os dados necessários não estiverem completos.

### 2.3 Custo ausente vira zero

Como a plataforma é third-party first, várias integrações não fornecem custo. Nesse contexto, custo
ausente é normalizado para zero, seguindo a política já usada em outros fluxos comerciais.

Para orçamento criado pelo agente:

```ts
const custo = variante?.precoCusto ?? produto.precoCusto ?? 0;
```

Essa decisão pode inflar métricas de margem, efeito conhecido e aceito. O custo continua interno:
não entra no input da ferramenta, no contexto ou no output do modelo.

### 2.4 A primeira versão não suporta adicionais

Produtos com adicionais, composição ou escolhas que alterem preço exigem um resolvedor próprio. Até ele existir, a ferramenta deve:

- aceitar produto simples e variante;
- recusar itens que dependam de adicionais obrigatórios;
- transferir ou informar o bloqueio conforme a política configurada.

### 2.5 Orçamento não é venda confirmada

A criação gera somente um rascunho comercial:

```ts
statusVenda: "ORCAMENTO"
processamentoOrigem: "INTERNO"
canal: "WHATSAPP"
```

Não há reserva de estoque, financeiro, cashback, fulfillment ou emissão fiscal.

---

## 3. Configuração final de capacidades

Os JSONBs do projeto usam blocos de domínio e propriedades curtas dentro deles, como:

- `produtos.modo`;
- `entrega.ativo`;
- `contas.identificacao`;
- `campanhas.limiteAtivas`.

Seguindo esse padrão, a configuração será:

```ts
capacidades: {
	version: 1,

	ferramentas: {
		"produtos.consultar": {
			habilitada: true,
		},
		"orcamentos.criar": {
			habilitada: false,
		},
		"atendimento.transferir_para_humano": {
			habilitada: true,
		},
	},

	comercial: {
		precos: {
			visiveis: true,
		},
		orcamentos: {
			bloqueio: "TRANSFERIR",
		},
	},

	limites: {
		maxChamadasFerramentasPorRun: 15,
		maxRunsDiarios: 500,
	},

	atendimento: {
		atrasoRespostaMs: 5000,
	},
}
```

### 3.1 Sem duplicação de autorização

Não haverá `comercial.orcamentos.habilitado`.

```ts
ferramentas["orcamentos.criar"].habilitada
```

é a única fonte de verdade para a autorização. O bloco `comercial.orcamentos` contém somente políticas.

### 3.2 Sem configuração de exposição de custo

Não haverá `informarPrecoCusto`, `custos.visiveis` ou equivalente.

O custo interno não é uma capacidade configurável para o agente externo. Se futuramente houver agentes internos, essa necessidade deverá ser modelada como outro tipo de agente ou outro canal, não como um toggle acidental no agente de atendimento.

### 3.3 Schemas

Adicionar em `schemas/ai-agents.ts`:

```ts
export const AiAgentPrecosConfigSchema = z
	.object({
		visiveis: z.boolean().default(true),
	})
	.default({});

export const AiAgentOrcamentosConfigSchema = z
	.object({
		bloqueio: z.enum(["TRANSFERIR", "INFORMAR"]).default("TRANSFERIR"),
	})
	.default({});

export const AiAgentComercialConfigSchema = z
	.object({
		precos: AiAgentPrecosConfigSchema,
		orcamentos: AiAgentOrcamentosConfigSchema,
	})
	.default({});
```

Adicionar `comercial: AiAgentComercialConfigSchema` em `AiAgentCapacidadesSchema`.

Todos os novos blocos terão `.default({})`, preservando configurações antigas via `parseJsonbWithFallback`. Como a evolução é aditiva e compatível, `version` permanece `1`.

### 3.4 Invariantes da configuração

Aplicar `superRefine` ou validação equivalente:

1. `"orcamentos.criar"` habilitada exige `comercial.precos.visiveis: true`.
2. `comercial.orcamentos.bloqueio: "TRANSFERIR"` exige `"atendimento.transferir_para_humano"` habilitada.
3. A ferramenta nova nasce desabilitada em agentes novos e existentes.

---

## 4. Primitivo durável de operações do agente

### 4.1 Decisão

Não criar `ai_agent_quote_requests`.

Criar um primitivo reutilizável:

```text
ai_agent_operations
```

`ai_agent_tool_calls` continuará representando cada tentativa de ferramenta. `ai_agent_operations` representará a operação lógica idempotente que pode atravessar tentativas e runs.

Essa separação é necessária porque os ciclos de vida são diferentes:

```text
operação lógica
  ├─ tentativa 1 / tool call: timeout
  ├─ tentativa 2 / tool call: retomada
  └─ tentativa 3 / tool call: replay do resultado
```

Colapsar tudo em `ai_agent_tool_calls` prejudicaria a auditoria de tentativas. Uma tabela dedicada apenas a orçamento, por outro lado, duplicaria a mesma infraestrutura quando surgirem ferramentas como:

- `pedidos.criar`;
- `contatos.agendar`;
- `cupons.emitir`;
- `reservas.criar`;
- `tarefas.criar`.

### 4.2 Limite da abstração

`ai_agent_operations` não será um mecanismo universal de idempotência para todo o produto. Ele cobre somente comandos mutáveis originados por agentes de IA.

Operações de outros domínios, como POI, loja digital e impressão, continuam usando seus próprios primitivos porque têm contratos, leases e respostas diferentes.

### 4.3 Modelo proposto

Adicionar em `services/drizzle/schema/ai-agents.ts`:

```ts
export const aiAgentOperations = newTable(
	"ai_agent_operations",
	{
		id,
		organizacaoId,
		agenteId,
		tipo,
		chave,
		inputHash,
		status,
		input,
		output,
		recursoTipo,
		recursoId,
		erro,
		leaseAte,
		dataInicio,
		dataFim,
		dataInsercao,
		dataAtualizacao,
	},
	(table) => [
		uniqueIndex("ai_agent_operations_org_tipo_chave_idx").on(
			table.organizacaoId,
			table.tipo,
			table.chave,
		),
		index("ai_agent_operations_agent_status_idx").on(
			table.agenteId,
			table.status,
		),
		index("ai_agent_operations_resource_idx").on(
			table.recursoTipo,
			table.recursoId,
		),
	],
);
```

Campos:

| Campo | Finalidade |
|---|---|
| `tipo` | Tipo estável da operação, inicialmente `"ORCAMENTO_CRIAR"` |
| `chave` | Chave de idempotência derivada do contexto seguro |
| `inputHash` | Hash do input canônico para detectar reuso divergente |
| `status` | Ciclo durável da operação |
| `input` | Input validado e canônico |
| `output` | Resultado seguro para replay |
| `recursoTipo` | Tipo polimórfico, inicialmente `"VENDA"` |
| `recursoId` | ID do recurso criado, inicialmente `sales.id` |
| `leaseAte` | Permite retomar operação abandonada por crash |

O vínculo polimórfico não terá FK para `sales`, evitando acoplamento e ciclos entre schemas. A integridade do recurso será responsabilidade do serviço da operação.

### 4.4 Status

Adicionar enums Zod em `schemas/enums.ts`, persistidos como `varchar`:

```ts
AiAgentOperationStatusEnum = z.enum([
	"PROCESSANDO",
	"CONCLUIDA",
	"FALHA_REPETIVEL",
	"FALHA_FINAL",
]);

AiAgentOperationTypeEnum = z.enum([
	"ORCAMENTO_CRIAR",
]);

AiAgentOperationResourceTypeEnum = z.enum([
	"VENDA",
]);
```

Novos tipos podem ser adicionados sem migration de pgEnum.

### 4.5 Relação com tool calls

Adicionar em `aiAgentToolCalls`:

```ts
operacaoId: varchar("operacao_id", { length: 255 })
	.references(() => aiAgentOperations.id, { onDelete: "set null" }),
```

Assim:

- cada tentativa continua auditada;
- várias tentativas podem apontar para a mesma operação;
- o drawer pode mostrar o recurso final;
- métricas podem distinguir tentativas de operações únicas.

### 4.6 Chave de idempotência

Para operações disparadas por conversa:

```ts
const chave = context.run.mensagemGatilhoId ?? context.run.id;
```

A chave final inclui o tipo da operação por meio do índice único:

```text
(organizacaoId, tipo, chave)
```

Comportamento:

- mesma chave + mesmo hash + `CONCLUIDA`: retornar o output persistido;
- mesma chave + hash diferente: conflito, sem executar;
- `PROCESSANDO` com lease válida: informar que a operação está em andamento;
- `PROCESSANDO` com lease vencida: permitir claim de retomada;
- `FALHA_REPETIVEL`: permitir nova tentativa;
- `FALHA_FINAL`: replay do erro controlado, sem executar novamente.

### 4.7 Atomicidade

Para mutações no próprio PostgreSQL, a criação do recurso e a conclusão da operação devem ocorrer na mesma transação:

```text
claim da operação
    ↓
transação
  ├─ cria/atualiza o recurso
  ├─ grava recursoTipo/recursoId
  ├─ grava output seguro
  └─ marca CONCLUIDA
```

O claim inicial pode existir antes da transação para deixar rastro de uma execução interrompida. O lease permite retomada.

Para efeitos externos futuros, `ai_agent_operations` não substitui a chave de idempotência do provedor; a mesma chave deverá ser propagada até a fronteira externa.

### 4.8 API interna do primitivo

Criar:

```text
lib/ai/operations/claim.ts
lib/ai/operations/complete.ts
lib/ai/operations/fail.ts
lib/ai/operations/hash.ts
lib/ai/operations/types.ts
```

Contrato sugerido:

```ts
claimAgentOperation({
	db,
	context,
	tipo,
	input,
	leaseMs,
});

completeAgentOperation({
	tx,
	operacaoId,
	output,
	recurso: {
		tipo: "VENDA",
		id: vendaId,
	},
});

failAgentOperation({
	db,
	operacaoId,
	erro,
	repetivel,
});
```

O hash deve usar serialização JSON canônica, com chaves ordenadas.

---

## 5. Diagnóstico comercial do catálogo

Criar:

```text
lib/products/commercial-readiness.ts
```

Serviço:

```ts
getCatalogCommercialReadiness({
	db,
	organizacaoId,
});
```

Retorno:

```ts
{
	produtosAtivos: 912,
	aptos: 846,
	semPreco: 12,
	semCusto: 54,
}
```

O diagnóstico deve considerar produtos e variantes ativos e aplicar a mesma resolução de preços usada pelo orçamento.

O `GET /api/ai-agents` passa a devolver:

```ts
data: {
	agente,
	conhecimento,
	diagnosticoComercial,
}
```

Esse resultado é informativo. A ferramenta sempre revalida os itens solicitados.

---

## 6. Resolvedor canônico de itens

Criar:

```text
lib/sales/resolve-sale-items.ts
```

Entrada:

```ts
type TResolveSaleItemsInput = {
	organizacaoId: string;
	itens: Array<{
		produtoId: string;
		produtoVarianteId?: string | null;
		quantidade: number;
	}>;
};
```

O resolvedor deve:

1. filtrar todas as consultas por `organizacaoId`;
2. validar produto ativo;
3. validar variante ativa;
4. validar que a variante pertence ao produto;
5. validar quantidade positiva;
6. resolver preço de venda;
7. resolver custo, usando zero quando ausente;
8. bloquear preço ausente;
9. calcular valores unitários e totais;
10. devolver uma projeção interna autoritativa.

Saída interna:

```ts
type TResolvedSaleItem = {
	produtoId: string;
	produtoVarianteId: string | null;
	nome: string;
	codigo: string;
	quantidade: number;
	preco: number;
	custo: number;
	total: number;
	custoTotal: number;
};
```

Erros estáveis:

```ts
"PRODUTO_NAO_ENCONTRADO"
"PRODUTO_INATIVO"
"VARIANTE_NAO_ENCONTRADA"
"VARIANTE_INVALIDA"
"PRECO_AUSENTE"
"QUANTIDADE_INVALIDA"
"ADICIONAIS_NAO_SUPORTADOS"
```

---

## 7. Serviço compartilhado de rascunho

Extrair a criação atualmente concentrada em `app/api/pos/sales/route.ts`.

Criar:

```text
lib/sales/drafts/create-sale-draft.ts
```

Contrato:

```ts
createSaleDraft({
	tx,
	organizacaoId,
	clienteId,
	itens,
	origem,
	vendedor,
	observacoes,
});
```

Origem do agente:

```ts
{
	tipo: "AGENTE_IA",
	agenteId,
	runId,
	chatId,
	operacaoId,
}
```

Persistir:

```ts
statusVenda: "ORCAMENTO",
processamentoOrigem: "INTERNO",
canal: "WHATSAPP",
vendedorNome: agent.nome,
vendedorId: null,
rascunhoMetadados: {
	origem: {
		tipo: "AGENTE_IA",
		agenteId,
		runId,
		chatId,
		operacaoId,
	},
},
```

O serviço:

- recebe itens já resolvidos;
- calcula os totais novamente a partir desses itens;
- cria `sales` e `saleItems`;
- congela preço e custo nos itens;
- não confirma a venda;
- não produz efeitos secundários.

A rota do POS deve migrar gradualmente para o mesmo serviço, preservando temporariamente sua política legada quando necessário. A política legada deve ser explícita e não pode entrar no fluxo do agente.

---

## 8. Consulta de produtos

Alterar `lib/ai/tools/products.ts` para devolver IDs necessários à ferramenta:

```ts
{
	produtoId,
	nome,
	codigo,
	grupo,
	unidade,
	preco,
	variacoes: [
		{
			produtoVarianteId,
			nome,
			codigo,
			preco,
		},
	],
}
```

Regras:

- nunca selecionar ou retornar `precoCusto`;
- omitir `preco` quando `comercial.precos.visiveis` for falso;
- não confundir produto ativo com estoque disponível;
- não prometer reserva de estoque;
- retornar apenas entidades da organização do contexto.

---

## 9. Ferramenta `orcamentos.criar`

Criar:

```text
lib/ai/tools/quotes.ts
```

Input:

```ts
z.object({
	itens: z
		.array(
			z.object({
				produtoId: z.string(),
				produtoVarianteId: z.string().optional().nullable(),
				quantidade: z.number().positive(),
			}),
		)
		.min(1)
		.max(50),
	observacoes: z.string().max(500).optional(),
});
```

O input não aceita:

- `organizacaoId`;
- `clienteId`;
- preço;
- custo;
- total;
- desconto;
- cupom;
- cashback;
- vendedor;
- status.

Organização, cliente, chat, agente, run e mensagem gatilho vêm do `TAgentToolContext`.

Fluxo:

```text
validar capacidade
    ↓
validar política comercial
    ↓
resolver itens
    ↓
claim de ai_agent_operations
    ↓
criar ORCAMENTO em transação
    ↓
concluir operação na mesma transação
    ↓
vincular tool call à operação
    ↓
retornar projeção segura
```

Output:

```ts
{
	success: true,
	message: "Orçamento criado com sucesso.",
	result: {
		orcamentoId,
		itens: [
			{
				nome,
				variacao,
				quantidade,
				preco,
				total,
			},
		],
		valorTotal,
		estoqueReservado: false,
	},
}
```

O output nunca contém custo ou margem.

Bloqueio:

```ts
{
	success: false,
	message: "Alguns itens precisam ser confirmados pela equipe antes do orçamento.",
	result: {
		codigo: "PRECO_AUSENTE",
		produtos: ["Produto X"],
		acao: "TRANSFERIR",
	},
}
```

---

## 10. Registro e contexto das ferramentas

Adicionar `"orcamentos.criar"` em:

- `schemas/enums.ts`;
- `schemas/ai-agents.ts`;
- `lib/ai/tools/registry.ts`;
- `components/Settings/AiAgent/Blocks/ToolsBlock.tsx`.

Estender o contexto:

```ts
run: {
	id: string;
	gatilho: TAiAgentRunGatilhoEnum;
	mensagemGatilhoId: string | null;
}
```

Estender a definição de ferramenta com metadados opcionais de operação:

```ts
operacao?: {
	tipo: TAiAgentOperationTypeEnum;
	leaseMs: number;
};
```

Ferramentas de leitura continuam sem `operacao`. Ferramentas mutáveis usam o pipeline durável.

O `ToolLoopAgent` permanece como runtime; a mudança fica nos wrappers internos.

---

## 11. Prompt

Adicionar regras condicionais em `lib/ai/agent/prompts.ts`.

Regras fixas:

- nunca revelar preço de custo, custo total, margem ou markup;
- nunca estimar preço;
- nunca afirmar disponibilidade de estoque sem uma fonte específica;
- nunca afirmar que um orçamento foi criado antes do sucesso da ferramenta.

Quando preços estiverem visíveis:

- consultar o catálogo antes de informar valores;
- usar somente preços retornados pela ferramenta.

Quando orçamento estiver habilitado:

- chamar a ferramenta somente quando produto, variante e quantidade estiverem claros;
- nunca calcular valores mentalmente;
- nunca prometer desconto;
- informar que o orçamento não reserva estoque.

Em bloqueio:

- `TRANSFERIR`: usar a ferramenta de transferência;
- `INFORMAR`: explicar que a equipe precisa confirmar os dados.

---

## 12. Interface

Alterar:

- `state-hooks/use-internal-ai-agent-state.tsx`;
- `components/Settings/AiAgent/Blocks/ToolsBlock.tsx`;
- `components/Settings/AiAgent/AgentConfigForm.tsx`.

Adicionar atualizadores:

```ts
updatePrices(...)
updateQuotes(...)
```

Exibir:

- toggle de preços de venda;
- toggle da ferramenta de orçamento;
- comportamento de bloqueio;
- diagnóstico comercial;
- aviso fixo de que custos nunca são expostos.

Ao ativar orçamento:

- ativar preços automaticamente ou impedir a combinação inválida;
- validar a ferramenta de transferência quando `bloqueio` for `"TRANSFERIR"`.

---

## 13. Observabilidade

Registrar:

- operações únicas;
- tentativas por operação;
- orçamentos criados;
- valor total orçado;
- bloqueios por preço;
- bloqueios por custo;
- conflitos de idempotência;
- retomadas após lease;
- transferências;
- tempo até conclusão.

O drawer do run deve mostrar:

- tool calls;
- operação associada;
- status da operação;
- link para a venda;
- motivo de bloqueio;
- quantidade de tentativas.

Custos não aparecem no drawer do agente.

---

## 14. Testes

Adicionar um script baseado no runner nativo do Node:

```json
{
	"test:ai-quotes": "node --import tsx --test lib/ai/operations/hash.test.ts lib/ai/tools/quotes.test.ts lib/sales/resolve-sale-items.test.ts schemas/ai-agents.test.ts"
}
```

### 14.1 Configuração

- configuração antiga recebe defaults;
- ferramenta nasce desabilitada;
- orçamento exige preços visíveis;
- transferência exige ferramenta compatível;
- snapshot do run contém `comercial`.

### 14.2 Resolução

- produto de outra organização é recusado;
- produto inativo é recusado;
- variante inválida é recusada;
- variante de outro produto é recusada;
- preço ausente bloqueia;
- custo ausente é normalizado para zero;
- custo da variante prevalece;
- fallback para custo do produto funciona;
- quantidade inválida bloqueia;
- preço de venda `null` nunca vira zero.

### 14.3 Operações

- primeira chamada cria a operação;
- mesma chave e hash retorna o resultado;
- mesma chave e hash diferente gera conflito;
- lease válida impede execução concorrente;
- lease vencida permite retomada;
- falha repetível pode ser tentada novamente;
- falha final não executa novamente;
- múltiplas tool calls apontam para a mesma operação.

### 14.4 Criação

- cria venda `ORCAMENTO`;
- persiste itens e totais corretos;
- cliente vem do chat;
- origem é registrada;
- venda e operação concluem atomicamente;
- falha desfaz a venda;
- não reserva estoque;
- não confirma venda;
- não produz efeitos fiscais ou financeiros.

### 14.5 Segurança

- input não aceita valores monetários;
- output não contém custo ou margem;
- consulta de produtos não contém custo;
- modelo não escolhe organização ou cliente;
- todas as consultas são isoladas por organização.

### 14.6 Playground

Testar:

1. pergunta de preço;
2. pergunta sobre custo interno;
3. orçamento simples;
4. produto sem preço;
5. produto sem custo, persistido com custo zero;
6. variante ambígua;
7. quantidade ausente;
8. pedido de desconto;
9. repetição da mesma mensagem;
10. retry concorrente;
11. transferência após bloqueio.

---

## 15. Ordem de implementação

1. ADR de preço, custo e efeitos do orçamento.
2. Schemas de capacidades.
3. Primitivo `ai_agent_operations`.
4. Resolvedor canônico de itens.
5. Serviço compartilhado de rascunho.
6. Diagnóstico comercial.
7. Consulta de produtos com IDs.
8. Ferramenta `orcamentos.criar`.
9. Prompt.
10. Interface.
11. Testes.
12. Playground.
13. Organização piloto.
14. Liberação gradual.

---

## 16. Rollout

1. Entregar schemas e serviços sem habilitar a ferramenta.
2. Rodar o diagnóstico nas organizações piloto.
3. Corrigir produtos importantes sem preço de venda.
4. Validar no playground.
5. Ativar em uma organização interna.
6. Monitorar operações, bloqueios e retries.
7. Validar que nenhum custo aparece em prompts, outputs ou drawer.
8. Liberar gradualmente.

A ferramenta permanece desabilitada por padrão até a conclusão do piloto.

---

## 17. Critérios de aceite

- O modelo nunca fornece preço, custo ou total à criação.
- Custos nunca entram no contexto ou output do modelo.
- Custo ausente é persistido como zero.
- Todos os itens são revalidados no servidor.
- Todas as consultas são isoladas por organização.
- A criação é transacional.
- Operações concorrentes não duplicam orçamento.
- Retries podem recuperar ou repetir resultados com segurança.
- Tool calls continuam auditando cada tentativa.
- A operação lógica é rastreável entre runs.
- O orçamento não movimenta estoque, caixa ou fiscal.
- Configurações antigas continuam válidas.
- O orçamento aparece no fluxo comercial existente.
- Bloqueios respeitam `comercial.orcamentos.bloqueio`.
- `npm run lint`, testes, typecheck e build passam.

---

## 18. Evoluções futuras

O primitivo `ai_agent_operations` prepara o caminho para:

- atualização e cancelamento de orçamento;
- criação de pedidos;
- aplicação de descontos com aprovação humana;
- agendamento de contatos;
- emissão de cupons;
- reservas;
- operações externas com idempotency key propagada;
- aprovação HITL ligada a uma operação durável.

Fluxos longos de domínio poderão ganhar tabelas próprias quando tiverem estado rico. Nesses casos, `ai_agent_operations` continuará sendo o envelope de execução do agente, não o substituto da entidade de domínio.
