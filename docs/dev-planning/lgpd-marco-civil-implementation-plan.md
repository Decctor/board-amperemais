# Plano de Implementação — LGPD e Marco Civil da Internet

**Status:** Planejado  
**Prioridade:** Alta  
**Escopo:** RecompraCRM (aplicação, banco de dados, storage, integrações e documentos legais)  
**Origem:** Auditoria técnica e documental realizada em 12/07/2026  
**Responsáveis sugeridos:** Engenharia, Segurança/Infraestrutura, Produto e Jurídico/DPO

## 1. Objetivo

Adequar o comportamento técnico e os documentos públicos do RecompraCRM às obrigações aplicáveis da Lei nº 13.709/2018 (LGPD), da Lei nº 12.965/2014 (Marco Civil da Internet), das Resoluções CD/ANPD nº 15/2024 e nº 19/2024 e dos contratos firmados com clientes e subprocessadores.

O plano busca produzir conformidade demonstrável. Cada controle deve possuir implementação, responsável, evidência verificável, procedimento operacional e regra de manutenção.

## 2. Premissas e decisões registradas

### 2.1. Natureza do serviço

- O RecompraCRM atua como **controlador** dos dados necessários à contratação, cobrança, administração de contas, segurança, suporte e evolução do próprio serviço.
- Em regra, atua como **operador** dos dados de clientes finais, vendedores e consumidores tratados por instrução das organizações clientes.
- Alguns tratamentos podem gerar controladoria independente ou conjunta, especialmente analytics próprios, prevenção a fraude, inteligência de produto e integrações em que o RecompraCRM define elementos essenciais. O inventário deverá classificar cada operação individualmente.

### 2.2. Credenciais presentes em logs

Foi decidido **não rotacionar preventivamente as credenciais** registradas em logs porque não há evidência minimamente razoável de acesso indevido e o acesso aos logs de servidor está restrito ao proprietário da operação.

Essa decisão não elimina as correções preventivas:

- remover imediatamente tokens, códigos de magic link e dados pessoais desnecessários dos novos logs;
- confirmar e documentar quem possui acesso aos logs e os controles aplicados;
- definir retenção e descarte dos logs históricos;
- registrar esta decisão, sua justificativa, data e responsável no registro interno de riscos;
- reconsiderar rotação e resposta a incidente se surgirem evidências de acesso por terceiros, compartilhamento de logs, comprometimento de conta ou retenção em outro fornecedor.

**Critério de escalonamento:** qualquer indício de acesso não autorizado deverá acionar o procedimento de resposta a incidentes, incluindo avaliação de risco ou dano relevante e eventual comunicação nos termos da Resolução CD/ANPD nº 15/2024.

### 2.3. Limites deste plano

O código não comprova sozinho configurações de RLS, localização de dados, TLS, backups, contratos, cláusulas internacionais, controles de acesso dos provedores ou certificações. Esses itens exigem evidência operacional externa.

## 3. Ordem de execução

| Fase | Prazo sugerido | Objetivo |
| --- | --- | --- |
| Fase 0 | 0–7 dias | Conter exposições técnicas e afirmações legais incorretas |
| Fase 1 | 1–4 semanas | Implantar direitos dos titulares, cookies, retenção e controle de acesso |
| Fase 2 | 1–2 meses | Formalizar inventário, fornecedores, transferências e resposta a incidentes |
| Fase 3 | 2–3 meses | Consolidar governança, DPA, RIPD, testes e evidências contínuas |

## 4. Fase 0 — Contenção imediata

### LGPD-001 — Saneamento centralizado de logs

**Risco tratado:** tokens de autenticação, códigos de magic link, dados pessoais e payloads completos em logs de aplicação, navegador e integrações.

**Implementação:**

