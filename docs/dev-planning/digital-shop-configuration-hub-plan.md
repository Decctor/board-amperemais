# Loja Digital: Configuracao Operacional e Hub de Gestao

## Resumo

Este documento define a proxima evolucao da Loja Digital. O objetivo e reorganizar
`shopSettings.configuracoes`, adicionar regras operacionais de atendimento e
planejar como elas devem aparecer no dashboard e na loja publica.

O escopo desta entrega inclui:

- reorganizacao do schema de configuracoes;
- modalidades de atendimento com configuracoes proprias;
- horario recorrente de funcionamento;
- excecoes de horario por data;
- pedido minimo para entrega;
- prazo estimado de entrega;
- tempo medio de preparo;
- mensagem exibida antes da finalizacao;
- novo hub de configuracao no dashboard;
- estados publicos de loja aberta, fechada e indisponivel.

Nao fazem parte desta entrega:

- areas de entrega;
- taxas de entrega;
- formas de pagamento configuraveis;
- pagamento online;
- agendamento de pedidos;
- avisos promocionais;
- campos personalizados no checkout.

## Decisoes De Produto

- O dashboard deve priorizar operacao recorrente. Nao deve parecer um wizard de
  onboarding permanente.
- Quando a loja estiver fora do horario, o cliente pode navegar pelo catalogo,
  buscar produtos e abrir detalhes. Ele nao pode adicionar itens ao carrinho nem
  enviar pedidos.
- Pedidos nao podem ser agendados nesta entrega.
- O status configurado pelo lojista e o horario de funcionamento sao regras
  diferentes:
  - `ativo = false`: loja indisponivel;
  - `ativo = true`, dentro do horario: loja aberta;
  - `ativo = true`, fora do horario: loja fechada para pedidos, mas catalogo
    visivel.
- `organizations` continua sendo a fonte de verdade para nome, CNPJ, logo,
  telefone, endereco e cores. Esses dados nao devem ser duplicados em
  `shopSettings`.

## Contrato De Configuracao

### Estrutura Recomendada

Substituir a configuracao plana atual por grupos de dominio:

```ts
type TShopSettingsConfiguration = {
	atendimento: {
		retirada: {
			ativo: boolean;
		};
		entrega: {
			ativo: boolean;
			pedidoMinimo: number;
			prazoMinutos: number;
		};
	};
	operacao: {
		preparoMinutos: number;
		mensagemCheckout: string | null;
		horarios: TShopSchedule[];
		excecoesHorarios: TShopScheduleException[];
	};
	aparencia: {
		headerCoverUrl: string | null;
		headerCoverTipo: "IMAGEM" | "VIDEO" | null;
		blocos: TShopCompositionBlock[];
	};
	produtos: {
		modo: "ATIVOS" | "INCLUIR" | "EXCLUIR";
		produtoIds: string[];
		destaqueIds: string[];
	};
};
```

O agrupamento reduz nomes longos sem perder contexto:

| Antes                   | Depois                             |
| ----------------------- | ---------------------------------- |
| `aceitaRetirada`        | `atendimento.retirada.ativo`       |
| `aceitaEntrega`         | `atendimento.entrega.ativo`        |
| novo campo              | `atendimento.entrega.pedidoMinimo` |
| novo campo              | `atendimento.entrega.prazoMinutos` |
| novo campo              | `operacao.preparoMinutos`          |
| novo campo              | `operacao.mensagemCheckout`        |
| `headerCoverUrl`        | `aparencia.headerCoverUrl`         |
| `headerCoverTipo`       | `aparencia.headerCoverTipo`        |
| `blocosComposicao`      | `aparencia.blocos`                 |
| `produtosEmDestaqueIds` | `produtos.destaqueIds`             |

### Horarios

Cada dia pode conter zero, um ou mais periodos. Zero periodos significa que a
loja nao aceita pedidos naquele dia.

```ts
type TShopWeekday = "DOMINGO" | "SEGUNDA" | "TERCA" | "QUARTA" | "QUINTA" | "SEXTA" | "SABADO";

type TShopTimeRange = {
	inicio: string; // HH:mm
	fim: string; // HH:mm
};

type TShopSchedule = {
	dia: TShopWeekday;
	periodos: TShopTimeRange[];
};
```

