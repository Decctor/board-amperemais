# Fundação de acesso externo — estado da implementação

Registro do que já está implementado neste repositório a partir do plano `poi-mobile-react-native-plan.md` (§9, §10, §11 e Fase 7 parcial). Serve como guia de integração para o repositório `recompracrm-poi-mobile`.

## Visão geral

| Área | Estado |
| --- | --- |
| Schema + migrations (`access_*`, idempotência POI) | Implementado (`drizzle/0042`, `drizzle/0043`) |
| Autenticação externa e scopes (`lib/access/`) | Implementado |
| Enrollment, rotação, revogação, heartbeat (`/api/access/*`) | Implementado |
| Tela administrativa (aba DISPOSITIVOS em Configurações) | Implementado |
| Rotas POI em dual-mode + telemetria de chamadas legadas | Implementado |
| Idempotência de new-transaction + consulta de resultado | Implementado |
| Aplicativo mobile (ativação, SecureStore, diagnóstico, fluxo) | Pendente — repositório `recompracrm-poi-mobile` |
| Enforcement por organização e sunset do modo legado (Fase 7, etapas 3–5) | Pendente |

## Passos de deploy

1. Aplicar as migrations `drizzle/0042_access_foundation.sql` e `drizzle/0043_poi_transaction_idempotency.sql` (ou `npm run db:push`).
2. Rodar `npm run seed:access-clients` — upsert idempotente dos clientes nativos `RECOMPRA_POI_MOBILE` e `RECOMPRA_POI_WEB`.

## Modelo de dados

Em `services/drizzle/schema/access.ts` (tabelas prefixadas com `ampmais_`):

- `access_clients` — a aplicação conhecida pela plataforma. `escopos_permitidos` é o teto: nenhum grant de um principal deste cliente pode excedê-lo.
- `access_principals` — o ator concreto (tablet, kiosk, conta de serviço). Sempre single-tenant (`organizacao_id NOT NULL`); `loja_id` reservado para o vínculo com loja.
- `access_credentials` — ciclo de vida independente do principal; `hash_segredo` é SHA-256 do segredo, `id_publico` localiza sem varrer hashes, `substituida_por_id` encadeia rotações.
- `access_grants` — scopes concedidos explicitamente, únicos por `(principal_id, scope)`, correspondência por igualdade exata (sem wildcards).
- `access_enrollment_challenges` — desafio temporário de ativação (hash do código, TTL, usos limitados).
- `access_events` — auditoria: enrollment (conclusão/falha), falhas de autenticação, criação/rotação/revogação de credencial, chamadas POI em modo legado (`CHAMADA_POI_LEGADO`).

Idempotência POI em `services/drizzle/schema/poi-transaction-requests.ts`: `poi_transaction_idempotency_requests`, única por `(organizacao_id, idempotency_key)`, com `payload_hash`, `status` (`PROCESSANDO`/`CONCLUIDO`/`ERRO`) e `resposta` persistida para replay.

## Credenciais

Formato do token (exibido uma única vez):

```text
rcm_<live|test>_<dvc|key>_<id-publico>_<segredo>
```

Verificação por requisição: lookup indexado por `id_publico` + SHA-256 do segredo comparado em tempo constante. Sem cache de autenticação — revogação tem efeito imediato. Rotação cria nova credencial e mantém a anterior válida por 24h de sobreposição.

## Fluxo de ativação (enrollment)

1. Administrador (permissão `empresa.editar`) gera o código na aba **DISPOSITIVOS** de Configurações, ou via `POST /api/access/enrollments` com `{ accessClientCodigo, nomeSugerido? }`. Código de 10 caracteres (`XXXXX-XXXXX`), TTL padrão de 15 minutos, uso único.
2. O dispositivo chama, sem autenticação:

```http
POST /api/access/enrollments/consume
Content-Type: application/json

{ "code": "ABCDE-FGHJK", "nome": "Tablet do balcão", "metadados": { "plataforma": "android", "versaoApp": "1.0.0", "modelo": "...", "fabricante": "..." } }
```