1. Criar um logger central em `lib/logger/` com níveis, contexto estruturado e redaction recursiva.
2. Proibir o registro dos campos `token`, `code`, `authorization`, `cookie`, `password`, `senha`, `accessToken`, `refreshToken`, `email`, `telefone`, `cpf`, `cnpj`, conteúdo de mensagens e payloads brutos.
3. Permitir identificadores técnicos apenas quando necessários, preferencialmente truncados ou hasheados.
4. Substituir `console.log/error/warn` nos fluxos de autenticação, clientes, PDI, campanhas, organizações, produtos, WhatsApp e callbacks OAuth.
5. Remover logs de datasets no frontend, pois ficam disponíveis no dispositivo do usuário.
6. Configurar o handler global de API para registrar tipo, rota, status, correlation ID e erro sanitizado, sem body ou objeto bruto.
7. Adicionar regra de lint ou verificação CI que bloqueie padrões conhecidos de log de segredos.

**Arquivos iniciais:**

- `app/auth/magic-link/actions.ts` ou arquivo equivalente dos fluxos de magic link;
- `lib/app-api.ts`;
- `app/api/clients/route.ts`;
- `app/api/point-of-interaction/new-client/route.ts`;
- `app/api/point-of-interaction/new-transaction/route.ts`;
- `app/api/campaigns/route.ts`;
- `app/api/products/route.ts`;
- `app/api/organizations/route.ts`;
- `app/api/integrations/nuvemshop/auth/callback/route.ts`;
- `app/dashboard/commercial/clients/bulk-insert/_components/bulk-insert-preview-stage.tsx`.

**Aceite:**

- nenhum token ou código aparece em logs em testes de login e magic link;
- nenhuma importação de clientes é impressa no console do navegador;
- testes unitários comprovam redaction de objetos aninhados e erros Axios;
- busca automatizada lista exceções restantes e cada exceção possui justificativa.

### LGPD-002 — Privatização de arquivos e mídias

**Risco tratado:** acesso público a mídias de chats, documentos e relatórios.

**Implementação:**

1. Inventariar os buckets e policies reais no Supabase.
2. Criar prefixes/buckets privados por categoria: chat, relatório, importação, fiscal e arquivos genéricos.
3. Substituir `getPublicUrl` por URLs assinadas com duração curta.
4. Criar endpoint autenticado que valide sessão, `organizacaoId`, vínculo com a entidade e permissão antes de emitir a URL.
5. Para páginas públicas, usar ativos deliberadamente públicos em bucket separado, nunca o bucket de dados privados.
6. Migrar objetos existentes e invalidar URLs públicas antigas.
7. Criar rotina de exclusão associada ao registro pai e à matriz de retenção.

**Arquivos iniciais:**

- `lib/files-storage/index.ts`;
- `lib/files-storage/chat-media.ts`;
- `lib/reports/storage.ts`;
- `lib/fiscal/storage.ts`;
- migrations/policies do Supabase mantidas no repositório.

**Aceite:**

- uma URL sem assinatura retorna acesso negado;
- membro de outra organização não obtém URL assinada;
- URL expirada deixa de funcionar;
- exclusão do registro remove ou agenda remoção do objeto;
- ativos públicos continuam funcionando em armazenamento segregado.

### LGPD-003 — Bloqueio de analytics não essencial antes do consentimento

**Implementação:**

1. Desabilitar a inicialização automática do PostHog.
2. Inicializar o SDK somente depois de uma preferência válida para analytics.
3. Configurar privacy defaults explicitamente: autocapture, session recording, mascaramento, perfis pessoais, persistência e cookies.
4. Não identificar visitantes anônimos desnecessariamente.
5. Implementar `opt_in_capturing`, `opt_out_capturing` e limpeza dos identificadores quando houver revogação.
6. Impedir eventos server-side não essenciais quando a preferência aplicável não existir.

**Arquivos iniciais:**

- `instrumentation-client.ts`;
- `lib/analytics/posthog-client.ts`;
- `lib/analytics/posthog-server.ts`;
- `app/layout.tsx`;
- novo provider de preferências de privacidade.

**Aceite:** nenhuma chamada ou cookie do PostHog antes de aceite; rejeição e revogação funcionam; preferências são versionadas e auditáveis.

### LEGAL-001 — Correções emergenciais da página legal

**Implementação:**

1. Substituir `new Date()` por versão e data editorial fixas.
2. Inserir razão social, CNPJ, endereço e canais oficiais.
3. Remover ou marcar como condicionais afirmações técnicas ainda não comprovadas, como AES-256, SOC 2, detecção de anomalias, pentests e exclusão permanente uniforme.
4. Corrigir o prazo de incidentes: operador comunica o controlador sem demora injustificada; controlador avalia comunicação à ANPD e titulares em até três dias úteis quando aplicável.
5. Não tratar certificações de segurança como mecanismo autônomo de transferência internacional.
6. Publicar histórico resumido de versões.

