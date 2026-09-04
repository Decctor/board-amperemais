# Cashback — Superfícies de Resgate

> Implementado. Migração `drizzle/0097_cashback_redemption_surfaces.sql` (aplicação manual).
> Contexto: a demanda "ligar/desligar resgate de cashback na loja digital" parecia configuração da
> loja, mas também parecia coisa de canal de venda. Este doc registra por que ficou no programa.

## Decisão

O programa de cashback diz **onde** o cliente pode resgatar, com um boolean por superfície:

| Coluna (`ampmais_cashback_programs`)     | Superfície        | Default |
| ---------------------------------------- | ----------------- | ------- |
| `resgate_permitir_via_pos`               | `POS`             | true    |
| `resgate_permitir_via_ponto_integracao`  | `PONTO_INTERACAO` | true    |
| `resgate_permitir_via_loja_digital`      | `LOJA_DIGITAL`    | true    |

A regra vale para as duas modalidades (desconto em cashback e recompensa); modalidade é o eixo
ortogonal (`modalidade*Permitida`). Ao menos uma superfície precisa ficar ligada (rota e formulário).
É o mesmo desenho dos cupons (`coupons.resgate_permitir_via_*`) e completa a família iniciada na 0069.

## Por que não em `sales_channels`

1. **Superfície ≠ canal de venda.** Canais são `POS|SHOP|COMANDA|IFOOD`; superfícies de resgate são
   `POS|PONTO_INTERACAO|LOJA_DIGITAL`. O POI resgata sem ser canal (e nunca grava `sales.canal`);
   iFood não tem gancho de resgate; comanda não resgata. Um switch em `sales_channels` deixaria o POI
   sem lugar e criaria switches mortos (como já acontece com `exigirAdicionaisMinimos` no iFood).
2. **Canais de venda são do tier ERP** (`requireERPSession`); loja digital e cashback não são. O
   cliente que pediu a feature provavelmente não enxergaria o switch.
3. **O sujeito da regra é o programa.** Org com mais de um programa pode querer "programa A resgata
   online, programa parceiro B só na loja física" — só o programa expressa isso.
4. **A superfície é onde o benefício foi PEDIDO, não onde a venda fecha.** Orçamento da loja
   confirmado no PDV mantém `LOJA_DIGITAL` para o que herdou do rascunho (o cupom já fazia isso).

`shop_settings.configuracoes` foi descartado por não generalizar para o PDV e por ser o jsonb que o
registro de canais vem drenando.

## Mecanismo

- Vocabulário único: `BenefitRedemptionSurfaceEnum` em `schemas/enums.ts`; `TCouponRedemptionSurface`
  virou alias dele. Comanda fechada pelo atendente conta como `POS` — sem valor novo no enum.
- Política: `lib/cashback/redemption-policy.ts` (`getCashbackRedemptionBlockReason`,
  `hasAnyCashbackRedemptionSurface`). Único lugar onde a regra é escrita.
- Gates de servidor (todos passam a superfície explicitamente):
  - POI: `app/api/point-of-interaction/new-transaction/route.ts` (`PONTO_INTERACAO`).
  - Loja: `validateCashbackRequest` e admissão de recompensa em `app/api/shop/[orgId]/orders/route.ts`
    (`LOJA_DIGITAL`); listagem de recompensas devolve vazio quando a superfície está desligada.
  - PDV: rascunhos e `create-and-confirm` (`POS`); `confirm` deriva por benefício — cashback digitado
    pelo operador é `POS`, herdado do rascunho da loja é `LOJA_DIGITAL`.
  - Ponto único de confirmação: `processSaleConfirmation` recebe `saleCashbackRedemptionSurface`
    (default `POS`) e checa a política para desconto e para recompensa. Fechar comanda não passa nada.
- UX: loja esconde a etapa de benefícios quando `resgatePermitirViaLojaDigital` está desligado
  (`getShopCashbackCapabilities` em `lib/shop/checkout.ts`); PDV esconde os blocos de resgate quando
  `resgatePermitirViaPos` está desligado; POI já escondia.
- Sem backfill: default `true` preserva o comportamento vigente (lição da 0069).

Testes: `npm run test:cashback-redemption`.
