# Plano: UX acionável do módulo fiscal

Objetivo: toda superfície fiscal responde a duas perguntas do operador — **"o que está errado?"** e **"o que eu faço agora?"** — sem sair do lugar. Este documento fixa (1) o livro de regras que o produto obedece, (2) o modelo de domínio que torna essas regras uma fonte única para API e UI, (3) o desenho de cada superfície e (4) as fases de entrega.

Referências de código citadas apontam para o estado atual da branch (`main`, set/2026).

---

## 1. Diagnóstico: por que hoje nada é acionável

| Sintoma | Causa no código |
|---|---|
| "Validacao fiscal falhou: Produto sem perfil fiscal cadastrado" sem link para o produto | O motor produz erros estruturados (`codigo: "PERFIL_FISCAL_AUSENTE"`, `produtoId`) em `lib/fiscal/taxation-context.ts:121-133`, mas `assertFiscalTaxationValid` os achata em uma string única (`lib/fiscal/documents.ts:855-862`) que é persistida em `mensagens: text[]`. A UI só recebe texto. |
| Botão de cancelar aparece e some sem explicar por quê; prazo nunca é mostrado | As regras de disponibilidade vivem inline na UI (`app/dashboard/fiscal/fiscal-page.tsx:524-550`) e são diferentes das regras do servidor. Não existe nenhuma constante de prazo (`lib/fiscal/constants.ts`). |
| Cancelamento fora do prazo só falha depois de chamar a SEFAZ | `cancelFiscalDocument` (`lib/fiscal/documents.ts:1268`) não verifica status, tipo nem prazo — só existência. A rejeição vem do provedor e cai como `toast.error` genérico. |
| Após o prazo, a venda também fica travada | `process-confirmed-sale-cancellation.ts:39-40` exige documento `CANCELADO`/`INUTILIZADO` para cancelar a venda. Com a nota autorizada e fora do prazo, não há saída nem pela venda nem pelo fiscal. |
| Ações via `window.prompt`/`window.confirm` | `fiscal-page.tsx:620-661`. Sem contador de caracteres, sem consequências, sem prazo, sem histórico de falha. |
| Falha de emissão automática é invisível | `notifyFiscalEmissionFailure` envia e-mail apenas para `BUG_REPORT_EMAIL` (`lib/fiscal/notifications.ts:57-60`). Falhas de prontidão gravam `ERRO` com `proximaTentativaEm: null` (`documents.ts:1038-1042`) e nunca são retentadas nem sinalizadas. |
| "Erro fiscal" na venda é um rótulo morto | `FiscalStatusChip.tsx` só exibe; `fiscal-health-block.tsx:109-130` linka para a venda, não para o documento. |
| Perfil fiscal do produto só é alcançável pela página do produto | `FiscalProfileMenu.tsx` é um modal reutilizável, mas só é aberto por `FiscalProfilesInformation.tsx` e pelo bloco do modal de produto. |
| Não há fila de pendências | O único "monitor" é o pill `ERROS E REJEIÇÕES` (`fiscal-page.tsx:1928-1940`) sobre a lista paginada. |
| Catálogo de rejeições é texto | `FISCAL_REJECTION_CATALOG` (`lib/fiscal/rejections.ts`) tem `acaoSugerida` em prosa, sem alvo navegável. Só aparece no modal de detalhes. |

Resumo: a informação para agir **existe no backend no momento da falha** e é destruída antes de chegar à UI; e as regras de "o que posso fazer" **existem na UI** e não no backend. O plano inverte os dois.

---

## 2. Livro de regras (os limites com que o produto joga)

Regras adotadas como padrão do produto. Onde a legislação varia por UF ou por provedor, o valor é **configurável por organização** com o padrão indicado, e a UI sempre mostra o valor efetivo.

### 2.1 Janelas e pré-condições por operação