Exemplo:

```ts
{
  dia: "SEGUNDA",
  periodos: [
    { inicio: "08:00", fim: "12:00" },
    { inicio: "13:30", fim: "18:00" },
  ],
}
```

### Excecoes De Horario

As excecoes sobrescrevem completamente o horario recorrente da data informada.
Uma lista vazia de periodos representa fechamento durante o dia inteiro.

```ts
type TShopScheduleException = {
	data: string; // YYYY-MM-DD
	periodos: TShopTimeRange[];
	mensagem: string | null;
};
```

Exemplos:

```ts
{
  data: "2026-06-12",
  periodos: [],
  mensagem: "Fechado para inventario.",
}
```

```ts
{
  data: "2026-06-13",
  periodos: [{ inicio: "09:00", fim: "13:00" }],
  mensagem: "Horario especial neste sabado.",
}
```

### Valores Padrao

```ts
const DEFAULT_SHOP_SETTINGS_CONFIGURATION = {
	atendimento: {
		retirada: {
			ativo: true,
		},
		entrega: {
			ativo: false,
			pedidoMinimo: 0,
			prazoMinutos: 60,
		},
	},
	operacao: {
		preparoMinutos: 30,
		mensagemCheckout: null,
		horarios: [],
		excecoesHorarios: [],
	},
	aparencia: {
		headerCoverUrl: null,
		headerCoverTipo: null,
		blocos: [
			{ tipo: "EM_DESTAQUE", ativo: true, ordem: 1 },
			{ tipo: "MAIS_PEDIDOS", ativo: true, ordem: 2 },
			{ tipo: "GRUPOS_PRODUTOS", ativo: true, ordem: 3 },
		],
	},
	produtos: {
		modo: "ATIVOS",
		produtoIds: [],
		destaqueIds: [],
	},
};
```

`operacao.horarios = []` deve ser tratado como configuracao incompleta, e nao
como loja aberta vinte e quatro horas. Uma loja sem horario cadastrado pode
continuar inativa no dashboard, mas nao deve ser publicada por engano.

## Validacoes

### Schema Zod

Adicionar schemas dedicados em `schemas/shop.ts`:

- `ShopWeekdayEnum`, em `schemas/enums.ts`;
- `ShopTimeRangeSchema`;
- `ShopScheduleSchema`;
- `ShopScheduleExceptionSchema`;
- `ShopServiceConfigurationSchema`;
- `ShopOperationConfigurationSchema`;
- `ShopAppearanceConfigurationSchema`;
- `ShopProductsConfigurationSchema`;
- `ShopSettingsConfigurationSchema`.

Regras:

- pelo menos uma modalidade deve estar ativa;
- `pedidoMinimo`, `prazoMinutos` e `preparoMinutos` nao podem ser negativos;
- `prazoMinutos` e `preparoMinutos` devem ser inteiros;
- horarios devem usar `HH:mm`;
- `inicio` deve ser anterior a `fim`;
- periodos do mesmo dia nao podem se sobrepor;
- datas de excecao devem usar `YYYY-MM-DD`;
- nao pode haver duas excecoes para a mesma data;
- `produtos.modo = "INCLUIR"` exige pelo menos um `produtoId`;
- capa com URL exige tipo de capa;
- blocos devem ter ordem unica.

### Estado Operacional Derivado

Criar uma funcao central, reutilizada pelo catalogo publico e pela criacao de
pedido:

```ts
type TShopAvailability = {
	status: "ABERTA" | "FECHADA" | "INDISPONIVEL";
	motivo: "ATIVA" | "INATIVA" | "SEM_HORARIO" | "FORA_DO_HORARIO";
	mensagem: string | null;
	proximaAbertura: Date | null;
};
```

Responsabilidades:

1. Verificar `shopSettings.ativo`.
2. Resolver a data e o horario no fuso da organizacao.
3. Aplicar excecao da data, quando existir.
4. Caso contrario, aplicar o horario recorrente do dia.
5. Retornar status e proxima abertura.

