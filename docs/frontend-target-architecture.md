# Frontend Target Architecture

Este documento descreve o frontend que queremos ser. Ele não substitui `CLAUDE.md`, `AGENTS.md` ou `DESIGN.md`; ele conecta esses guias a decisões práticas de implementação para que novas telas, refactors e componentes reutilizem padrões já estabelecidos em vez de criarem variações locais.

## Norte

O frontend do RecompraCRM deve ser previsível para quem implementa, consistente para quem usa e fácil de navegar para agentes de IA. A base já existe: App Router, React Query, Axios, state hooks próprios, modais responsivos, shadcn/Radix, Tailwind v4 e um design system com identidade clara.

Queremos evoluir para um frontend onde:

- páginas coordenam fluxos, mas não concentram toda a regra;
- componentes ricos são compostos por partes explícitas;
- formulários usam state hooks dedicados;
- queries e mutations têm fronteiras óbvias;
- design tokens e primitives carregam a aparência padrão;
- exceções são raras, nomeadas e documentadas.

## Princípios

### 1. Reutilizar antes de criar

Antes de criar um componente, modal, hook, query ou padrão visual, procure um equivalente existente. A primeira pergunta deve ser: "qual implementação atual já resolveu esse problema bem?"

Bons pontos de partida:

- CRUD modal: `components/Modals/**`
- modal responsivo: `components/Utils/ResponsiveMenu.tsx`
- agrupamento de campos em modal: `components/Utils/ResponsiveMenuSection.tsx`
- cards compostos: `components/Interactions/InteractionCard.tsx`
- chips/badges compostos: `components/ui/chip.tsx`
- filtros compostos: `components/ui/interactive-filter.tsx`
- query hooks tipados: `lib/queries/*.ts`
- mutation functions puras: `lib/mutations/*.ts`
- estado de formulário: `state-hooks/*.tsx`

### 2. Composição em vez de props booleanas

Componentes complexos devem preferir composição a combinações de flags como `showX`, `isY`, `viewOnly`, `successContent`, `customRender`, etc. Quando existem modos de uso relevantes, crie variantes explícitas ou subcomponentes compostos.

Preferido:

```tsx
<InteractionCard.Provider interaction={interaction}>
	<InteractionCard.Frame>
		<InteractionCard.Header>
			<InteractionCard.Leading>
				<InteractionCard.ClientChip />
			</InteractionCard.Leading>
			<InteractionCard.Actions>
				<InteractionCard.RetryButton />
			</InteractionCard.Actions>
		</InteractionCard.Header>
		<InteractionCard.Body>
			<InteractionCard.CampaignTitle />
			<InteractionCard.Description />
		</InteractionCard.Body>
	</InteractionCard.Frame>
</InteractionCard.Provider>
```

Evitar:

```tsx
<InteractionCard
	interaction={interaction}
	showClient
	showRetry
	showDescription
	isCompact={false}
	renderActions={...}
/>
```

### 3. Páginas coordenam; módulos executam

Uma página client deve orquestrar o fluxo principal da tela, mas não deve acumular toda a UI, mutations, validação, estados auxiliares e regras de domínio em um único arquivo.

O formato desejado é:

- `page.tsx`: server component, autenticação/autorização, busca inicial quando fizer sentido;
- `{feature}-page.tsx`: client component de coordenação;
- `_components/`: blocos visuais e interativos da feature;
- `_helpers/` ou `_lib/`: transformações e regras puras locais da feature;
- state hook dedicado quando houver formulário ou fluxo com muitos updates;
- queries/mutations em `lib/queries` e `lib/mutations` quando o comportamento for reutilizável.

Como regra prática, quando uma página passa a conter vários componentes internos, várias mutations ou centenas de linhas, ela deve ser quebrada por responsabilidade.

### 4. Localidade primeiro, promoção depois

Componentes, helpers e blocos de UI devem nascer perto da feature que os usa. Pastas globais como `components/**` são para modules com reutilização comprovada, não para organizar por substantivo de domínio.

Regra prática:

- usado por uma rota/feature: mantenha dentro de `app/**/_module`;
- usado por duas features do mesmo domínio: considere um `_shared` no segmento de domínio;
- usado por várias áreas do produto: promova para `components/**`, `components/ui/**`, `components/Utils/**` ou outro namespace compartilhado apropriado.

