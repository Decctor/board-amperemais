# Review da implementação — migração de integrações de fonte de dados

> Plano de referência: [`data-source-integrations-migration-plan.md`](./data-source-integrations-migration-plan.md)
>
> Branch revisada: `claude/data-source-integrations-migration-cxg43b`
>
> Intervalo revisado: `6f3b5673...c3574dfe` (83 arquivos, 1.835 adições e 783 remoções)
>
> Objetivo: registrar riscos para validação por outro agente. Este documento não afirma que todos
> os itens devam ser corrigidos sem antes reproduzir o cenário e confirmar a regra de produto.

## Resumo executivo

A implementação separa a proveniência das vendas por `integracaoId` e passa a percorrer as
conexões individualmente. Entretanto, a ampliação para múltiplas conexões — inclusive do mesmo
tipo — deixa algumas identidades ainda restritas ao escopo da organização ou não disponíveis no
momento em que a conexão é criada.

Os riscos mais relevantes encontrados são:

1. resolução global de webhooks com identidade garantida apenas dentro da organização;
2. deduplicação iFood inoperante durante a autorização, pois a conexão nasce sem merchants;
3. reconexão de Bling/iFood inacessível pela UI, criando nova proveniência para a mesma conta;
4. sincronizadores de catálogo sem discriminador de conexão;
5. fluxos OAuth sem a permissão exigida pelas demais rotas administrativas;
6. procedimento de reexecução do backfill incompatível com a FK `RESTRICT` após atribuir vendas.

---

## Achados de severidade alta

### 1. Webhooks podem resolver o tenant errado

#### Evidências

- A unicidade persistida é `(organizacaoId, tipo, refExterno)`:
  `services/drizzle/schema/integrations.ts:52-55`.
- O guard de identidade compara apenas integrações da mesma organização:
  `lib/integrations/data-sources.ts:127-143`.
- O webhook iFood carrega todas as conexões e seleciona o primeiro item que contém o merchant:
  `app/api/webhooks/ifood/route.ts:49-60`.
- O webhook LGPD da Nuvemshop consulta globalmente `tipo + refExterno` e usa `LIMIT 1`:
  `lib/integrations/nuvemshop/webhook-notifications.ts:39-48`.

#### Cenário

A mesma loja externa é vinculada a duas organizações, por erro operacional, migração ou por um
usuário que pertença às duas. O banco e o guard permitem esse estado.

#### Impacto

- No iFood, o webhook pode iniciar a importação para a primeira organização encontrada, causando
  ingestão no tenant errado.
- Na Nuvemshop, uma solicitação LGPD pode ser associada à organização errada.
- A escolha depende da ordem retornada pelo banco, não de uma regra de domínio explícita.

#### Validação sugerida

Confirmar se uma conta/loja externa pode legitimamente pertencer a mais de uma organização. Se não
puder, a identidade usada pelos webhooks precisa de garantia global. Se puder, o payload ou o
registro de webhook precisa conter outro discriminador inequívoco.

### 2. A deduplicação de conexões iFood não funciona durante a autorização

#### Evidências

- A autorização cria a configuração com `merchantIds: []`:
  `app/api/integrations/ifood/auth/complete/route.ts:41-50`.
- O guard detecta duplicidade iFood apenas pela interseção dos merchants:
  `lib/integrations/data-sources.ts:138-143`.
- A busca automática pela mesma conta também exige merchants em comum:
  `lib/integrations/data-sources.ts:178-189`.
- Os merchants são descobertos e persistidos posteriormente:
  `lib/integrations/ifood/context.ts:86-95`.
- Essa persistência posterior não executa novamente o guard de identidade.

#### Cenário

O usuário autoriza a mesma conta iFood duas vezes antes ou depois da descoberta dos merchants. Como
a nova configuração chega vazia, cada autorização pode criar uma linha ativa nova.

Também existe uma janela de concorrência: o guard e o `INSERT` são operações separadas em
`lib/integrations/data-sources.ts:253-289`, sem constraint capaz de expressar a sobreposição dos
IDs dentro do JSONB.

#### Impacto

- Duas linhas ativas podem terminar com os mesmos merchants.
- Seleção por merchant e resolução de webhook passam a depender da ordem das linhas.
- A listagem de lojas mascara o estado inválido ao deduplicar apenas a resposta em
  `app/api/integrations/ifood/merchants/route.ts:39-48`.

### 3. A UI não preserva a identidade ao reconectar Bling ou iFood

#### Evidências

