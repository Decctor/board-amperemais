# Agente de IA — disponibilidade de estoque

> **Documento temporário de especificação.** Deve ser excluído quando a implementação estiver
> concluída e revisada.

Espelha, para quantidade/estoque, os guards que já existem para preço. Referência do padrão:
`lib/ai/tools/product-query-policy.ts` + `lib/ai/tools/products.ts` + `lib/ai/agent/prompts.ts`.

---

## 1. Estado atual — não existe nenhum guard de quantidade

| # | Constatação | Local |
| --- | --- | --- |
| 1 | A quantidade nunca sai do banco. O `columns` seleciona `precoVenda`, mas não `quantidade` nem `rastreamentoEstoqueAtivo`. O payload que chega ao modelo não tem campo de disponibilidade. | `lib/ai/tools/products.ts:140` e `:144` |
| 2 | `apenasAtivos` filtra `products.ativo` — flag de publicação, não de saldo. O agente não distingue "temos" de "existe no catálogo". | `lib/ai/tools/products.ts:220` |
| 3 | A única menção a estoque é uma frase solta: *"Produto ativo não significa estoque disponível ou reservado."* Não é acionável, e está **dentro do branch de preços visíveis** — organização que esconde preços perde até esse aviso. | `lib/ai/agent/prompts.ts:64` |
| 4 | `resolveSaleItems` tem `PRECO_AUSENTE`, mas nada de estoque. `QUANTIDADE_INVALIDA` cobre apenas `quantidade <= 0`. Orçamento de 500 unidades de um item com 3 em estoque passa limpo. | `lib/sales/resolve-sale-items.ts:7-14` |
| 5 | `capacidades.comercial` só tem `precos` e `orcamentos`. Nada de estoque para configurar. | `schemas/ai-agents.ts:80-86` |
| 6 | O `[CATALOGO_INTERNO]` carrega `produtoId`/`nome`/`preco`. Nada de disponibilidade. | `lib/ai/agent/run-memory.ts:6` |

**A regra de disponibilidade já existe pronta no codebase** (`lib/shop/catalog.ts:12-24`):

```ts
!product.rastreamentoEstoqueAtivo || (product.quantidade ?? 0) > 0
```

Ou seja: **rastreamento desligado ≠ esgotado — é "sem informação"**. Esse é o eixo do desenho
inteiro: `quantidade: null` jogado no payload é literalmente o mesmo bug do `precoMax: 0` que fez o
agente afirmar que a empresa não vendia chuveiros. Um LLM lê `null`/`0` como zero, nunca como
desconhecido.

---

## 2. O padrão dos preços, destilado

| # | Camada | Onde |
| --- | --- | --- |
| 1 | Permissão declarativa + coerência entre capacidades | `comercial.precos.visiveis`; `superRefine` em `schemas/ai-agents.ts:123`; a UI desliga orçamento junto em `state-hooks/use-internal-ai-agent-state.tsx:83` |
| 2 | Prompt condicional, um mundo por vez — duas frases mutuamente exclusivas, nunca "se os preços estiverem visíveis…" | `lib/ai/agent/prompts.ts:63-65` |
| 3 | **Campo omitido, não nulo**: `...(pricesVisible ? { preco } : {})`. Sem campo não há o que alucinar. | `lib/ai/tools/products.ts:57` |
| 4 | Guard de execução + resposta autocorretiva: `PRECOS_NAO_VISIVEIS`; `normalizeProductQueryInput` descarta faixa inventada com telemetria; `FILTRO_PRECO_EXCLUIU_TUDO` reconsulta o escopo sem o filtro e devolve a faixa real | `lib/ai/tools/products.ts:211`, `:281-306`; `product-query-policy.ts:63` |
| 5 | Diagnóstico antes de ligar a chave (`semPreco`, `aptos`) | `lib/products/commercial-readiness.ts:53-64` |

---

## 3. Nomenclatura — conformidade com o padrão do app

Evidência levantada em `services/drizzle/schema/enums.ts`:

- Valores: SCREAMING_SNAKE, português, **1–2 termos** na esmagadora maioria (`ATIVO`, `ESGOTADO`,
  `MANUAL`, `EM_PREPARO`, `DESCONTO_FIXO`, `ESTOQUE_PROPRIO`, `VENDA_TOTAL`). 3+ termos aparecem só
  nos códigos fiscais, que são impostos pela SEFAZ.