O backend deve rejeitar `POST /api/shop/[orgId]/orders` quando o status nao for
`ABERTA`, mesmo que o cliente manipule o payload ou mantenha um carrinho antigo
no navegador.

## Backfill Da Configuracao

`configuracoes` e JSONB, portanto a mudanca nao exige alteracao estrutural na
tabela. O formato legado deve ser convertido antes do deploy usando:

```bash
npm run backfill:shop-settings
npm run backfill:shop-settings -- --apply
```

O primeiro comando apenas lista as migracoes pendentes. O segundo persiste a
nova estrutura. O script e idempotente e valida o resultado final com Zod.

Depois do backfill, `normalizeShopSettingsConfiguration()` permanece estrito:
as rotas aceitam apenas o modelo novo e nao carregam uma camada permanente de
compatibilidade.

Mapeamento legado:

```ts
{
  atendimento: {
    retirada: { ativo: legacy.aceitaRetirada ?? true },
    entrega: {
      ativo: legacy.aceitaEntrega ?? false,
      pedidoMinimo: 0,
      prazoMinutos: 60,
    },
  },
  operacao: {
    preparoMinutos: 30,
    mensagemCheckout: null,
    horarios: [],
    excecoesHorarios: [],
  },
  aparencia: {
    headerCoverUrl: legacy.headerCoverUrl ?? null,
    headerCoverTipo: legacy.headerCoverTipo ?? null,
    blocos: legacy.blocosComposicao ?? defaultBlocks,
  },
  produtos: {
    modo: legacy.produtos?.modo ?? "ATIVOS",
    produtoIds: legacy.produtos?.produtoIds ?? [],
    destaqueIds: legacy.produtosEmDestaqueIds ?? [],
  },
}
```

Persistir somente o formato novo em `PUT /api/shop/settings`. A leitura pode
aceitar legado durante a transicao.

## Impacto Nas APIs

### `GET /api/shop/[orgId]/catalog`

Incluir:

```ts
{
	disponibilidade: {
		status: "ABERTA" | "FECHADA";
		mensagem: string | null;
		proximaAbertura: string | null;
	}
}
```

Quando `shopSettings.ativo = false`, manter a resposta controlada de loja
indisponivel. Quando estiver fora do horario, retornar o catalogo normalmente
com `disponibilidade.status = "FECHADA"`.

### `POST /api/shop/[orgId]/orders`

Antes de processar cliente, produtos ou cashback:

1. carregar configuracoes normalizadas;
2. calcular disponibilidade;
3. rejeitar loja fechada;
4. validar modalidade;
5. validar `pedidoMinimo` quando a modalidade for entrega.

Mensagem recomendada:

```txt
Nao estamos recebendo pedidos no momento.
```

### `GET /api/shop/settings`

Retornar sempre o formato novo normalizado. Isso permite que o dashboard trabalhe
com um unico contrato.

### `PUT /api/shop/settings`

Validar e persistir somente o formato novo.

## Hub De Configuracao No Dashboard

### Objetivo

Transformar `app/dashboard/commercial/shop/shop-page.tsx` em uma central de
operacao recorrente. O lojista deve conseguir responder rapidamente:

- a loja esta recebendo pedidos agora?
- quais modalidades estao ativas?
- qual e o proximo horario de abertura ou fechamento?
- existe alguma excecao futura?
- o que precisa ser ajustado antes de ativar a loja?

O dashboard e uma superficie de produto usada durante o expediente, em ambiente
claro e com interrupcoes frequentes. A direcao visual deve ser clara, compacta e
operacional: azul estrutural, ouro reservado para destaques comerciais e estados
de atencao, sem transformar configuracoes em uma grade de cards repetitivos.

### Arquitetura Da Pagina

Usar tres niveis:

1. Barra de comando da loja.
2. Navegacao lateral de configuracoes.
3. Area de edicao com painel contextual.

No desktop:

```txt
+--------------------------------------------------------------+
| Loja Digital        Aberta agora     Ver loja   Copiar link  |
+------------------+-------------------------------------------+
| Visao geral      |                                           |
| Atendimento      |  Conteudo da secao selecionada             |
| Horarios         |                                           |
| Aparencia        |                                           |
| Produtos         |                                           |
+------------------+-------------------------------------------+
```

No mobile, a navegacao lateral vira uma barra horizontal rolavel ou um seletor
compacto acima do formulario.

Evitar salvar automaticamente cada alteracao. Usar estado local de edicao e uma
barra persistente de alteracoes pendentes com:

- `Descartar alteracoes`;
- `Salvar alteracoes`.

### Barra De Comando

Exibir:

- titulo `Loja Digital`;
- status operacional:
  - `Aberta agora`;
  - `Fechada ate 08:00`;
  - `Inativa`;
  - `Configuracao incompleta`;
- acao primaria `Ver loja`;
- acao secundaria `Copiar link`;
- menu de compartilhamento com QR Code.

O QR Code nao precisa ocupar espaco permanente na pagina. Deve aparecer em um
popover ou drawer acionado por `Compartilhar`.

### Visao Geral

A visao geral serve para consulta rapida, nao para duplicar todos os formularios.

Exibir:

- resumo de status;
- modalidades ativas;
- horario do dia;
- proxima excecao cadastrada;
- modo da loja (`Cardapio` ou `Catalogo`);
- modo de exibicao de produtos;
- pendencias que impedem ativacao.

Usar uma lista de linhas informativas e acoes `Editar`, em vez de uma grade de
cards identicos.

### Secao Atendimento

Usar dois blocos:

#### Retirada

- switch `Aceitar retirada`;
- endereco de retirada somente leitura, vindo de `organizations`;
- atalho `Editar dados da organizacao`.

#### Entrega

- switch `Aceitar entrega`;
- input monetario `Pedido minimo`;
- input numerico `Prazo estimado`, em minutos.

Mostrar campos internos somente quando a modalidade estiver ativa. Manter os
valores no estado ao desativar a modalidade, para evitar perda acidental.

### Secao Horarios

#### Horario Recorrente

Apresentar uma linha por dia:

```txt
Segunda-feira   Ativo   08:00 - 12:00, 13:30 - 18:00   Editar
Terca-feira     Ativo   08:00 - 18:00                  Editar
Domingo         Fechado                               Editar
```

Interacao:

- switch por dia;
- um periodo inicial ao ativar;
- acao `Adicionar periodo`;
- validacao inline para sobreposicao;
- acao `Aplicar a outros dias` para reduzir trabalho repetitivo.

#### Excecoes

Mostrar lista ordenada pelas proximas datas:

```txt
12 jun 2026   Fechado o dia inteiro       Inventario
13 jun 2026   09:00 - 13:00               Horario especial
```

Permitir:

- adicionar excecao;
- escolher data;
- fechar o dia inteiro ou informar periodos;
- adicionar mensagem opcional;
- editar;
- excluir com confirmacao.

### Secao Operacao

Campos:

- `Tempo medio de preparo`;
- `Mensagem antes da finalizacao`.

Helper text recomendado:

```txt
A mensagem aparece na revisao do pedido, antes do cliente enviar.
```

### Secao Aparencia

Manter:

- tipo de capa;
- URL de capa;
- preview;
- blocos de composicao com ativacao e ordenacao.

Renomear a estrutura interna para `aparencia.blocos`, mas preservar os mesmos
tipos de bloco.

### Secao Produtos

Manter:

- todos os produtos ativos;
- incluir selecionados;
- excluir selecionados;
- produtos em destaque.

Consumir:

- `produtos.modo`;
- `produtos.produtoIds`;
- `produtos.destaqueIds`.

### Estados Do Dashboard

| Estado                      | Comportamento                                            |
| --------------------------- | -------------------------------------------------------- |
| Carregando                  | skeleton da barra e da area de edicao                    |
| Erro                        | mensagem acionavel com `Tentar novamente`                |
| Sem configuracao persistida | defaults carregados e status `Configuracao incompleta`   |
| Alteracoes pendentes        | barra fixa de salvar e descartar                         |
| Salvando                    | bloquear submissao duplicada e manter formulario visivel |
| Salvo                       | toast e atualizacao do resumo                            |
| Loja inativa                | manter configuracao editavel                             |
| Loja sem horario            | impedir ativacao com mensagem inline                     |