- Settings renderiza somente conexões ativas:
  `components/Settings/SettingsIntegration.tsx:112`.
- O card ativo oferece apenas a ação de desconectar:
  `components/Settings/SettingsIntegration.tsx:313-374`.
- A entrada do Bling usa uma URL estática, sem `reconnectIntegrationId`:
  `components/Settings/SettingsIntegration.tsx:90,156-161`.
- O fluxo real do iFood envia somente `authorizationCode`:
  `app/dashboard/integrations/ifood/_module/connect/IfoodConnectMenu.tsx:42-48`.
- O backend suporta reconexão explícita, mas Bling não possui identidade automática e o iFood
  recém-autorizado ainda não possui merchants:
  `lib/integrations/data-sources.ts:154-192,229-255`.
- Uma venda existente pertencente a outro `integracaoId` é rejeitada:
  `lib/data-collecting-v2/sync-sales.ts:337-346`.

#### Cenário

Uma conexão Bling ou iFood é desativada e depois autorizada novamente pela interface disponível. A
autorização cria outra linha em vez de reativar a anterior.

#### Impacto

As vendas históricas continuam apontando para a integração desativada. Quando a nova linha importar
o mesmo `idExterno`, a proteção de proveniência rejeita a atualização. Pedidos históricos ou ainda
em andamento podem deixar de receber mudanças de status, cancelamentos e demais efeitos.

### 4. Múltiplas conexões podem sobrescrever o catálogo umas das outras

#### Evidências

- O cron percorre todas as integrações de catálogo:
  `app/api/cron/products-syncing/route.ts:26-39`.
- `syncProductsForIntegration` repassa apenas organização e configuração aos sincronizadores:
  `lib/data-connectors/catalog-sync.ts:17-45`.
- Cardápio Web casa produtos por organização + código/ID externo:
  `lib/data-connectors/cardapio-web/catalog-sync.ts:27-43`.
- Nuvemshop casa produtos por organização + código:
  `lib/data-connectors/nuvemshop/catalog-sync.ts:39-76`.
- `products` e suas entidades auxiliares não possuem `integracaoId`:
  `services/drizzle/schema/products.ts:21-55`.

#### Cenário

Duas lojas usam o mesmo SKU para produtos diferentes, ou duas fontes de catálogo compartilham
códigos sem compartilhar o mesmo significado.

#### Impacto

A última sincronização pode alterar nome, preço, estoque, variantes ou complementos importados pela
primeira conexão. A colisão pode ocorrer entre duas conexões do mesmo tipo ou entre Cardápio Web e
Nuvemshop.

#### Validação sugerida

Confirmar se o catálogo da organização deve ser deliberadamente convergente por SKU. Se não for,
será necessário definir proveniência ou uma camada explícita de conciliação de produtos.

### 5. Fluxos OAuth contornam a permissão de gerenciamento de integrações

#### Evidências

A API genérica exige `canManageIntegrations` em `app/api/integrations/route.ts:176-184`. Os fluxos
abaixo verificam apenas autenticação e vínculo com a organização:

- Bling: `app/api/integrations/bling/auth/route.ts:43-64` e callback em `:64-89`;
- Nuvemshop: `app/api/integrations/nuvemshop/auth/route.ts:10-32` e callback em `:22-91`;
- iFood: `app/api/integrations/ifood/auth/route.ts:34-41` e conclusão em
  `app/api/integrations/ifood/auth/complete/route.ts:70-94`;
- iFood sandbox: `app/api/integrations/ifood/sandbox/route.ts:33-48`.

#### Impacto

Um membro sem permissão para gerenciar integrações pode chamar diretamente esses endpoints e criar
ou substituir conexões da organização.

### 6. O backfill não é rerodável no cenário documentado de token rotativo

#### Evidências

- A migration se declara rerodável e recomenda apagar previamente a linha iFood caso o token tenha
  rotacionado: `drizzle/0062_data_source_integrations_backfill.sql:1-6`.
- O `NOT EXISTS` impede atualizar uma linha criada pela execução anterior:
  `drizzle/0062_data_source_integrations_backfill.sql:28-35`.
- A mesma migration atribui as vendas à linha em `:37-56`.
- A FK de `sales.integracaoId` usa `ON DELETE RESTRICT`:
  `drizzle/0060_data_source_integrations_columns.sql:9-12`.

#### Impacto

Depois da primeira execução completa, o `DELETE` sugerido pode falhar porque as vendas já referenciam
a integração. Reexecutar sem apagar também não copia o token atualizado. Isso pode deixar o cutover
com um refresh token antigo.