**Arquivo:** `app/(legal)/legal/page.tsx`.

**Aceite:** data só muda com revisão real; identificação empresarial completa; toda afirmação técnica possui evidência ou redação proporcional.

## 5. Fase 1 — Controles de produto

### LGPD-004 — Portal e workflow de direitos dos titulares (DSAR)

**Direitos suportados:** confirmação, acesso, correção, portabilidade, informação sobre compartilhamento, anonimização, bloqueio, eliminação, revogação, oposição, revisão de decisão automatizada e petição/reclamação.

**Modelo de dados sugerido:**

- `data_subject_requests`: id, tipo, origem, titular, organização relacionada, status, prazo, nível de risco, método de verificação, responsável, datas e versão do aviso;
- `data_subject_request_events`: histórico imutável de eventos e decisões;
- `data_subject_request_artifacts`: exportações e comprovantes com armazenamento privado e expiração;
- `data_subject_request_provider_tasks`: propagação e confirmação por subprocessador;
- evitar persistir documentos de identidade quando uma verificação menos invasiva for suficiente.

**Estados sugeridos:** `RECEBIDA`, `AGUARDANDO_VERIFICACAO`, `EM_ANALISE`, `AGUARDANDO_CONTROLADOR`, `EM_EXECUCAO`, `CONCLUIDA`, `RECUSADA`, `CANCELADA`.

**Implementação:**

1. Substituir o simples envio de e-mail por persistência e protocolo.
2. Adicionar rate limit e proteção antiabuso.
3. Implementar verificação proporcional de identidade.
4. Distinguir pedidos relativos à própria conta dos pedidos de clientes finais de uma organização.
5. Quando operador, notificar e cooperar com o controlador sem abandonar o pedido.
6. Criar console administrativo com prazo, responsável, comentários internos e evidências.
7. Gerar pacote de acesso/exportação em storage privado com validade curta.
8. Implementar exclusão/anonimização transacional e tarefas para terceiros.
9. Registrar justificativa legal para retenções obrigatórias ou recusas.
10. Enviar respostas por templates controlados e manter prova do envio.

**Integração Nuvemshop:** converter `customers/data_request`, `customers/redact` e `store/redact` em solicitações idempotentes, sem encaminhar payload integral por e-mail.

**Aceite:** testes E2E para acesso, correção e exclusão; protocolo e histórico; prazo monitorado; execução idempotente; evidência de propagação.

### LGPD-005 — Matriz e automação de retenção

Criar `docs/privacy/data-retention-matrix.md` com, no mínimo:

| Categoria | Finalidade | Base/justificativa | Início do prazo | Prazo | Destino | Exceções | Responsável |
| --- | --- | --- | --- | --- | --- | --- | --- |

Cobrir contas, clientes finais, vendas/fiscal, chats, mídias, campanhas, consentimentos, sessões, magic links, logs, analytics, exports, backups, tokens de integração, tickets e webhooks.

**Implementação técnica:**

- jobs idempotentes de purge/anonimização;
- modo dry-run e relatório por execução;
- legal hold para obrigação legal, processo ou defesa de direitos;
- descarte de sessões e magic links expirados;
- propagação para storage e subprocessadores;
- política específica para backups e restaurações;
- métrica e alerta para falhas.

**Aceite:** cada promessa da política possui job ou procedimento correspondente; execuções geram evidência; dados sob legal hold não são eliminados indevidamente.

### LGPD-006 — Consentimento e preferências de comunicação

**Modelo sugerido:** preferências por titular, organização, canal, finalidade, status, fonte, texto/versão, data, prova e revogação.

Separar:

- aceite contratual dos Termos;
- ciência do Aviso de Privacidade;
- consentimentos opcionais;
- opt-in/opt-out de WhatsApp, e-mail e publicidade;
- cookies e analytics;
- eventual legítimo interesse documentado, sem simular consentimento.