| Operação | NFC-e | NF-e | Pré-condição de estado | Prazo padrão | Base do prazo |
|---|---|---|---|---|---|
| Cancelar | ✅ | ✅ | `statusInterno = AUTORIZADO` e `status = AUTORIZADA` | NFC-e: **30 min** · NF-e: **24 h** | `dataAutorizacao` |
| Carta de correção (CC-e) | ❌ | ✅ | `AUTORIZADO` | sem prazo; máx. **20** eventos; a última substitui as anteriores | — |
| Inutilizar numeração | ✅ | ✅ | `ERRO` ou `REJEITADO` com `numero` reservado e sem intenção de reenviar | até o **dia 10 do mês seguinte** ao da numeração | `dataInsercao` da reserva |
| Gerar devolução (NF-e finalidade DEVOLUCAO) | ✅ (gera NF-e) | ✅ | original `AUTORIZADO` com `chaveAcesso` e venda vinculada; perfil de operação DEVOLUCAO ativo | sem prazo | — |
| Reenviar / emitir novamente | ✅ | ✅ | `ERRO` ou `REJEITADO`; venda `CONFIRMADA`; nenhum outro documento ativo para a venda | — | — |
| Atualizar status (sync) | ✅ | ✅ | qualquer estado com `provedorDocumentoId` | — | — |

Notas:

- **Cancelamento extemporâneo** (fora da janela, via portal SEFAZ com multa em alguns estados) **não é suportado pelo produto**. A UI orienta o operador, não executa.
- **CC-e não corrige** valores, quantidades, datas, partes nem itens. Serve para dados descritivos (endereço, observação, transportador). A UI diz isso antes do formulário.
- Após `CANCELAMENTO_SOLICITADO`, o documento entra em `CANCELAMENTO_PENDENTE` e a única ação é sincronizar.
- A janela de cancelamento conta a partir de `dataAutorizacao`, nunca de `dataEmissao` nem de `dataInsercao`.
- **A venda segue a nota.** Enquanto houver documento fora de `CANCELADO`/`INUTILIZADO`, a venda não cancela e não edita pagamentos (regra atual, mantida). O que muda é que a UI da venda passa a explicar isso e a oferecer a saída correta (§4.3).

### 2.2 Configuração por organização (novo bloco em `fiscalConfiguracao`)

```ts
prazos: {
	cancelamentoNfceMinutos: 30,   // varia por UF; alguns estados permitem 24h
	cancelamentoNfeHoras: 24,
}
```

Padrões vivem em `lib/fiscal/constants.ts`; a organização sobrescreve na aba Configuração. A UI exibe o efetivo ("Cancelamento disponível por 30 min após a autorização — configurado para SP").

### 2.3 Máquina de estados e ações permitidas

```
RASCUNHO ──► PRONTO_PARA_ENVIO ──► EM_PROCESSAMENTO ──► AUTORIZADO ──► CANCELAMENTO_PENDENTE ──► CANCELADO
                 │                        │                  │
                 ▼                        ▼                  └──► (devolução gera novo doc NF-e)
               ERRO ◄────────────────  REJEITADO
                 │                        │
                 └──► INUTILIZADO ◄───────┘
```

| Estado | Ações válidas | Ações que a UI deve **explicar como indisponíveis** |
|---|---|---|
| `RASCUNHO` / `PRONTO_PARA_ENVIO` | aguardar; sincronizar | cancelar ("ainda não autorizado"), inutilizar ("ainda em fila") |
| `EM_PROCESSAMENTO` | sincronizar | tudo o mais ("aguarde o retorno do provedor") |
| `AUTORIZADO` dentro da janela | cancelar; CC-e (NF-e); devolução; baixar XML/PDF | inutilizar ("documento autorizado") |
| `AUTORIZADO` fora da janela | devolução; CC-e (NF-e); baixar XML/PDF | cancelar ("prazo encerrado às HH:MM") → **§4.3** |
| `REJEITADO` / `ERRO` | corrigir problema → reenviar; inutilizar numeração | cancelar ("nada foi autorizado") |
| `CANCELAMENTO_PENDENTE` | sincronizar | tudo o mais |
| `CANCELADO` / `INUTILIZADO` | baixar XML (se houver); emitir novamente para a mesma venda | tudo o mais (terminal) |

---

## 3. Modelo de domínio: uma fonte para API e UI

### 3.1 `resolveFiscalDocumentActions` — matriz de ações (novo `lib/fiscal/document-actions.ts`)

Função pura, testável, usada **pelos handlers das rotas para bloquear** e **pela API de leitura para renderizar**.