---

## Achados de severidade média

### 7. Um webhook iFood dispara todas as integrações da organização

O webhook resolve apenas o `organizationId` e chama `runDataCollectingV2` para a organização inteira:
`app/api/webhooks/ifood/route.ts:98-117`.

O pipeline carrega e percorre todas as fontes ativas dela:
`lib/data-collecting-v2/index.ts:256-284`.

Assim, um evento de uma loja iFood pode provocar polling e refresh de todas as contas iFood e
também de Bling, Nuvemshop, Cardápio Web e Online Software. Isso amplifica chamadas, concorrência e
consumo de rate limit. O webhook já possui o merchant necessário para resolver a conexão exata.

### 8. `PATCH /api/integrations` pode reativar soft deletes sem as invariantes de reconexão

O schema aceita `ativo` para qualquer tipo em `app/api/integrations/route.ts:132-138` e escreve o
valor diretamente em `:141-171`.

Definir `ativo: true` dessa forma:

- não limpa `dataDesativacao`;
- não valida credenciais;
- não limpa `status`/`ultimoErro`;
- não executa o guard de identidade;
- pode reativar uma conexão duplicada ou com token revogado.

### 9. Refresh de token possui corrida de lost update

Os refreshes sobrescrevem o JSON completo, sem lock, versão ou compare-and-swap:

- iFood: `lib/data-connectors/ifood/client.ts:126-153`;
- Bling: `lib/data-connectors/bling/client.ts:136-158`.

A descoberta de merchants do iFood também sobrescreve a configuração completa:
`lib/integrations/ifood/context.ts:86-95`.

Cron, webhook e tela de gestão podem operar simultaneamente sobre snapshots antigos. Uma escrita
pode restaurar um refresh token já rotacionado ou apagar merchants recém-descobertos.

### 10. Colisões de venda são persistidas como sincronização bem-sucedida

O pipeline adiciona colisões ao resultado em `lib/data-collecting-v2/index.ts:287-294`, mas depois
grava `status: CONECTADO` e limpa `ultimoErro` em `:306-311`. A ocorrência não permanece visível no
estado da integração.

Além disso, entidades auxiliares são sincronizadas antes de verificar as colisões:
`lib/data-collecting-v2/index.ts:175-178`. Um lote composto por uma venda rejeitada ainda pode criar
ou atualizar cliente, produto, vendedor ou parceiro, apesar da descrição de que o item é ignorado
sem efeitos.

### 11. Custo adicional em toda validação de sessão

Cada validação de sessão passou a executar uma consulta separada para carregar todas as integrações
da organização em `lib/authentication/session.ts:12-26`, chamada nos dois caminhos de montagem da
sessão em `:122` e `:164`.

Como `getCurrentSessionUncached` é usado amplamente nas APIs, isso introduz um round-trip de banco
em requisições que não utilizam integrações. Soft deletes também permanecem no resumo, fazendo o
custo crescer com o histórico de conexões.

---

## Lacunas de cobertura e validações executadas

Não foram encontrados testes automatizados novos para os invariantes centrais desta migração:

- duas conexões do mesmo tipo;
- mesma identidade externa em organizações distintas;
- autorização repetida ou concorrente;
- reconexão preservando `integracaoId`;
- colisão de catálogo entre conexões;
- seleção da conexão correta pelo webhook;
- concorrência no refresh de token.

Validações executadas durante o review:

- `git diff --check 6f3b5673...HEAD`: passou;
- `npm run lint`: encerrou com código zero, com 761 warnings no repositório;
- `npx tsc --noEmit`: falhou com diversos erros distribuídos pelo repositório, portanto o typecheck
  atual não serviu como gate confiável para isolar regressões desta implementação;
- working tree permaneceu limpa durante a inspeção.

## Ordem sugerida para triagem

1. Reproduzir identidade duplicada/cross-tenant nos webhooks.
2. Autorizar a mesma conta iFood duas vezes e observar a descoberta posterior dos merchants.
3. Desconectar e reconectar uma conta Bling/iFood com vendas históricas.
4. Sincronizar dois catálogos com o mesmo SKU e dados divergentes.
5. Chamar os endpoints OAuth com um usuário sem `integracoes.gerenciar`.
6. Ensaiar a sequência 0059 → 0060 → 0062, rotacionar o token legado e executar o procedimento de
   recuperação descrito na 0062.
7. Só então classificar os demais itens de concorrência, observabilidade e desempenho.

---

## Triagem e disposição (pós-review)