Essa promoção deve acontecer quando a reutilização for real. Uma única utilização cria apenas uma seam hipotética; duas utilizações criam uma seam real.

Para modules complexos, use a organização por experiência:

```txt
feature/
	page.tsx
	feature-page.tsx
	_module/
		overview/
		builder/
		detail/
		shared/
		helpers/
```

No caso de campanhas, a UX já definiu o formato que queremos reutilizar em produtos, vendedores, parceiros e clientes:

- `overview`: tela principal com tabs como estatísticas, base, interações e templates;
- `builder`: criação guiada para CRUDs complexos;
- `detail`: entidade existente com separação entre estatísticas e controle;
- `shared`: blocos internos reutilizados entre overview, builder e detail.

`components/Campaigns` só deve existir para adapters de campanha consumidos fora do module de campanhas. Se algo só é usado pela rota de campanhas, ele pertence a `app/dashboard/commercial/campaigns/_module/**`.

### 5. Estado de formulário vive em state hook

Formulários de CRUD e fluxos multi-etapa devem usar hook dedicado em `state-hooks/`. O componente visual não deve manter a árvore principal do formulário espalhada em `useState` locais.

O hook deve:

- receber `initialState`;
- expor `state`;
- expor updaters nomeados e estáveis;
- expor `redefineState` para hidratação de edição;
- expor `resetState`;
- usar soft-delete com `deletar: true` para filhos existentes;
- exportar `TUseInternalFooState = ReturnType<typeof useInternalFooState>`.

Esse padrão já é forte nos hooks `use-internal-*` e deve ser a base para novos CRUDs internos.

### 6. React Query fica nas bordas certas

Queries e mutations devem ter separação clara:

- `lib/queries/**`: fetch functions privadas + hooks `useQuery`;
- `lib/mutations/**`: funções Axios puras, sem `useMutation`, sem `useQueryClient`, sem toast;
- componentes/modais: `useMutation`, invalidação de cache, callbacks, toast e fechamento de UI.

Essa separação mantém os módulos fáceis de testar, importar e reutilizar.

### 7. Modais são o caminho padrão para CRUD

CRUD administrativo deve acontecer por modais responsivos, não por edição inline em páginas.

Padrão desejado:

- `NewFoo.tsx`: criação, estado inicial vazio;
- `ControlFoo.tsx`: edição, busca por ID, hidratação via `redefineState`;
- `Blocks/`: blocos de formulário por assunto;
- `callbacks?: { onMutate?, onSuccess?, onError?, onSettled? }`;
- `ResponsiveMenu` como casca de Dialog/Drawer;
- `ResponsiveMenuSection` para agrupar campos.

Para entidades filhas, prefira operar junto com o payload do pai quando o domínio permitir. No estado local, filhos removidos com `id` devem ser marcados com `deletar: true`.

### 8. Design system é fonte de comportamento visual

Novas telas devem compor primitives existentes antes de escrever estilos locais. Use:

- `Button` para ações;
- `Chip` para badges/status compactos;
- `InteractiveFilter` para filtros;
- `ResponsiveMenu` para dialog/drawer responsivo;
- `SectionWrapper` quando houver seção de conteúdo;
- inputs padronizados enquanto o novo padrão de fields não existir;
- tokens do `DESIGN.md` para cor, raio, sombra e tipografia.

Evite criar uma aparência completa dentro da feature. Se a feature precisar de um padrão visual reutilizável, ele deve migrar para `components/ui`, `components/Utils` ou outro namespace compartilhado apropriado.

## Padrões Oficiais Atuais

### Cards ricos

Use compound components com provider local quando um card tiver várias partes opcionais ou reutilizáveis. O exemplo de referência é `InteractionCard`.

Características desejadas:

- provider recebe o dado principal;
- subcomponentes leem contexto;
- frame/header/body/footer/actions são explícitos;
- cada subcomponente tem uma responsabilidade pequena;
- não há uma matriz grande de props booleanas.

### Filtros

Use `InteractiveFilter` para filtros reutilizáveis em dashboards. Ele já resolve popover/drawer, opções únicas, múltiplas, data, texto, boolean e ordenação.