Resposta (`data`): `{ token, principal: { id, nome, organizacaoId }, scopes }`. O `token` é retornado uma única vez — guardar no SecureStore. O endpoint é protegido por rate limiting (falhas por IP) e as falhas geram `access_events`.

3. Chamadas seguintes:

```http
Authorization: Bearer rcm_live_dvc_..._...
X-POI-Device-Version: 1.0.0
X-POI-Platform: android
```

## Endpoints para o aplicativo

Gestão do vínculo (qualquer principal autenticado):

- `POST /api/access/heartbeat` — registra contato/versão; retorna principal, organização e scopes vigentes. Usar para a tela de diagnóstico e verificação de vínculo.
- `POST /api/access/credentials/rotate` — auto-rotação com a credencial vigente; retorna o novo token (uma única vez). A anterior expira em 24h.

Operação POI (exigem o scope indicado; a organização deriva do principal — não enviar `orgId`):

| Endpoint | Scope |
| --- | --- |
| `GET /api/point-of-interaction/configuration` | `poi:configuration:read` |
| `GET /api/clients/lookup?phone=...` (ou `clientId=...`) | `poi:clients:read` |
| `POST /api/point-of-interaction/new-client` | `poi:clients:create` |
| `GET /api/point-of-interaction/coupons/available?clienteId=...&valorVenda=...` | `poi:coupons:read` |
| `POST /api/point-of-interaction/new-transaction` | `poi:transactions:create` |
| `GET /api/point-of-interaction/transactions/result?idempotencyKey=...` | `poi:transactions:create` |

`GET /api/point-of-interaction/configuration` retorna a identidade visual da organização (nome, logo, cores, `poiConfirmacaoValorObrigatoria`) e o programa de cashback com os prêmios ativos — o bootstrap do app após a ativação.

## Idempotência de new-transaction

Contrato (plano §11):

1. Gerar um UUID no dispositivo ANTES da primeira tentativa e enviar em toda repetição:

```http
POST /api/point-of-interaction/new-transaction
Idempotency-Key: <uuid-da-operacao>
```

2. Comportamento do backend:
   - Chave nova → processa e persiste a resposta.
   - Mesma chave + mesmo payload, já concluída → devolve a resposta original (não cria outra venda).
   - Mesma chave + payload diferente → `409` definitivo ("chave já usada com outra transação").
   - Mesma chave ainda em processamento (inclusive corrida entre repetições) → `409` retryável com a mensagem "ainda está sendo processada" — repetir com a mesma chave, nunca tratar como falha da transação.
   - Tentativa anterior terminou em erro sem efeitos → a chave é liberada e a repetição processa normalmente.
3. Submissão incerta (timeout/queda após o envio): consultar `GET /api/point-of-interaction/transactions/result?idempotencyKey=...` — retorna `status` + `resposta` persistida (`404` se a chave nunca chegou ao backend, ou seja, é seguro repetir).

## Dual-mode e modo legado (POI web)

As rotas POI aceitam dois modos (`lib/access/poi-actor.ts`):

- **Autenticado**: `Authorization: Bearer rcm_...` → `ExternalActorContext`, scope obrigatório, organização derivada do principal. Se um `orgId` vier no payload por compatibilidade, precisa coincidir com o principal (`403` caso contrário).
- **Legado** (POI web atual): sem credencial, `orgId` no payload segue aceito. Cada chamada gera um `access_event` `CHAMADA_POI_LEGADO` com a rota e a organização — a telemetria que vai guiar o enforcement da Fase 7.

O modo mobile do cliente final (`transaction-requests/public`) permanece anônimo por design: a fronteira de segurança é a aprovação da equipe (plano §9.10).

## Pendências conhecidas

- Aplicativo mobile inteiro (repositório separado): ativação, SecureStore, client HTTP, fluxo de transação, diagnóstico.
- Fase 7, etapas 2–5: ativação do kiosk no navegador, flag `poi_exigir_dispositivo_autenticado` com degradação para aprovação, padrão para novas organizações e sunset do modo legado.
- Rate limiting do modo mobile do cliente final (`transaction-requests/public`).
- Grants administráveis além do enrollment (conceder/revogar scopes avulsos pela UI).