> Adicionado após a validação dos achados. Cada item foi classificado e, quando real, corrigido na
> própria branch.

| # | Achado | Veredito | Disposição |
|---|---|---|---|
| 1 | Webhooks podem resolver o tenant errado | **Parcial — pré-existente** | A mesma ambiguidade existia no modelo antigo (scan de orgs por `integracaoTipo`); o unique de `refExterno` é por organização de propósito (D5 é guard de identidade intra-org). Uma conta em duas orgs é estado operacional inválido. **Mitigado**: os dois webhooks agora fazem desempate determinístico (conexão mais antiga) e logam warning quando encontram mais de um match. Constraint global = decisão de produto (novo risco R16 no plano). |
| 2 | Dedup iFood inoperante na autorização | **Real — corrigido** | `auth/complete` agora descobre os `merchantIds` imediatamente após a troca do token (como o sandbox já fazia) — o guard D5 e o auto-match de reconexão (D9) passam a funcionar na criação. Falha na descoberta não bloqueia a conexão (o resolver backfilla depois e agora LOGA colisão de merchants com outra linha ativa). A janela de concorrência guard→INSERT permanece (sem constraint exprimível sobre o JSONB) — risco residual aceito para um fluxo de UI single-user. |
| 3 | UI não preserva identidade ao reconectar | **Real — corrigido** | Settings agora lista as conexões desativadas com ação explícita RECONECTAR: Bling → `?reconnectIntegrationId` no OAuth; iFood → menu com `reconnectIntegrationId` no complete (e o auto-match por merchants do item 2 cobre o fluxo sem id); Nuvemshop → auto-match por storeId; manuais → `ConfigureIntegration` com alvo explícito. |
| 4 | Catálogo sem discriminador de conexão | **Real — follow-up de produto** | Convergência por SKU é a modelagem vigente (pré-existente); proveniência de catálogo exigiria coluna + camada de conciliação. Registrado como risco R15 + follow-up em §4/§8 do plano; sem código nesta entrega. |
| 5 | OAuth sem `canManageIntegrations` | **Real — corrigido** | Todos os fluxos (Bling auth/callback, Nuvemshop auth/callback, iFood userCode/complete, sandbox) agora exigem a permissão. (Pré-existente: os fluxos antigos também não checavam — mas a correção é barata e alinha com o POST/DELETE.) |
| 6 | Backfill não re-rodável com token rotacionado | **Real — corrigido** | A 0062 ganhou o passo 1b: UPDATE que re-copia o jsonb da org para linhas já criadas, guardado por `data_ultima_sincronizacao IS NULL` (só pré-cutover — nunca sobrescreve token novo da linha com token velho da org). O procedimento com DELETE foi removido do cabeçalho. |
| 7 | Webhook dispara todas as integrações da org | **Real — corrigido** | `runDataCollectingV2` aceita `integrationIds`; o webhook resolve merchant → conexão e restringe o run àquela linha. |
| 8 | PATCH reativa soft delete sem invariantes | **Real — corrigido** | Para tipos de fonte de dados, ativar via PATCH valida a config, roda o guard de identidade (D5) e limpa `dataDesativacao`; desativar carimba `dataDesativacao` (D9). Credencial não é revalidada — o próximo run marca ERRO/EXPIRADO. |
| 9 | Lost update no refresh de token | **Parcial — mitigado** | O maior clobber (descoberta de merchants sobrescrevendo a config inteira) virou patch cirúrgico via `jsonb_set`. O refresh em si segue write-last-wins — mesmo risco pré-existente, explicitamente aceito no plano (R9, "refresh condicional é hardening opcional"). |
| 10 | Colisões persistidas como sync bem-sucedido | **Parcial — corrigido** | Run com colisões continua `CONECTADO` (a conexão funciona), mas grava a ocorrência em `ultimoErro` até um run limpo. Entidades auxiliares antes da checagem: comportamento aceito e documentado — são cadastros reais da organização, upserts idempotentes; a colisão bloqueia a venda e seus efeitos. |
| 11 | Custo extra na validação de sessão | **Aceito** | Uma SELECT indexada de colunas leves entre as 3–4 queries que a validação já faz; as linhas desativadas são necessárias para a UI de reconexão. Otimização (join na query de membership / cache) fica para quando houver medição que a justifique. |
| — | Ausência de testes automatizados | **Norma do repo** | O repositório não possui framework de testes (os `test:*` do package.json são scripts tsx manuais). A validação segue a matriz de aceite da Fase 2 do plano (staging). |