## Experiencia Da Loja Publica

### Objetivo

`app/shop/[orgId]/shop-page.tsx` deve continuar mobile-first e otimizado para
compra rapida. A nova configuracao precisa aparecer como informacao util, nao
como complexidade operacional exposta ao cliente.

### Cabecalho

Atualizar `ShopHeader` para mostrar:

- estado `Aberta agora` ou `Fechada`;
- proxima abertura quando fechada;
- retirada ativa;
- entrega ativa com pedido minimo e prazo estimado;
- endereco e WhatsApp existentes.

Exemplos:

```txt
Aberta agora
Retirada disponivel
Entrega em ate 60 min | Pedido minimo R$ 30,00
```

```txt
Fechada agora | Abre amanha as 08:00
Voce ainda pode consultar nossos produtos.
```

### Loja Aberta

Quando aberta:

- navegacao normal;
- botoes de adicionar ativos;
- carrinho ativo;
- checkout ativo;
- modalidades exibidas normalmente;
- `mensagemCheckout` aparece na etapa de revisao, antes de `Enviar pedido`.

### Loja Fechada

Quando fechada:

- catalogo continua visivel;
- busca e filtros continuam ativos;
- detalhes de produto continuam acessiveis;
- botoes de adicionar ficam indisponiveis;
- carrinho persistido pode ser consultado, mas nao alterado;
- CTA do carrinho nao abre checkout;
- mostrar aviso persistente e discreto abaixo do cabecalho.

Copy recomendada:

```txt
Loja fechada no momento
Voce pode consultar os produtos, mas os pedidos estao pausados.
```

Quando houver proxima abertura:

```txt
Voltamos a receber pedidos amanha, as 08:00.
```

Quando houver mensagem na excecao, exibi-la como complemento.

### Loja Indisponivel

Quando `ativo = false`, preservar o estado dedicado de indisponibilidade:

```txt
Loja indisponivel
Esta loja digital nao esta disponivel no momento.
```

Nao renderizar catalogo.

### Checkout

Atualizar `DeliveryStep`:

- consumir `atendimento.retirada.ativo`;
- consumir `atendimento.entrega.ativo`;
- exibir `pedidoMinimo` na opcao de entrega;
- exibir `prazoMinutos` na opcao de entrega;
- impedir avancar com entrega abaixo do pedido minimo.

Atualizar `OrderReviewStep`:

- exibir `operacao.mensagemCheckout`, quando preenchida;
- exibir tempo medio de preparo;
- exibir prazo de entrega quando a modalidade for entrega;
- manter texto de pagamento no local.

### Carrinho Persistido Fora Do Horario

Um cliente pode ter itens salvos antes do fechamento. Nessa situacao:

- nao apagar o carrinho;
- mostrar os itens em modo somente leitura;
- informar que o envio esta temporariamente indisponivel;
- reabilitar acoes automaticamente quando a API informar loja aberta.

O backend continua sendo a fonte de verdade. Mesmo com estado local desatualizado,
o envio deve falhar de forma controlada se o horario virar durante o checkout.

### Acessibilidade

- Nao comunicar aberto ou fechado somente por cor.
- Usar texto e icone para status.
- Switches precisam de labels explicitos.
- Erros de horario devem aparecer proximos ao periodo invalido.
- Botoes indisponiveis fora do horario devem explicar o motivo em texto visivel,
  nao somente via tooltip.
- Garantir contraste AA para cores customizadas da organizacao.

## Componentes Recomendados

### Dashboard

```txt
ShopPage
  ShopCommandBar
  ShopSettingsNav
  ShopOverviewSection
  ShopServiceSection
  ShopScheduleSection
    ShopWeekdayRow
    ShopTimeRangeEditor
    ShopScheduleExceptionList
    ShopScheduleExceptionEditor
  ShopOperationSection
  ShopAppearanceSection
  ShopProductsSection
  ShopPendingChangesBar
  ShopShareMenu
```