- **Conectivos (`DO`/`DA`/`DE`) são inexistentes.** Única exceção no arquivo: `PRONTO_PARA_ENVIO`.
  `ENTREGA_DOMICILIO` e `CARTA_CORRECAO` mostram a regra — o conectivo cai.
- Chaves de política em `capacidades` são **substantivos únicos**: `visiveis`, `bloqueio`,
  `habilitada`. CamelCase longo só em `limites` (`maxRunsDiarios`, `atrasoRespostaMs`).
- Prefixo `NAO_` para o estado "não se aplica" tem precedente sólido: `NAO_INICIADO`,
  `NAO_CONTRIBUINTE`, `NAO_REALIZADA`, `NAO_SE_APLICA`.

**Descartado:** `pedidoAcimaDoSaldo` (4 termos + conectivo `DO`), `apenasDisponiveis`,
`ESTOQUE_INDISPONIVEL_PARA_QUANTIDADE`.

---

## 4. Config proposta — `capacidades.comercial.estoque`

```ts
export const AiAgentEstoqueConfigSchema = z
	.object({
		visibilidade: z.enum(["OCULTO", "DISPONIBILIDADE", "SALDO"]).default("OCULTO"),
		excedente: z.enum(["BLOQUEAR", "AVISAR", "PERMITIR"]).default("AVISAR"),
	})
	.default({});
export type TAiAgentEstoqueConfig = z.infer<typeof AiAgentEstoqueConfigSchema>;
```

Entra em `AiAgentComercialConfigSchema` ao lado de `precos` e `orcamentos`.

### `visibilidade` — o que o agente pode dizer

| Valor | Significado |
| --- | --- |
| `OCULTO` | Nenhum campo de estoque no payload. Comportamento atual, preservado byte por byte. |
| `DISPONIBILIDADE` | Só o estado binário ("temos" / "está em falta"). Não expõe número. |
| `SALDO` | Estado + quantidade exata. |

Três níveis (contra o booleano dos preços) porque o espaço de decisão é maior: muita empresa aceita
dizer "está em falta" mas não quer expor "temos 3" — revela porte de estoque e desatualiza muito mais
rápido que preço.

`SALDO` e não `QUANTIDADE` porque **saldo é a palavra que o módulo de estoque já usa** para o número
(`saldoAnterior`, `saldoPosterior`, "Saldo insuficiente para movimentação" em
`lib/stock/apply-stock-movement.ts`), e é 1 termo curto.

### `excedente` — o que fazer quando o pedido passa do saldo

| Valor | Efeito |
| --- | --- |
| `BLOQUEAR` | O orçamento falha com `ESTOQUE_INSUFICIENTE` e cai na política de `orcamentos.bloqueio`. |
| `AVISAR` | O orçamento é criado, e o resultado da ferramenta carrega o aviso para o agente comunicar. |
| `PERMITIR` | Nenhuma checagem (comportamento atual). |

Substantivo único, sem conectivo, no molde de `orcamentos.bloqueio`. Verbos no infinitivo espelham
`TRANSFERIR`/`INFORMAR` que já existem ali.

Os dois eixos são **ortogonais de propósito**: dá para não contar o número ao cliente e ainda assim
barrar o orçamento de 500 unidades.

### Coerência (`superRefine`)

- `excedente: "AVISAR"` com `visibilidade: "OCULTO"` → issue. Avisar sem poder dizer nada concreto
  produz resposta vaga; ou o agente pode explicar, ou bloqueia, ou permite. **(decisão aberta — ver §9)**
- `excedente: "BLOQUEAR"` **não** precisa de regra nova: reaproveita `orcamentos.bloqueio`, que já
  exige handoff habilitado quando vale `TRANSFERIR`.

---

## 5. Semântica — três estados, nunca um número cru

Novo arquivo `lib/ai/tools/product-availability.ts`, espelhando `product-query-policy.ts` e
reusando o predicado do shop.

```ts
export type TProductAvailabilityStatus = "DISPONIVEL" | "ESGOTADO" | "NAO_RASTREADO";
```

`NAO_RASTREADO` é o estado que impede o erro classe-`precoMax: 0`. **Nunca** deixar `quantidade: null`
chegar ao modelo.

