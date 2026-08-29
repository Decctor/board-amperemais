# Planejamento de reposição — desenho

Tela: `/dashboard/purchases/replenishment` (grupo **Compras → Reposição**, capability `purchases`).
Núcleo: `lib/replenishment/`. Rotas: `app/api/replenishment/**`.

O objetivo é responder três perguntas que hoje são respondidas em planilha, com dados exportados à
mão do ERP: **o que comprar agora**, **quanto comprar** e **o que já foi comprado demais**.

---

## 1. Por que não é só "estoque ÷ média de saída"

A regra ingênua — média simples dos últimos três meses, comparada com o saldo — erra em quatro
lugares, e cada um deles custa dinheiro na direção oposta:

| Erro | Consequência | Onde é tratado |
| --- | --- | --- |
| Média simples ignora tendência | Compra o passado, não a próxima estação | média ponderada 3-2-1 (`demand.ts`) |
| Não desconta ruptura | Compra menos de quem mais faltou | `resolveEffectiveDays` (`demand.ts`) |
| Não considera prazo de entrega | Dispara a compra quando já é tarde | ponto de pedido (`policy.ts`) |
| Ignora o que já foi pedido | Compra em duplicidade | `estoqueEmTransito` (`get-replenishment-analysis.ts`) |

---

## 2. Fontes de dados

| Dado | Origem | Observação |
| --- | --- | --- |
| Demanda | `sale_items` + `sales` com `statusVenda = CONFIRMADA` | Demanda é o que o cliente pediu, não o que o estoque baixou: movimentação inclui perda, ajuste e produção. |
| Saldo | `products.quantidade` **ou** última posição importada | Ver §5. |
| Em trânsito | `purchase_items` de compras `CONFIRMADA`/`RECEBIMENTO_PARCIAL` | Descontado da sugestão. |
| Custo de compra | `purchase_items.valorUnitarioCusto` (média ponderada da janela + última entrada) | |
| Prazo do fornecedor | `purchases.pedidoData` → `entregaDataRecebimentoEfetivacao` | Média por fornecedor; cai para o padrão da loja quando não há histórico. |
| Fornecedor do produto | preferencial → histórico de compra → nome vindo da importação | Nessa ordem de precedência. |

### Integração Online Sistemas (Ampère Mais)

A integração (`lib/data-connectors/online-software/`) chama `listarVendas001` e traz **apenas
vendas** — com `codigo`, `qtde`, `valorunit` e `vcusto` por item. Portanto:

- **Demanda, preço de venda, custo e margem: disponíveis hoje**, direto do histórico importado.
- **Saldo de estoque, compras e fornecedores: não vêm pela API.** É essa lacuna que a importação
  de posição de estoque (§5) preenche.

---

## 3. Como a demanda é estimada

A janela (padrão 90 dias) é fatiada em baldes de 30 dias contados para trás.

1. **Dias efetivos por balde** = 30 − dias em ruptura (limitado a 80% do balde). Os dias em ruptura
   são reconstruídos do saldo posterior de cada movimentação, com `LEAD` sobre a linha do tempo do
   produto: a soma dos trechos com saldo ≤ 0 é o tempo em que não havia o que vender. Uma
   organização cujo estoque vive fora do RecompraCRM não tem movimentações, e o ajuste vira zero
   sem quebrar nada.
2. **Taxa do balde** = quantidade ÷ dias efetivos.
3. **Demanda diária** = média das taxas ponderada 3-2-1 (o mês corrente pesa 3× o mais antigo).
4. **Desvio diário** = `max(desvio entre os baldes, √demanda)`. O piso de Poisson existe porque
   três observações mensais não descrevem a oscilação de um dia para o outro: com meses parecidos o
   desvio amostral cai a zero e zeraria o estoque de segurança de um item que falta toda semana.
5. **Coeficiente de variação** (só entre os baldes, sem o piso) classifica em **XYZ**:
   X ≤ 0,5 · Y ≤ 1 · Z > 1.

---

## 4. Quando comprar e quanto

Com `d` = demanda diária, `σ` = desvio diário, `LT` = prazo de entrega, `R` = ciclo de compra:

```
estoque de segurança = Z(nível de serviço) × σ × √(LT + R)
ponto de pedido      = d × (LT + R) + estoque de segurança
nível alvo           = d × (LT + cobertura alvo) + estoque de segurança
quantidade sugerida  = arredonda_para_múltiplo(max(nível alvo − posição de estoque, 0))
posição de estoque   = saldo + em trânsito − reservado
```

