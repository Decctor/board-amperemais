# Custos de compra, estoque e contabilização

Este documento é a referência funcional para a implementação de custos discriminados em compras. Ele explica as decisões preservadas no [ADR-0001](../adr/0001-purchase-cost-composition-and-accounting-entry-lines.md). A classificação fiscal concreta deve ser validada com a contabilidade responsável pela organização.

## Objetivo

Uma compra precisa responder separadamente:

1. Quanto será pago ao fornecedor?
2. Quanto será incorporado ao custo do estoque?
3. Quanto será reconhecido como crédito tributário?
4. Quanto será reconhecido como despesa do período?

Misturar essas perguntas em um único `valorUnitarioLiquido` produz custo médio incorreto e lançamentos contábeis sem discriminação.

## Valor-base e modificadores

O valor-base da mercadoria continua nos campos monetários do item. `MERCADORIA` não é uma chave de modificador.

Chaves suportadas inicialmente:

| Chave               | Significado                                                                             |
| ------------------- | --------------------------------------------------------------------------------------- |
| `DESCONTO`          | Desconto, abatimento ou redução atribuída ao item                                       |
| `FRETE`             | Transporte relacionado à aquisição                                                      |
| `SEGURO`            | Seguro relacionado à aquisição                                                          |
| `DESPESA_ACESSORIA` | Manuseio ou outro valor diretamente atribuível, ou despesa separada conforme tratamento |
| `IMPOSTOS_IPI`      | IPI destacado ou atribuído ao item                                                      |
| `IMPOSTOS_ICMS_ST`  | ICMS-ST destacado ou atribuído ao item                                                  |
| `IMPOSTOS_FCP_ST`   | FCP-ST destacado ou atribuído ao item                                                   |
| `OUTRO`             | Modificador não coberto; exige descrição                                                |

Toda nova chave tributária deve começar com `IMPOSTOS_`.

Cada modificador registra:

```typescript
{
	chave: PurchaseCostModifierKey;
	valorCentavos: number;
	efeito: "ACRESCIMO" | "REDUCAO";
	tratamento: "CUSTO_ESTOQUE" | "CREDITO_TRIBUTARIO" | "DESPESA_PERIODO";
	origem: "XML" | "IA" | "MANUAL";
	documentoRef?: string | null;
	descricao?: string | null;
	rateio?: {
		metodo: "INFORMADO_ITEM" | "PROPORCIONAL_VALOR" | "PROPORCIONAL_QUANTIDADE" | "MANUAL";
	} | null;
}
```

## Tratamentos

### `CUSTO_ESTOQUE`

Capitaliza o valor no item e afeta o custo médio móvel no recebimento. Inclui normalmente valor líquido da mercadoria, transporte, seguro, manuseio diretamente atribuível e tributos não recuperáveis.

Um `DESCONTO` tratado como custo de estoque usa `REDUCAO` e diminui o custo capitalizado.

### `CREDITO_TRIBUTARIO`

O valor faz parte do documento e do passivo com o fornecedor, mas não entra no custo do produto. A contabilização debita a conta de tributo recuperável configurada.

### `DESPESA_PERIODO`

O valor faz parte do documento e do passivo, mas é reconhecido diretamente no resultado. Exemplos possíveis incluem taxa administrativa, encargo financeiro ou gasto não diretamente atribuível à colocação do estoque em sua condição e localização atuais.

## Regra contábil orientadora

O CPC 16 determina que o custo de aquisição inclui preço de compra, tributos não recuperáveis, transporte, seguro, manuseio e outros gastos diretamente atribuíveis, deduzidos descontos e abatimentos. Tributos recuperáveis, despesas administrativas não atribuíveis, despesas de venda e perdas anormais não compõem o custo normal do estoque.

A chave não decide o tratamento sozinha. Por exemplo, `IMPOSTOS_IPI` pode ser `CUSTO_ESTOQUE` ou `CREDITO_TRIBUTARIO` conforme a operação e o regime fiscal.

## Totais derivados

Para cada item:

```text
valor financeiro = valor-base líquido
                 + acréscimos de todos os tratamentos
                 - reduções de todos os tratamentos

valor total de custo = valor-base líquido
                     + acréscimos CUSTO_ESTOQUE
                     - reduções CUSTO_ESTOQUE

valor de crédito tributário = acréscimos CREDITO_TRIBUTARIO
                             - reduções CREDITO_TRIBUTARIO

valor de despesa do período = acréscimos DESPESA_PERIODO
                            - reduções DESPESA_PERIODO

valor unitário de custo = valor total de custo / quantidade interna
```