```ts
export type TFiscalDocumentActionKey =
	| "CANCELAR" | "CARTA_CORRECAO" | "INUTILIZAR" | "DEVOLUCAO" | "REENVIAR" | "SINCRONIZAR" | "BAIXAR_XML" | "BAIXAR_PDF";

export type TFiscalDocumentAction = {
	acao: TFiscalDocumentActionKey;
	disponivel: boolean;
	motivoIndisponivel: string | null;      // texto pronto para o operador
	prazoLimite: Date | null;               // quando existir janela
	alternativas: TFiscalDocumentActionKey[]; // o que fazer no lugar (ex.: CANCELAR indisponível → [DEVOLUCAO])
};

export function resolveFiscalDocumentActions(input: {
	documento: Pick<TFiscalDocument, "tipo" | "status" | "statusInterno" | "dataAutorizacao" | "numero" | "serie" | "chaveAcesso" | "vendaId" | "xmlStoragePath" | "pdfStoragePath" | "dataInsercao">;
	prazos: TFiscalDeadlines;
	agora: Date;
}): TFiscalDocumentAction[];
```

- As rotas `cancel`, `correction`, `inutilize`, `return` passam a chamar a função e lançar `FiscalReadinessError(motivoIndisponivel)` quando `disponivel = false`. Isso corrige o buraco atual do cancelamento (nenhuma pré-condição) e garante que a UI e a API discordem em zero casos.
- O GET `/api/fiscal/documents` devolve `acoes: TFiscalDocumentAction[]` junto de cada documento (estende a entidade → nome em português, cf. `CLAUDE.md` §4).
- Permissões (`fiscal.cancelar`, `fiscal.emitir`) continuam avaliadas na rota; a UI combina `disponivel && permitido`.

### 3.2 `problemas` — o erro como dado estruturado

Substitui o uso de `mensagens: text[]` como única fonte de verdade. `mensagens` continua existindo (texto bruto do provedor); `problemas` é o que a UI renderiza.

```ts
export type TFiscalProblemOrigin = "PRONTIDAO" | "VALIDACAO" | "PROVEDOR" | "SEFAZ";
export type TFiscalProblemTargetType =
	| "PRODUTO" | "GRUPO_TRIBUTARIO" | "SERIE" | "PERFIL_OPERACAO" | "CONFIGURACAO_FISCAL"
	| "CERTIFICADO" | "EMPRESA_PROVEDOR" | "CLIENTE" | "PAGAMENTOS" | "VENDA" | "NENHUM";

export type TFiscalProblem = {
	codigo: string;               // "PERFIL_FISCAL_AUSENTE", "SERIE_AUSENTE", "SEFAZ_778", "PROVEDOR_INDISPONIVEL"…
	origem: TFiscalProblemOrigin;
	categoria: TFiscalRejectionCategory; // reutiliza CADASTRO | TRIBUTARIO | CERTIFICADO | NUMERACAO | SCHEMA | DUPLICIDADE | INFRAESTRUTURA | OUTRO
	mensagem: string;             // frase curta para o operador
	acaoSugerida: string;         // imperativa: "Cadastre o perfil fiscal do produto"
	alvo: { tipo: TFiscalProblemTargetType; id: string | null; rotulo: string | null };
	reenviavel: boolean;          // após corrigir, o mesmo documento pode ser reenviado?
	resolvidoAutomaticamente: boolean; // true quando o worker vai retentar sozinho (ex.: provedor indisponível)
};
```

**Persistência**: nova coluna `problemas` (JSON em `text`) em `fiscalOutboundDocuments`. Escrita nos mesmos três pontos onde hoje se grava `mensagens` (`documents.ts:1038`, `:1151`, `:1180`).

**Produção dos problemas** (um `lib/fiscal/problems.ts` com `toFiscalProblems(error | providerDetails)`):