**Aceite:** campanhas consultam a preferência vigente; opt-out bloqueia novos envios; prova é exportável; retirada é tão simples quanto concessão.

### SECURITY-001 — Allowlist de dados e permissões granulares

1. Alterar `/api/users` para selecionar exclusivamente campos públicos/necessários.
2. Nunca retornar senha, access token ou refresh token por endpoints genéricos.
3. Criar permissão específica para exportação de clientes.
4. Registrar autor, organização, filtros, quantidade e data de cada exportação.
5. Exigir step-up authentication em exportações completas e ações de alto risco.
6. Revisar permissões de leitura de chats, dados fiscais, integrações e dados sensíveis.

**Aceite:** testes negativos entre tenants; snapshots de resposta sem segredos; exportação negada sem permissão; auditoria registrada.

### SECURITY-002 — Criptografia de segredos de integração

- Criar serviço de envelope encryption com chave fora do banco.
- Criptografar refresh/access tokens de Google, Meta, Nuvemshop, iFood e demais integrações.
- Migrar valores existentes de forma reversível e auditável.
- Evitar selecionar configurações criptografadas fora dos serviços específicos.
- Definir rotação de chaves e procedimento de recriptografia.
- Manter tokens mascarados em UI e APIs.

**Aceite:** dump do banco não revela tokens; chaves não residem no banco; rotação é testada; falhas não imprimem plaintext.

### SECURITY-003 — Headers e baseline web

Adicionar, com testes de compatibilidade:

- Content-Security-Policy;
- Strict-Transport-Security;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy;
- proteção de framing por CSP `frame-ancestors`;
- política clara de CORS nas APIs aplicáveis.

Remover `typescript.ignoreBuildErrors` quando as pendências de tipagem estiverem resolvidas.

## 6. Fase 2 — Terceiros, transferências e Marco Civil

### LGPD-007 — Registro de operações de tratamento (ROPA)

Criar inventário versionado contendo:

- processo e produto;
- categorias de dados e titulares;
- finalidade;
- hipótese legal;
- origem;
- controlador, operador e suboperador;
- sistemas e destinos;
- compartilhamentos;
- país de tratamento;
- retenção;
- medidas de segurança;
- direitos aplicáveis;
- risco e necessidade de RIPD.

Priorizar CRM/clientes, RFM, WhatsApp, Meta Ads/CAPI/audiências, IA, fiscal, pagamentos, analytics, PDI e integrações ERP/e-commerce.

### LGPD-008 — Cadastro público de subprocessadores

Validar e documentar Supabase, Vercel, PostHog, Meta/WhatsApp, Resend, Stripe, Mux, Google, Nuvemshop, iFood, OpenAI e quaisquer serviços AWS, Google Cloud ou Convex efetivamente usados.

Para cada fornecedor registrar: entidade contratada, produto, papel, finalidade, dados, titulares, países, retenção, DPA, segurança, subcontratação, mecanismo internacional, procedimento de incidente e exclusão.

Publicar lista compatível com o DPA e criar processo de aviso de mudança material.

### LGPD-009 — Transferências internacionais

1. Mapear a localização real de cada tratamento.
2. Selecionar o mecanismo aplicável do art. 33 da LGPD.
3. Incorporar as cláusulas-padrão da Resolução CD/ANPD nº 19/2024 quando necessárias.
4. Documentar medidas suplementares e avaliação de risco.
5. Alinhar política, DPA e contratos.
6. Não apresentar ISO 27001 ou SOC 2 como fundamento jurídico da transferência.

### MCI-001 — Registros de acesso a aplicações

Definir tecnicamente o registro de acesso nos termos do Marco Civil, sem confundi-lo com analytics ou payloads funcionais.

**Implementação:**

- registrar data/hora e IP do uso da aplicação na medida exigida e necessária;
- avaliar arquitetura por trás de proxies e impedir spoofing de headers;
- armazenar os registros separadamente, sob acesso restrito e trilha de consulta;
- preservar pelo prazo legal aplicável de seis meses para o provedor organizado/profissional;
- excluir ao final do prazo, salvo ordem ou preservação válida;
- criar procedimento para ordens judiciais e pedidos de preservação;
- não registrar conteúdo de comunicações nesse repositório;
- documentar base, finalidade, segurança e responsáveis.