Novos filtros devem preferir:

- opções tipadas;
- label e value separados;
- botão de limpar explícito;
- adaptação mobile/desktop pelo primitive.

### Chips e status

Use `Chip.Root`, `Chip.Icon` e `Chip.Label` para status compactos. Status recorrentes devem ter configuração centralizada em `utils/select-options` ou módulo equivalente.

Evite reimplementar pills com classes locais quando o comportamento visual for o mesmo.

### Modais responsivos

Enquanto não houver uma versão composta consolidada, `ResponsiveMenu` é o padrão para formulários em modal. `ResponsiveMenuV2` e `ResponsiveMenuViewOnly` devem ser tratados como variantes históricas a consolidar, não como novos pontos de partida.

### Inputs

Os inputs atuais em `components/Inputs` são o padrão legado. Eles podem ser usados para manter consistência em modais existentes, mas novas abstrações devem caminhar para uma API menos baseada em `width`, `showLabel` e `editable`.

O alvo futuro é um padrão de field composto:

```tsx
<Field.Root>
	<Field.Label>Nome do cliente</Field.Label>
	<Field.Control>
		<Input value={name} onChange={...} />
	</Field.Control>
	<Field.Message />
</Field.Root>
```

## Anti-Padrões

Evite introduzir:

- novos componentes com muitas props booleanas para controlar estrutura;
- `renderX` props quando `children` ou subcomponentes resolverem melhor;
- mutations com `useMutation` dentro de `lib/mutations`;
- hooks de mutation dentro de `lib/queries`;
- estado de formulário grande dentro de páginas ou blocos visuais;
- edição inline para CRUD administrativo;
- classes Tailwind dinâmicas como `w-[${width}]`;
- cores utilitárias fora da paleta documentada;
- componentes locais que duplicam primitives existentes;
- arquivos de página que concentram múltiplas responsabilidades;
- novos padrões chamados `V2`, `NewNew`, `Improved`, etc. sem deprecar o anterior.

## Como Implementar Uma Nova Feature

1. Encontre uma feature parecida.
2. Copie a arquitetura, não o código cegamente.
3. Defina schema/API/query/mutation antes da UI quando houver persistência.
4. Crie state hook dedicado para formulário.
5. Crie `New*` e `Control*` separados.
6. Divida o formulário em `Blocks`.
7. Use primitives existentes para botões, chips, filtros, modais e seções.
8. Deixe mutations como funções puras em `lib/mutations`.
9. Coloque `useMutation`, toast e invalidação no componente que controla a interação.
10. Se precisar fugir do padrão, documente o motivo no PR ou no próprio módulo.

## Como Refatorar Uma Área Existente

Ao refatorar, prefira campanhas pequenas e verificáveis:

1. escolha um fluxo ou componente com fronteira clara;
2. identifique o padrão-alvo neste documento;
3. extraia componentes sem mudar comportamento;
4. mova regras puras para helpers;
5. mova estado de formulário para state hook quando necessário;
6. separe mutation function de hook de mutation;
7. remova variações antigas somente depois dos callsites migrarem;
8. rode lint/typecheck/testes possíveis e registre lacunas.

Não misture refactor arquitetural com redesign visual amplo, migração de API e mudança de regra de negócio no mesmo passo.

## Decisões Pendentes

Estas são áreas que precisam de uma decisão futura antes de virarem padrão fechado:

- consolidar `ResponsiveMenu`, `ResponsiveMenuV2` e `ResponsiveMenuViewOnly`;
- definir o novo primitive oficial de `Field`;
- alinhar `DESIGN.md`, `styles/globals.css` e `OrgColorsProvider`;
- decidir se novos contextos devem usar `use()` em vez de `useContext()` em código de produto React 19;
- mover hooks de mutation existentes para componentes ou hooks dedicados fora de `lib/mutations`;
- ajustar lint/typecheck para serem barreiras mais confiáveis.

## Regra de Ouro

Se a implementação nova parece exigir uma exceção, primeiro procure o padrão existente que mais se aproxima. Se a exceção continuar necessária, dê um nome a ela. Padrões nomeados escalam; improvisos parecidos, mas não iguais, viram dívida.