Casos que resolvem para `NAO_RASTREADO`:

1. `rastreamentoEstoqueAtivo` falso ou nulo (regra do shop).
2. **`baixaEstoqueModo === "COMPOSICAO"`** (pratos/ficha técnica). A `quantidade` própria desses
   produtos não significa nada — a disponibilidade depende de explodir a receita, o que está fiado
   na Fase 2 de tabs (`services/drizzle/schema/products.ts:41-43`). Reportar `ESGOTADO` neles seria
   mentir.

Variação tem rastreamento próprio (`productVariants.rastreamentoEstoqueAtivo`): resolve por variação
quando há variação, e por produto quando não há — mesma hierarquia de `applyStockMovement`.

---

## 6. Payload da ferramenta — campo omitido, igual ao `preco`

Em `formatProducts` (`lib/ai/tools/products.ts:50`):

```ts
...(stockVisibility !== "OCULTO" ? { disponibilidade } : {}),
...(stockVisibility === "SALDO" ? { saldo } : {}),
```

Aplicado a produto **e** a cada variação. Custo de query: adicionar `quantidade`,
`rastreamentoEstoqueAtivo` e `baixaEstoqueModo` ao `columns` de `fetchRankedProducts` — colunas já
presentes na linha, zero join novo.

A descrição da ferramenta ganha uma seção "Lendo a disponibilidade" explicando os três estados, no
mesmo tom das seções que já existem.

---

## 7. Filtro de input — **nenhum na v1**

A lição dos preços (56 de 57 chamadas com faixa inventada, ver comentário em
`product-query-policy.ts:1-13`) diz que todo filtro opcional é preenchido por reflexo. Um
`disponibilidade: { apenas: true }` viraria `true` em toda chamada e esconderia o catálogo — o mesmo
desastre com outra roupa.

O agente vê `disponibilidade` item por item na resposta e decide o que falar. Zero superfície nova de
reflexo.

**Se depois o filtro se mostrar necessário**, ele copia o contrato inteiro, sem atalho:

1. Objeto aninhado declarativo com `origem: z.literal("PEDIDA_PELO_CLIENTE")`.
2. `hasExplicitStockRequest(message)` — padrões "tem em estoque", "pronta entrega", "tem
   disponível", "quantos tem", "tem N unidades".
3. Flag `disponibilidadeIgnorada` no output + `console.warn` de telemetria.
4. **Obrigatório**: branch autocorretivo `FILTRO_ESTOQUE_EXCLUIU_TUDO`, que reconsulta o escopo sem
   o filtro e devolve `totalForaDoFiltro`. Sem ele, o vazio volta a ser lido como "não vendemos".

---

## 8. Guard do orçamento

`resolveSaleItems` é compartilhada com POS e caminho humano, então a checagem entra **atrás de um
parâmetro opt-in**, com o precedente exato de `validateSufficientStock` em
`lib/stock/apply-stock-movement.ts:29`:

```ts
resolveSaleItems({ db, organizacaoId, itens, validateAvailableStock: false })
```

- Novo código em `TSaleItemResolutionErrorCode`: `"ESTOQUE_INSUFICIENTE"`.
- `SaleItemResolutionError` hoje carrega só `produtos: string[]`. Para a mensagem ser útil o agente
  precisa do saldo — mas só pode dizê-lo se `visibilidade` permitir. Solução: o erro carrega o dado,
  e **a formatação da mensagem acontece na fronteira da ferramenta**, não em `resolveSaleItems`.
  Sob `OCULTO` a mensagem fica genérica ("a equipe precisa confirmar a quantidade").
- O resto já está de graça: `SaleItemResolutionError` → `blockedOutput`
  (`lib/ai/tools/quotes.ts:32`) já devolve `codigo` + `acao: comercial.orcamentos.bloqueio`. **Zero
  encanamento novo no caminho de bloqueio.**
- `excedente: "AVISAR"` não usa esse caminho: o orçamento é criado e o aviso vai no `message` do
  output de sucesso.

---

## 9. Prompt — regras condicionais, uma por mundo

Substitui a frase solta de `prompts.ts:64` por um branch em `visibilidade`. **O aviso de estoque
passa a ser emitido independentemente de `precos.visiveis`** — hoje ele desaparece junto com os
preços, que é um bug do branch atual.