Todos os rateios e somatórios intermediários usam centavos inteiros. Colunas SQL monetárias usam tipos exatos, nunca ponto flutuante novo.

## Rateio

Valores declarados por item são preservados como `INFORMADO_ITEM`. Valores declarados apenas no total do documento são distribuídos por:

- valor líquido do item, padrão;
- quantidade, quando escolhido;
- atribuição manual.

O algoritmo de maior resto distribui centavos residuais em ordem estável. Para cada modificador documental:

```text
soma das parcelas dos itens = valor declarado no documento
```

## Recebimento e custo médio

Ao receber a compra, o módulo persiste `valorTotalCusto` e `valorUnitarioCusto` e os utiliza na movimentação de entrada:

```text
novo custo médio =
  (valor do estoque anterior + valor de custo recebido)
  / quantidade posterior
```

Composição, valores, quantidade e produto ficam congelados depois que a entrada de estoque é criada. Correções precisam reverter ou reprocessar a entrada explicitamente.

O valor efetivo do lançamento congela junto: depois do recebimento ele já bate com os itens e com as linhas contábeis gravadas, então alterá-lo desfaria a igualdade sem nada a reprocessar. Reprogramar pagamento continua livre. A tela desabilita o campo e o servidor recusa a mudança.

## Linhas contábeis

As contas ficam em `configuracao.defaults.contabilidade.lancamentosPadrao.compras`: a compra é o único lançamento padrão com mais de um débito, e os débitos extras são pernas do mesmo lançamento, não um bloco de configuração paralelo.

| Tratamento           | Conta                              |
| -------------------- | ---------------------------------- |
| `CUSTO_ESTOQUE`      | `debitoContaId`                    |
| `CREDITO_TRIBUTARIO` | `debitoCreditoTributarioContaId`   |
| `DESPESA_PERIODO`    | `debitoDespesaPeriodoContaId`      |
| total a pagar        | `creditoContaId` (crédito)         |

As linhas são geradas pela conta resultante, não pelas chaves dos modificadores:

```text
CUSTO_ESTOQUE       → débito em estoque
CREDITO_TRIBUTARIO  → débito em tributo recuperável configurado
DESPESA_PERIODO     → débito em despesa configurada
total a pagar       → crédito em fornecedores
```

Exemplo:

```text
Mercadoria líquida       R$ 100
Frete capitalizado       R$  10
Despesa do período       R$   5
IPI recuperável          R$   8
Total a pagar            R$ 123
```

```text
Débito — Estoques                  R$ 110
Débito — Despesa configurada       R$   5
Débito — IPI a recuperar           R$   8
Crédito — Fornecedores             R$ 123
```

Para todo lançamento:

```text
soma dos débitos = soma dos créditos = valor do lançamento
```

## Importação documental

XML de NF-e é interpretado deterministicamente e nunca enviado a um modelo de IA. PDF e imagem usam o extrator visual existente, mas ambos produzem a mesma forma normalizada.

O snapshot do documento preserva referência local, chave de acesso, identificação, totais originais e hash. Modificadores dos itens apontam para essa referência local.

O snapshot **não** guarda bucket nem caminho: o objeto privado é localizado por `referencia` mais a organização da sessão, em `buildPurchaseImportedDocumentPath` (`lib/purchase/imported-documents.ts`). Um caminho transportado no payload seria um caminho forjável, e `documentosImportados` não entra pelo cabeçalho da compra — entra por `importedDocuments`, validado à parte.

## Casos que devem permanecer cobertos por testes

- Frete direto aumenta custo de estoque.
- Imposto recuperável afeta o passivo e o crédito tributário, não o custo médio.
- Imposto não recuperável aumenta custo de estoque.
- Desconto reduz custo de estoque.
- Despesa do período afeta o passivo, não o custo médio.
- Rateio fecha exatamente em centavos.
- Compra recebida não aceita alteração silenciosa de custos.
- Linhas contábeis sempre se balanceiam.
- XML malformado, com DTD ou entidade customizada é rejeitado.

## Manutenção

Mudanças nas chaves, tratamentos, fórmulas, regras de rateio ou contabilização exigem atualização conjunta deste documento, do ADR e dos testes. Comentários no código devem explicar apenas invariantes locais e apontar para estes documentos, evitando cópias divergentes da regra completa.