**Aceite:** teste demonstra criação, integridade, acesso restrito e purge; consulta aos logs é auditada; procedimento jurídico está aprovado.

### INCIDENT-001 — Plano de resposta a incidentes

Criar runbook com detecção, triagem, contenção, erradicação, recuperação, preservação de evidências, avaliação de risco/dano, decisão de comunicação, modelos e retrospectiva.

Requisitos:

- operador informa controlador sem demora injustificada;
- controlador comunica ANPD e titulares em três dias úteis quando aplicável;
- comunicações preliminar e complementar quando necessário;
- registro de incidentes por pelo menos cinco anos;
- matriz de severidade incluindo dados sensíveis, financeiros, autenticação, sigilo, menores e larga escala;
- contatos e substitutos definidos;
- simulação anual e revisão após incidente.

## 7. Fase 3 — Documentos e governança

### LEGAL-002 — Separação dos documentos

#### Termos de Uso

Incluir identificação das partes, formação do contrato, licença, uso permitido, planos, cobrança, SLA mensurável, suporte, suspensão, cancelamento, exportação, propriedade intelectual, responsabilidade proporcional, legislação, foro, mudanças e registro de aceite.

Evitar exclusões absolutas de responsabilidade e revisar compatibilidade com o CDC quando houver relação de consumo.

#### Aviso de Privacidade

Incluir categorias e fontes, finalidades e bases por operação, agentes, compartilhamentos, decisões automatizadas/RFM/IA, direitos, retenção, segurança em linguagem proporcional, transferências, cookies, encarregado e canal de atendimento.

#### DPA

Incluir objeto, duração, natureza, dados/titulares, instruções, confidencialidade, segurança, subprocessadores, transferências, titulares, auditoria, incidentes, devolução/exclusão/backups, cooperação, responsabilidade e anexos.

#### Anexos

- lista de subprocessadores;
- medidas técnicas e organizacionais;
- SLA;
- matriz de transferências;
- política de cookies;
- histórico de versões.

### LEGAL-003 — Aceite versionado

Criar tabela de aceites com documento, versão, hash do conteúdo, data, usuário, organização, autoridade declarada e evidência técnica proporcional. Mudanças materiais exigem novo aceite destacável; consentimentos opcionais não podem ser agrupados ao contrato.

### LGPD-010 — IA, RFM e decisões automatizadas

1. Inventariar modelos, prompts, dados enviados, outputs, provedores e retenção.
2. Classificar quando há decisão automatizada que afeta interesses do titular.
3. Explicar critérios gerais, efeitos e salvaguardas sem revelar segredo comercial indevidamente.
4. Criar contestação e revisão humana quando aplicável.
5. Bloquear envio de conteúdo pessoal desnecessário a modelos externos.
6. Definir política de treinamento, opt-out e retenção contratual dos provedores.
7. Elaborar RIPD para tratamentos de maior risco.

### GOVERNANCE-001 — Programa contínuo

- nomear e publicar encarregado e substituto;
- manter canal funcional e SLA interno;
- registrar decisões de legítimo interesse e testes de balanceamento;
- treinar equipe com acesso a dados;
- revisão anual do ROPA, DPA, fornecedores e retenção;
- revisão de privacidade em novas features;
- pentest periódico e gestão de vulnerabilidades;
- evidências de backup/restore, acesso, segregação e continuidade;
- painel de métricas: DSARs, prazos, incidentes, purges, acessos privilegiados, exports e fornecedores vencidos.

## 8. Estratégia de testes

### Testes automatizados

- redaction de logs e erros;
- isolamento entre organizações;
- allowlist de respostas;
- permissões de exportação;
- consentimento antes de analytics;
- revogação e opt-out;
- URLs assinadas e expiração;
- jobs de retenção em dry-run e execução;
- idempotência de webhooks e DSAR;
- aceite e hash de versões legais.

### Testes de segurança

- IDOR entre organizações;
- enumeração e abuso do endpoint de titulares;
- exposição de storage;
- vazamento de tokens em logs e responses;
- CSP e XSS;
- exportação massiva;
- acesso privilegiado e revogação de sessão;
- restore de backup sem reintroduzir dados já eliminados.