### Loja Publica

```txt
ShopShell
  ShopHeader
  ShopAvailabilityNotice
  MenuModeView | CatalogModeView
  ProductBuilderSheet
  CartFloatingButton
  CartSheet
  CheckoutSheet
    DeliveryStep
    OrderReviewStep
```

Nao criar variantes paralelas do catalogo para loja aberta e fechada. O estado de
disponibilidade deve ser propagado pelo `ShopProvider` e consumido pelos pontos de
interacao.

## Ordem De Implementacao

### Etapa 1: Contrato E Normalizacao

- adicionar schemas;
- reorganizar defaults;
- migrar normalizacao de legado;
- criar calculo central de disponibilidade;
- adicionar testes unitarios para horarios e excecoes.

### Etapa 2: APIs

- retornar disponibilidade no catalogo;
- rejeitar pedidos fora do horario;
- validar pedido minimo;
- atualizar settings GET e PUT;
- testar leitura legada e persistencia nova.

### Etapa 3: Dashboard

- substituir controles pontuais pelo hub;
- criar navegacao de secoes;
- implementar formularios de atendimento, horarios e operacao;
- adicionar barra de alteracoes pendentes;
- mover compartilhamento para menu contextual.

### Etapa 4: Loja Publica

- exibir disponibilidade;
- aplicar modo somente leitura fora do horario;
- adaptar carrinho;
- adaptar checkout;
- exibir mensagem e estimativas na revisao.

### Etapa 5: Validacao

- executar lint e build;
- testar desktop e mobile;
- testar virada de horario com carrinho persistido;
- testar excecao de fechamento;
- testar excecao com horario reduzido;
- testar pedido de entrega abaixo do minimo;
- testar loja inativa;
- testar configuracao legada.

## Criterios De Aceite

### Schema E API

- configuracoes legadas continuam legiveis;
- novas escritas persistem somente o formato agrupado;
- horarios recorrentes aceitam multiplos periodos;
- excecoes sobrescrevem o horario recorrente;
- pedido fora do horario e rejeitado no backend;
- entrega abaixo do pedido minimo e rejeitada no backend;
- catalogo publico retorna disponibilidade e proxima abertura.

### Dashboard

- lojista identifica o estado atual da loja ao abrir a pagina;
- lojista edita modalidades sem navegar por dropdowns de acao rapida;
- lojista configura horarios semanais e excecoes;
- lojista ve alteracoes pendentes antes de salvar;
- lojista consegue copiar link, abrir loja e acessar QR Code;
- pagina permanece utilizavel em mobile.

### Loja Publica

- loja aberta permite navegacao, carrinho e checkout;
- loja fechada permite consulta, mas bloqueia alteracoes no carrinho e checkout;
- loja inativa nao exibe catalogo;
- proxima abertura aparece quando calculavel;
- pedido minimo e prazo aparecem na modalidade de entrega;
- mensagem de checkout aparece antes do envio;
- carrinho persistido nao e apagado durante fechamento.

## Referencias De Implementacao

- `schemas/shop.ts`
- `lib/shop/config.ts`
- `services/drizzle/schema/shop.ts`
- `app/api/shop/settings/route.ts`
- `app/api/shop/[orgId]/catalog/route.ts`
- `app/api/shop/[orgId]/orders/route.ts`
- `app/dashboard/commercial/shop/shop-page.tsx`
- `app/dashboard/commercial/shop/components/ShopSettingsPanel.tsx`
- `app/dashboard/commercial/shop/components/ShopShareCard.tsx`
- `app/shop/[orgId]/shop-page.tsx`
- `app/shop/[orgId]/_components/ShopShell.tsx`
- `app/shop/[orgId]/_components/ShopHeader.tsx`
- `app/shop/[orgId]/_components/CartSheet.tsx`
- `app/shop/[orgId]/_components/checkout/DeliveryStep.tsx`
- `app/shop/[orgId]/_components/checkout/OrderReviewStep.tsx`
