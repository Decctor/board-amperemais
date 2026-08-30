# lib/files — catálogo de arquivos e primitivo de uploads

Dois primitivos, uma direção: **nenhuma feature deveria saber onde um arquivo vive nem falar com
o provedor de storage diretamente**. Este módulo é o único dono dessas duas responsabilidades.

## Os dois conceitos

**`files` (o ativo)** — `ampmais_files` é o catálogo durável: uma linha por objeto armazenado,
com provedor, bucket, caminho, visibilidade, mime sniffado, tamanho, `sha256` e metadados
(dimensões de imagem etc.). Entidades devem referenciar `files.id` (`arquivoId`), nunca guardar
caminho ou URL. A linha é o único lugar do banco que sabe onde os bytes vivem.

**`uploads` (a transação)** — `ampmais_uploads` registra COMO os bytes entraram: quem declarou a
intenção, o contrato de integridade (tamanho exato + SHA-256 opcional), o token do PUT (hash,
nunca em claro) e o ciclo de vida `AGUARDANDO → RECEBIDO → CONSUMIDO` (ou `EXPIRADO`, pela
varredura). Um upload recebido materializa uma linha em `files` (`arquivoId`).

## Arquivos do módulo

| Arquivo      | Responsabilidade                                                                        |
| ------------ | --------------------------------------------------------------------------------------- |
| `drivers.ts` | Interface `TStorageDriver` + driver Supabase. Todo byte entra e sai por aqui.           |
| `service.ts` | `storeFile` (única escrita no catálogo), `resolveFileUrl`, lookups, `sanitizeFileName`. |
| `inspect.ts` | Validação por bytes com decodificação COMPLETA (`sharp.stats()`), nunca só cabeçalho.   |
| `intake.ts`  | Registro de propósitos (`UPLOAD_PURPOSES`) + ciclo de vida do upload em duas etapas.    |

## O fluxo de upload em duas etapas (para agentes e clientes sem acesso ao provedor)

1. **Intenção** — `createUploadIntake({ proposito, tamanhoEsperadoBytes, sha256Esperado? })`
   devolve `uploadUrl` **same-origin** (`/api/uploads/[id]`) + token de uso único com validade.
   Same-origin é o ponto: ambientes de conector de IA só alcançam o nosso domínio; uma URL
   assinada do provedor volta 403 do proxy do cliente.
2. **Bytes** — `PUT /api/uploads/[id]` com `Authorization: Bearer <token>` e o corpo cru. O
   servidor confere token, janela, **tamanho exato** e **SHA-256** (se declarado), decodifica o
   conteúdo por completo e só então grava via `storeFile`. Um JPEG truncado tem cabeçalho válido
   e corpo cinza — o contrato de integridade existe porque isso aconteceu de verdade.
3. **Consumo** — a feature chama `consumeUpload` com o `uploadId` e registra o que consumiu
   (`consumo` jsonb). Upload é de uso único.

Novo propósito = nova entrada em `UPLOAD_PURPOSES` (intake.ts) + novo membro em
`UploadPurposeEnum` (schemas/enums.ts). O banco não muda (`proposito` é varchar, mesma decisão
do `tipo` de `action_approval_requests`). Candidatos já mapeados: planilhas de importação em
massa (clientes/vendas), mídia de chat, imagens de produto, extratos bancários, documentos
fiscais.

**Limite de corpo**: funções na Vercel aceitam ~4.5 MB de corpo — todo `maxBytes` de propósito
fica abaixo disso (upload maior que isso vai exigir PUT em partes; o modelo de status já
comporta, o transporte é extensão futura).

## URLs

- `resolveFileUrl(file)` resolve no momento da leitura, pelo driver do provedor da linha
  (pública ou assinada conforme `visibilidade`). **Nunca grave o resultado em banco.**
- `GET /api/files/[id]` é a URL estável: redireciona para a URL resolvida. É a forma que deve
  sair do nosso controle (mensagens enviadas, e-mails, JSON-LD) — sobrevive a troca de provedor
  retroativamente.

## Por que isso torna a troca de fornecedor um job de fundo

Sair do Supabase = adicionar o provedor em `storage_provider`, implementar um `TStorageDriver`
e rodar uma varredura que, por linha de `files`: baixa do provedor antigo → grava no novo →
**confere o `sha256`** → atualiza `{provedor, bucket, caminho}`. Entidades não são tocadas
(só conhecem o id) e toda leitura passa a resolver no provedor novo imediatamente. URLs antigas
já resolvidas por terceiros continuam apontando para o bucket antigo — mantenha-o read-only
durante a janela de depreciação, e minimize essas URLs usando `/api/files/[id]`.

## Estado atual vs. direção (o que ainda NÃO migrou)

Hoje o único consumidor é a mídia de template de mensagem via MCP
(`lib/message-templates/agent-media.ts` + `lib/agent-tools/tools/message-template-media.ts`).
Duas dívidas deliberadas, para migração oportunista:

1. **Rascunhos de template ainda guardam `conteudoMidiaCaminho` (string)**, não `arquivoId`.
   `validateAgentTemplateMedia` re-inspeciona o caminho por causa disso. A migração é trocar a
   coluna por FK em `files` e consumir o upload no attach do rascunho (em vez de no
   `complete_…`).
2. **Os demais fluxos de arquivo da plataforma não passam por aqui** — mídia de chat
   (`lib/files-storage/chat-media.ts`), agente desktop, materiais de comunidade, relatórios,
   imagem do iFood, uploads client-side (`lib/uploads/*`). Cada um deve migrar para
   `storeFile`/`resolveFileUrl` (e, quando fizer sentido, para um propósito de intake) quando
   for tocado; nenhuma feature nova deve importar cliente de storage diretamente.

A varredura de expirados (`sweepExpiredUploads`) ainda não está agendada em cron — agendar
quando o volume justificar; até lá uploads abandonados ficam `AGUARDANDO` com `dataExpiracao`
vencida e são recusados no PUT do mesmo jeito.