| Fonte | Como vira `TFiscalProblem` |
|---|---|
| `assertFiscalReadiness` (`documents.ts:680-745`) | Cada `throw new FiscalReadinessError("…")` ganha um segundo argumento `{ codigo, alvo }`. A classe passa a carregar `problema?: TFiscalProblem`. Ex.: `"Serie fiscal ativa nao encontrada"` → `{ codigo: "SERIE_AUSENTE", alvo: { tipo: "SERIE" } }`. |
| Motor tributário (`taxation-context.ts:121-133`, `engine/validation.ts`) | Já são estruturados. `assertFiscalTaxationValid` lança `FiscalReadinessError` com `problemas: taxation.erros.map(toProblem)` em vez de concatenar. `PERFIL_FISCAL_AUSENTE` → `alvo: { tipo: "PRODUTO", id: produtoId, rotulo: nome }`. |
| SEFAZ (`codigoRejeicao` + catálogo) | `getFiscalRejectionInfo(cStat)` já dá `categoria`, `acaoSugerida`, `reenviavel`. O catálogo ganha um campo novo `alvo: TFiscalProblemTargetType` por código (778 → `PRODUTO`, 280/281 → `CERTIFICADO`, 233/302 → `CLIENTE`, 204/539/562 → `SERIE`, 866 → `PAGAMENTOS`). Para o produto específico da rejeição 778, o `nItem` do retorno da SEFAZ é cruzado com `provedorPayload.infNFe.det[]` para resolver `produtoId`. |
| Provedor (Axios/Spedy) | `toSpedyHttpError` já classifica por status. 401/403 → `EMPRESA_PROVEDOR` ("Credenciais recusadas — sincronize a empresa"); 429/5xx → `INFRAESTRUTURA` com `resolvidoAutomaticamente: true`. |
| `freight-rejection-remediation.ts` | Hoje só usado em script. Passa a alimentar o problema 866 com `alvo: PAGAMENTOS` e sugestão específica. |

**Regra de retentativa** (corrige o ponto A5 da review): problemas com `origem: "PRONTIDAO"`/`"VALIDACAO"` não são retentados pelo worker (como hoje), mas ficam listados em **Pendências** com CTA. Problemas de `INFRAESTRUTURA` seguem o backoff. Quando o operador resolve o alvo (ex.: cria o perfil fiscal), a UI oferece "Reenviar" e a API reprocessa.

### 3.3 Pendências agregadas (novo GET `/api/fiscal/pending`)

Devolve o trabalho a fazer, já agrupado pelo alvo — porque um perfil fiscal ausente costuma travar dez vendas, e o operador quer resolver o produto uma vez, não dez documentos.

```ts
{
	data: {
		resumo: { documentos: number; vendasSemDocumento: number; valorTravado: number },
		porAlvo: Array<{
			alvo: { tipo; id; rotulo };
			problema: Pick<TFiscalProblem, "codigo" | "categoria" | "mensagem" | "acaoSugerida">;
			documentos: Array<{ id; tipo; vendaId; valorTotal; dataInsercao }>;
		}>,
		prazosExpirando: Array<{ documentoId; acao: "CANCELAR" | "INUTILIZAR"; prazoLimite: Date }>,
		produtosSemPerfil: Array<{ produtoId; nome; vendasRecentes: number }>, // ativos vendidos nos últimos 30 dias sem perfil ativo
	}
}
```

`produtosSemPerfil` é **preventivo**: mostra o problema antes da primeira venda falhar. Reaproveita a query de `scripts/export-missing-fiscal-profiles.ts`.

---

## 4. Superfícies

### 4.1 Módulo fiscal — aba **Pendências** (nova, vira a aba inicial quando há pendências)

Layout em três blocos, do mais urgente para o menos:

1. **Prazos expirando** — "NFC-e nº 1234 pode ser cancelada por mais 12 min" com botão `Cancelar agora`. Lista vazia some.
2. **Bloqueios por causa** — um card por `alvo`:
   - Título: `Produto "Coca-Cola 350ml" sem perfil fiscal` · badge `CADASTRO` · `4 documentos · R$ 312,00 travados`.
   - CTA primária: **`Cadastrar perfil fiscal`** → abre `FiscalProfileMenu` (já existe) com `produtoId` preenchido, sem sair da página.
   - Após salvar: o card troca a CTA por **`Reenviar 4 documentos`** (novo POST `/api/fiscal/documents/retry` em lote, que só aceita ids cujo problema tem `reenviavel: true`).
   - Mapeamento CTA por tipo de alvo:

     | `alvo.tipo` | CTA | Abre |
     |---|---|---|
     | `PRODUTO` | Cadastrar/Editar perfil fiscal | `FiscalProfileMenu` inline |
     | `GRUPO_TRIBUTARIO` | Vincular grupo tributário | `FiscalProfileMenu` inline, foco no campo |
     | `SERIE` | Configurar série NFC-e/NF-e · Avançar numeração | `NewFiscalSeries` / `ControlFiscalSeries` |
     | `PERFIL_OPERACAO` | Criar perfil de operação (com presença/modalidade pré-preenchidas a partir da mensagem) | `NewFiscalOperationProfile` |
     | `CONFIGURACAO_FISCAL` | Completar dados da empresa | rola para a seção EMPRESA FISCAL da aba Configuração |
     | `CERTIFICADO` | Renovar certificado | menu de certificado existente |
     | `EMPRESA_PROVEDOR` | Sincronizar empresa com a Spedy | `syncFiscalCompany` |
     | `CLIENTE` | Informar CPF/CNPJ do cliente | modal de edição de cliente com foco no campo |
     | `PAGAMENTOS` | Revisar pagamentos da venda | detalhe da venda, seção pagamentos |
     | `NENHUM` (SEFAZ não catalogada / infra) | Ver retorno completo · Atualizar status | modal de detalhes |
3. **Produtos sem perfil fiscal (preventivo)** — lista com `Cadastrar` por linha e **`Aplicar grupo tributário em lote`** (seleciona N produtos, escolhe grupo + NCM, cria os perfis — cobre o caso do CSV de `scripts/apply-fiscal-profiles-from-csv.ts` sem script).

### 4.2 Card e modal do documento

**Card** (`FiscalDocumentCard`): a faixa vermelha de texto vira uma linha de **chips de problema** (`categoria` + `mensagem`) e **uma** CTA primária (a do primeiro problema com `alvo`). Se todos os problemas estão resolvidos (`reenviavel` e alvo já ok — verificado pelo GET), a CTA é `Reenviar`.

**Barra de ações** (substitui o dropdown "Ações rápidas" no modal; no card continua dropdown, mas alimentado por `acoes`):

- Ação disponível: botão normal.
- Ação indisponível: botão desabilitado **com o motivo visível ao lado**, não só em tooltip. Ex.: `Cancelar — prazo encerrado às 14:32`.
- Ação com prazo: contador vivo. `Cancelar · 12 min restantes`. Abaixo de 5 min, o botão vira destaque.
- Alternativas: quando `CANCELAR.disponivel = false` e `alternativas = ["DEVOLUCAO"]`, o botão de devolução sobe para primário.

**Formulários próprios** (novos modais em `components/Modals/FiscalDocument/`), no lugar de `window.prompt`:

- `CancelFiscalDocument` — motivo (15–255 caracteres, contador), prazo restante, aviso de consequência ("A venda continuará confirmada; para cancelar a venda, faça isso depois"), checkbox de ciência quando faltam < 5 min.
- `CorrectFiscalDocument` — texto (15–1000), painel "O que a carta de correção **não** corrige" (valores, quantidades, datas, partes), contador `n/20 eventos`.
- `InutilizeFiscalDocument` — justificativa (15–255), aviso de que a numeração é queimada e o documento fecha; prazo até dia 10 do mês seguinte.
- `ReturnFiscalDocument` — confirma o perfil de devolução que será usado, mostra a chave referenciada, explica que gera uma NF-e nova de entrada.

Falhas dessas mutações deixam de ser só `toast.error`: o retorno é gravado como evento `ERRO` com `origem` correspondente (já acontece no cancel; estender às demais) e aparece no histórico do modal.

**Modal de detalhes**: nova seção **"O que fazer agora"** no topo, acima de IDENTIFICAÇÃO, renderizada a partir de `problemas` + `acoes`. Some quando o documento está `AUTORIZADO` sem pendência. A seção MENSAGENS (texto bruto) desce para dentro de PAYLOAD E RETORNO.

### 4.3 Cancelamento não é mais possível — como apresentar

Caso `AUTORIZADO` com `CANCELAR.disponivel = false` por prazo. Não é um botão cinza com tooltip; é um painel de decisão:

> **Cancelamento indisponível** — o prazo de 30 min para NFC-e encerrou às 14:32.
> A nota continua válida na SEFAZ. Escolha o que corresponde ao que aconteceu:
>
> - **A venda foi desfeita / o cliente devolveu** → `Gerar NF-e de devolução` (recomendado). Gera uma NF-e de entrada referenciando esta nota e estorna o efeito fiscal. *[disponível quando há perfil DEVOLUCAO; senão, CTA "Configurar perfil de devolução"]*
> - **Só um dado descritivo está errado** (NF-e apenas) → `Emitir carta de correção`. Não altera valores nem itens.
> - **A nota não deveria existir** → cancelamento extemporâneo só é possível pelo portal da SEFAZ do seu estado, geralmente com multa. Leve a chave de acesso `4123…` ao seu contador. `Copiar chave` · `Baixar XML`.

Regras de apresentação:

- A venda vinculada mostra o mesmo painel (resumido) no lugar do chip "Autorizada" quando o operador tenta cancelar a venda. O erro atual `"Cancele o documento fiscal da venda antes de cancelar o pedido."` passa a vir com `problema.alvo = VENDA` e a UI da venda abre o painel em vez de um toast.
- **Devolução autorizada libera a venda**: `process-confirmed-sale-cancellation.ts:39` passa a aceitar documento original `AUTORIZADO` quando existe documento de devolução `AUTORIZADO` apontando para ele (`documentoOrigemId`). Sem isso, o caminho recomendado não destrava nada.
- Estoque e financeiro da devolução seguem o fluxo de devolução de venda já existente; o painel explica que a devolução fiscal **não** mexe em estoque sozinha.

Outros casos de "não dá para cancelar":

| Situação | Apresentação |
|---|---|
| `ERRO` / `REJEITADO` | "Nada foi autorizado — não há o que cancelar." CTAs: corrigir problema (§4.1) ou `Inutilizar numeração` se há número reservado e o operador desistiu. |
| `EM_PROCESSAMENTO` | "Aguardando retorno do provedor há X min." CTA `Atualizar status`; após 15 min, aviso de possível travamento e link para o histórico. |
| `CANCELAMENTO_PENDENTE` | "Cancelamento solicitado às HH:MM, aguardando SEFAZ." CTA `Atualizar status`. |
| Sem permissão `fiscal.cancelar` | Botão presente, desabilitado, "Você não tem permissão para cancelar. Peça a um administrador." |
| Provedor `MANUAL` | Ações executam localmente; banner "Provedor manual: as ações registram o fato no sistema, não na SEFAZ." |

### 4.4 Superfícies da venda

- `FiscalStatusChip` vira **botão**: `Erro fiscal` / `Rejeitada` abrem um popover com o primeiro problema e sua CTA (mesmo mapeamento de §4.1) mais `Abrir documento`. `Autorizada` abre popover com XML/PDF e prazo de cancelamento restante.
- Lista de vendas: o botão `EMITIR NOTA FISCAL` continua, mas quando a venda tem documento em `ERRO`/`REJEITADO`, o rótulo vira `Resolver pendência fiscal` e abre o mesmo popover.
- `fiscal-health-block.tsx`: "Pendências" linka para `appRoutes.fiscal.document(id)` e mostra a `categoria`; "Motivos de rejeição" agrupa por `problema.codigo` (não só cStat) e cada linha leva à aba Pendências filtrada.
- Checkout (`FiscalEmissionSection`): quando a organização é capaz mas há `produtosSemPerfil` no carrinho, aviso antes de confirmar: "2 itens sem perfil fiscal — a nota vai falhar. `Cadastrar agora`". Evita o erro em vez de tratá-lo.

### 4.5 Sinalização proativa

- **Notificação in-app** para membros com `fiscal.emitir` quando uma emissão automática termina em `ERRO`/`REJEITADO` com problema não retentável. Uma por alvo por dia (não uma por venda), com deep link para a aba Pendências. Reutilizar a infraestrutura de notificações existente; se não houver, badge numérica no item "Fiscal" da sidebar alimentada por `resumo.documentos`.
- **E-mail diário** (aproveita `notifyFiscalIbptRefreshFailure` como modelo) para `emailFiscal` com o resumo de Pendências, apenas se `resumo.documentos > 0`.
- Badge na sidebar: contagem de `prazosExpirando` + `porAlvo`.

---

## 5. Fases de entrega