**Ponto de pedido responde "é hora?", nível alvo responde "quanto?".** Um único número faria o item
voltar para a fila na semana seguinte — dispara a compra e enche só até o próprio gatilho.

`estoqueMinimo`/`estoqueMaximo` informados à mão substituem os dois valores calculados: quem digitou
conhece uma restrição que o histórico não mostra (contrato, prateleira, exigência do fabricante).

### Situações

| Situação | Regra |
| --- | --- |
| `RUPTURA` | saldo ≤ 0 com demanda ativa |
| `CRITICO` | cobertura < prazo de entrega — vai faltar antes de chegar |
| `ATENCAO` | posição ≤ ponto de pedido |
| `EXCESSO` | cobertura > limite de excesso |
| `SEM_GIRO` | saldo > 0 e nenhuma saída na janela |
| `SAUDAVEL` | o resto |

A fila padrão ordena por `indicePrioridade` (urgência × peso da curva ABC) e desempata por
`perdaPotencial` — a margem que se perde nos dias descobertos dentro do prazo de entrega. Ordenar
por percentual de falta colocaria 90% de falta num item C acima de 3% num item A.

---

## 5. Posição de estoque importada

`stock_position_imports` + `stock_position_import_items` guardam um snapshot imutável enviado pela
loja. A análise lê sempre o mais recente concluído, conciliando por `products.codigo`.

- Formatos: `.xlsx`, `.xls`, `.csv` e `.pdf`.
- No PDF as colunas são reconstruídas pelas coordenadas do texto (agrupamento por Y, fronteira no
  ponto médio entre os títulos do cabeçalho). Um relatório digitalizado não tem texto e é recusado
  com orientação, em vez de importar lixo.
- O vínculo coluna → campo é sugerido pelo parser e **confirmado na tela**: adivinhar errado uma
  coluna de custo e gravar em silêncio é pior do que pedir a conferência.
- Linhas sem correspondência no catálogo são gravadas mesmo assim — viram o relatório de "o ERP tem,
  o RecompraCRM não", que é o que a loja precisa ver para corrigir o cadastro.
- Importar liga `origemEstoquePadrao = IMPORTACAO` na política, de forma visível e reversível.

---

## 6. Exportação da cotação

`POST /api/replenishment/export` devolve um `.xlsx` com duas abas:

- **Cotação** — colunas fixas (identificação, situação, números que justificam a compra, quantidade
  editável, preço de venda, custo e margem) seguidas de um par de colunas por fornecedor (preço
  unitário e total). Total da linha, valor final do pedido, menor preço e fornecedor vencedor saem
  como **fórmula**: digitar o preço atualiza a comparação sozinho. As linhas de forma de pagamento,
  previsão de entrega e frete ficam em branco para a negociação.
- **Parâmetros** — a política que produziu os números e uma legenda de como ler cada coluna. A
  primeira pergunta de quem aprova a compra é "por que 240?".

A quantidade exportada é a **revisada na tela**, não a sugerida: a compradora quase sempre ajusta
antes de mandar.

---

## 7. Ofertas de excesso

`lib/replenishment/offers.ts` calcula, para itens em `EXCESSO`/`SEM_GIRO`:

- **Excedente** = saldo além da cobertura saudável. Ofertar o saldo inteiro resolve o indicador e
  cria a ruptura do mês seguinte.
- **Desconto máximo** = o que leva o preço até `custo × (1 + margem mínima)`, nunca abaixo.
- **Desconto sugerido** = fração do máximo, mais agressiva para `SEM_GIRO` (80%) que para `EXCESSO`
  (50%), limitada a 5%–60%.

Itens marcados como **sobressalente** (giro baixo por escolha: peça de reposição, garantia) e
**não promocionar** ficam fora por definição.

---

## 8. Limites conhecidos

- O rateio dos dias de ruptura entre os baldes é proporcional, não por balde. Reconstruir o saldo
  dia a dia por produto daria precisão maior a um custo de consulta bem mais alto.
- `estoqueReservado` é sempre 0: a reserva por item de venda existe em `sale_items`, mas ainda não
  está ligada aqui.
- A criação de cupom a partir da aba de ofertas leva ao construtor existente sem pré-seleção dos
  produtos — o construtor ainda não aceita produtos por query string.
- A análise é calculada por leitura, sem cache. Para catálogos muito grandes o caminho natural é
  materializar a demanda por produto num job noturno.