- **`OCULTO`** — "Você não tem informação de estoque. Nunca afirme que um item está disponível,
  reservado ou em falta, e nunca prometa prazo. Se o cliente perguntar sobre disponibilidade, diga
  que a equipe confirma."
- **`DISPONIBILIDADE`** — "O catálogo traz `disponibilidade` por item. `DISPONIVEL` e `ESGOTADO`
  valem; `NAO_RASTREADO` significa que a empresa não controla saldo desse item — nesse caso não
  afirme nem negue. Nunca informe a quantidade exata."
- **`SALDO`** — o acima, mais: "pode informar o `saldo`, sempre como saldo do momento, nunca como
  reserva."

Mais uma regra condicional a `excedente` quando vale `BLOQUEAR`, junto às regras de orçamento que já
existem em `prompts.ts:77-86`.

---

## 10. Memória do run

**Não carregar disponibilidade no `[CATALOGO_INTERNO]`.** Saldo muda entre turnos; preço praticamente
não. Carregar convidaria o agente a citar saldo velho.

Em vez disso, uma linha no bloco de formato da resposta (`prompts.ts:135-138`): o `[CATALOGO_INTERNO]`
não tem informação de disponibilidade, e falar de estoque exige consultar de novo.

---

## 11. Diagnóstico no config

Estender `getCatalogCommercialReadiness` (`lib/products/commercial-readiness.ts`) com
`semRastreamento` e `saldoZerado`, no molde de `semPreco`.

Objetivo: o dono da conta ver que 480 de 520 itens não controlam saldo **antes** de ligar
`DISPONIBILIDADE` e receber só `NAO_RASTREADO` como ruído. `ToolsBlock` já recebe
`diagnosticoComercial` como prop.

---

## 12. Ordem de implementação

1. **Config + semântica + payload** (§4, §5, §6) — dá visibilidade sem introduzir risco novo.
2. **Prompt** (§9) — inclui a correção do aviso que hoje some com os preços.
3. **Guard do orçamento** (§8).
4. **Diagnóstico** (§11) + UI em `ToolsBlock`/`use-internal-ai-agent-state`.
5. **Filtro de input** (§7) — só se a operação provar necessidade.

### Arquivos tocados

| Arquivo | Mudança |
| --- | --- |
| `schemas/ai-agents.ts` | `AiAgentEstoqueConfigSchema` + entrada em `comercial` + `superRefine` |
| `lib/ai/tools/product-availability.ts` | **novo** — resolução dos três estados |
| `lib/ai/tools/products.ts` | `columns`, `formatProducts`, seção da description |
| `lib/ai/agent/prompts.ts` | branch de `visibilidade`; aviso fora do branch de preços; nota do `[CATALOGO_INTERNO]` |
| `lib/sales/resolve-sale-items.ts` | `validateAvailableStock` + `ESTOQUE_INSUFICIENTE` |
| `lib/ai/tools/quotes.ts` | passa a flag; formata a mensagem conforme `visibilidade` |
| `lib/products/commercial-readiness.ts` | `semRastreamento`, `saldoZerado` |
| `components/Settings/AiAgent/Blocks/ToolsBlock.tsx` | controles novos |
| `state-hooks/use-internal-ai-agent-state.tsx` | `updateStock` |
| `lib/ai/tools/product-availability.test.ts` | **novo** — cobre `NAO_RASTREADO`, `COMPOSICAO`, hierarquia variação/produto |

Sem migração de banco: `capacidades` é JSONB e todo campo tem `.default()`
(`parseJsonbWithFallback`).

---

## 13. Decisões fechadas

1. **Default de `visibilidade`**: `OCULTO`. Preserva o comportamento anterior byte por byte.
2. **`AVISAR` + `OCULTO`**: proibido no `superRefine`.
3. **Terceiro nível de visibilidade**: `QUANTIDADE` (e não `SALDO`).
4. **Estado desconhecido**: `NAO_RASTREADO` (e não `INDEFINIDO`).
5. **Achado colateral entra nesta correção**: `preco` passa a ser omitido quando nulo.

**Consequência de 1 + 2 que mudou o desenho:** com `OCULTO` default e `AVISAR` proibido nesse modo, o
default de `excedente` **não pode** ser `AVISAR` — passou a ser `PERMITIR`. Um default inválido
derrubaria `parseJsonbWithFallback`, cujo fallback é justamente `schema.parse(undefined)`. Coberto
pelo teste "os defaults de estoque são válidos por si".