### Validações operacionais

- restore de backup;
- simulação de incidente;
- atendimento completo de um pedido fictício;
- eliminação ponta a ponta em banco, storage e fornecedor;
- revisão de contratos e localização dos subprocessadores.

## 9. Definition of Done global

Uma iniciativa deste plano só está concluída quando:

- código e migrations foram revisados;
- testes automatizados e manuais passaram;
- autorização e isolamento multi-tenant foram validados;
- documentação operacional foi publicada;
- responsável e periodicidade foram definidos;
- evidência foi armazenada;
- política/DPA foram atualizados quando o comportamento público mudou;
- riscos residuais e exceções foram formalmente aceitos.

## 10. Entregáveis

- logger com redaction e política de logs;
- storage privado e serviço de URLs assinadas;
- consent manager e política de cookies;
- portal/workflow DSAR;
- matriz de retenção e jobs de purge;
- registro de consentimentos e preferências;
- criptografia de tokens;
- ROPA e RIPDs prioritários;
- inventário de subprocessadores e transferências;
- registro de acesso aderente ao Marco Civil;
- plano de resposta a incidentes;
- Termos, Aviso de Privacidade e DPA separados e versionados;
- registro de aceite;
- pacote de evidências e rotina de revisão.

## 11. Dependências e decisões que exigem validação externa

- identidade jurídica completa do fornecedor e do encarregado;
- classificação controlador/operador por processo;
- bases legais e testes de legítimo interesse;
- aplicabilidade do CDC e limites de responsabilidade;
- contratos e DPAs com fornecedores;
- localização e mecanismo de transferência internacional;
- policies reais de Supabase/RLS e storage;
- retenção de backups, logs da Vercel e analytics;
- conteúdo final das cláusulas-padrão e do DPA;
- necessidade e escopo dos RIPDs.

## 12. Backlog resumido

| ID | Item | Prioridade | Dependência |
| --- | --- | --- | --- |
| LGPD-001 | Redaction e política de logs | P0 | Nenhuma |
| LGPD-002 | Storage privado | P0 | Inventário Supabase |
| LGPD-003 | Consent gating do PostHog | P0 | UX de consentimento |
| LEGAL-001 | Correções emergenciais legais | P0 | Dados da empresa/jurídico |
| LGPD-004 | Workflow DSAR | P1 | Modelo e operação |
| LGPD-005 | Retenção e purge | P1 | Inventário/backup |
| LGPD-006 | Preferências por canal | P1 | Campanhas e integrações |
| SECURITY-001 | Allowlists e export permissions | P1 | Permissões existentes |
| SECURITY-002 | Criptografia de tokens | P1 | Gestão de chaves |
| SECURITY-003 | Headers de segurança | P1 | Testes frontend |
| LGPD-007 | ROPA | P1 | Jurídico/DPO |
| LGPD-008 | Subprocessadores | P1 | Contratos |
| LGPD-009 | Transferências internacionais | P1 | ROPA/fornecedores |
| MCI-001 | Registros de acesso | P1 | Infra/jurídico |
| INCIDENT-001 | Resposta a incidentes | P1 | Responsáveis definidos |
| LEGAL-002 | Termos, Aviso e DPA | P2 | Controles anteriores |
| LEGAL-003 | Aceite versionado | P2 | Documentos finais |
| LGPD-010 | IA/RFM e RIPD | P2 | Inventário de IA |
| GOVERNANCE-001 | Programa contínuo | P2 | DPO e processos |

## 13. Referências normativas

- Lei nº 13.709/2018 — LGPD, especialmente arts. 6, 7, 9–11, 16, 18–20, 33–41 e 46–50;
- Lei nº 12.965/2014 — Marco Civil da Internet, especialmente arts. 7, 10, 11 e 15;
- Resolução CD/ANPD nº 15/2024 — comunicação de incidentes de segurança;
- Resolução CD/ANPD nº 19/2024 — transferências internacionais e cláusulas-padrão;
- Guia Orientativo da ANPD sobre Cookies e Proteção de Dados Pessoais;
- Guia Orientativo da ANPD sobre Agentes de Tratamento e Encarregado.