Cada fase é entregável sozinha e melhora o produto sem as seguintes.

### Fase 1 — Regras e dados (backend, ~1 sprint)

1. `lib/fiscal/constants.ts`: `FISCAL_DEFAULT_DEADLINES`; `fiscalConfiguracao.prazos` no schema Zod de settings + UI mínima na aba Configuração.
2. `lib/fiscal/document-actions.ts` + testes (`document-actions.test.ts`) cobrindo cada linha da tabela §2.3.
3. Rotas `cancel`/`correction`/`inutilize`/`return` chamam `resolveFiscalDocumentActions` e recusam com `motivoIndisponivel`.
4. `TFiscalProblem` + coluna `problemas`; `FiscalReadinessError` ganha `problema`; `toFiscalProblems` cobre prontidão, motor, SEFAZ (catálogo com `alvo`), provedor.
5. GET `/api/fiscal/documents` devolve `acoes` e `problemas`; script de backfill converte `mensagens`/`codigoRejeicao` existentes em `problemas` best-effort.
6. `process-confirmed-sale-cancellation.ts` aceita devolução autorizada como liberação.

### Fase 2 — Documento acionável (frontend fiscal, ~1 sprint)

1. Barra de ações alimentada por `acoes` (card + modal), com motivos visíveis, prazo e contador.
2. Quatro modais de operação substituindo `window.prompt`/`confirm`.
3. Seção "O que fazer agora" + painel de cancelamento indisponível (§4.3).
4. Chips de problema no card com CTA; `FiscalProfileMenu` aberto a partir do fiscal com `produtoId`.
5. POST `/api/fiscal/documents/retry` (lote) + botão `Reenviar`.

### Fase 3 — Pendências e prevenção (~1 sprint)

1. GET `/api/fiscal/pending` + aba Pendências (§4.1) com agrupamento por alvo.
2. Aplicação de perfil fiscal em lote.
3. Aviso no checkout para itens sem perfil.
4. `FiscalStatusChip` e `fiscal-health-block` acionáveis; venda abre o painel fiscal ao tentar cancelar.

### Fase 4 — Sinalização (~½ sprint)

1. Notificação in-app / badge na sidebar.
2. E-mail diário de pendências para `emailFiscal`.
3. Histórico do documento legível: eventos `ERRO` de cancelamento/CC-e/inutilização com origem e autor.

---

## 6. Decisões tomadas (set/2026)

1. **Janelas por UF.** Padrão único em código (`FISCAL_DEADLINES` em `lib/fiscal/constants.ts`): NFC-e 30 min, NF-e 24h. Sem configuração por organização por enquanto; quando surgir a necessidade, o override entra em `fiscalConfiguracao` e a matriz de ações já recebe `prazos` como parâmetro.
2. **Cancelamento extemporâneo.** Confirmado na documentação da Spedy (`guides/cancelamento-correcao-inutilizacao`): a API não oferece o evento; fora da janela a saída é carta de correção ou devolução. Fica como orientação na UI, nunca como ação.
3. **Devolução libera a venda.** Implementado: `saleFiscalDocumentsAllowCancellation` em `lib/sales/sale-editability.ts` aceita a original `AUTORIZADO` quando existe devolução `AUTORIZADO` apontando para ela. Vale para o cancelamento da venda e para o sinal `cancelamentoExigeFiscal`.
4. **Quem é avisado.** Apenas membros com `fiscal.configurar` (mais `emailFiscal` da organização), por e-mail diário (`/api/cron/fiscal-pending-digest`, dias úteis 08:00 BRT) e pelo badge da sidebar. O alerta por falha individual continua indo só para o e-mail de bug report.
5. **Perfil fiscal por variante.** Continua fora: a emissão ignora perfis de variante (review de jul/2026, item 14) e a aba Pendências lista por produto.

## 7. O que este plano não cobre

- Motor tributário (CST/CSOSN por regime, ICMS por UF): fora de escopo; problemas `TRIBUTARIO` recebem CTA para o grupo tributário, não correção automática.
- NFS-e: continua sem emissão automática; ações seguem a mesma matriz, com `CARTA_CORRECAO` e `INUTILIZAR` indisponíveis.
- DF-e recebidos (inbound): superfície própria em compras; não muda aqui.