---

## 14. Desvios do plano durante a implementação

1. **A resolução dos três estados foi para `lib/products/availability.ts`**, não para
   `lib/ai/tools/product-availability.ts` como o §5 previa. Motivo: o guard do orçamento
   (`lib/sales/resolve-sale-items.ts`) também precisa dela, e `lib/sales` não deve depender de
   `lib/ai`. O arquivo do lado do agente ficou só com a camada de política
   (`formatAvailabilityForClient`), espelhando o papel de `product-query-policy.ts`.
2. **`findStockShortages` foi adicionada** para o caminho `AVISAR`, que precisa das faltas sem
   derrubar a operação. Custa uma consulta a mais sobre itens já lidos — deliberado, para não trocar
   o retorno de `resolveSaleItems` (lista simples) por um objeto e mexer em POS e caminho humano.
3. **`collectStockShortages` é exportada** para teste direto da agregação por item somado, no mesmo
   espírito de `resolveSaleItemCost`.
4. **Diagnóstico ganhou `esgotados`** além de `semRastreamento` — sem ele não se distingue "catálogo
   sem controle" de "catálogo zerado".

---

## 15. Verificação

- `npm run test:ai-quotes`: **46/46**. Os arquivos novos foram adicionados ao script.
- `npx tsc --noEmit`: zero erros nos arquivos tocados (o repo tem 100 erros pré-existentes em outras
  áreas — community admin, páginas externas).
- `oxlint` nas áreas tocadas: zero erros.
- `/dashboard/settings` compila e serve 200; `/api/ai-agents` responde 401 no guard de sessão.
- **Colunas conferidas no banco real** (leitura): `ampmais_products.quantidade`,
  `.rastreamento_estoque_ativo`, `.baixa_estoque_modo`, `ampmais_product_variants.quantidade`,
  `.rastreamento_estoque_ativo` — todas existem, sem drift.
- **Não verificado na tela**: a navegação do painel de browser para localhost foi recusada neste
  ambiente. Os dois `SelectInput` novos em `ToolsBlock` não foram vistos renderizados.

### Achado nos dados reais — a feature está inerte hoje

O diagnóstico rodado contra a organização com o maior catálogo (Ampère Mais):

```json
{"itensAtivos":4762,"aptos":4163,"semPreco":598,"semCusto":4761,"comAdicionais":1,"semRastreamento":4762,"esgotados":0}
```

**`semRastreamento` é 4762 de 4762**: nenhum item do catálogo tem `rastreamentoEstoqueAtivo`. Ligar
`DISPONIBILIDADE` hoje faria o agente responder "a equipe confirma" para todo item — exatamente o
ruído que o diagnóstico existe para revelar antes de a chave ser virada.

E a amostra mostra o ponto mais delicado: os produtos **têm saldo gravado** (`quantidade: 15`, `2`,
`0`) com `rastreamentoEstoqueAtivo: false`. O número existe, vem do ERP, e a flag que autoriza
confiar nele nunca foi ligada.

Isso é decisão de produto, não bug: a regra que trata flag desligada como "não sei" é a mesma da
vitrine (`productIsAvailableForShop`), e afrouxá-la faria o agente afirmar disponibilidade a partir de
um número que ninguém validou. Para a feature sair da inércia, o caminho é ligar
`rastreamentoEstoqueAtivo` nos produtos em que o saldo do ERP é confiável — não mudar o guard.

---

## 16. Pendências conhecidas

- **Filtro de input (§7)** não foi implementado, por decisão. Se for pedido, seguir o contrato
  declarativo completo — incluindo `FILTRO_ESTOQUE_EXCLUIU_TUDO`.
- **`lib/shop/catalog.ts` segue com o predicado booleano próprio**, duplicando a regra de fundo.
  Não foi unificado de propósito: mexer nele muda o comportamento da vitrine, fora do escopo desta
  correção.
- **`baixaEstoqueModo: "COMPOSICAO"`** resolve para `NAO_RASTREADO`. Quando a explosão de ficha
  técnica chegar (Fase 2 de tabs), esse ramo passa a poder responder de verdade.
