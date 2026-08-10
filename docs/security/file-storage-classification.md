# Classificação de arquivos e armazenamento

Use esta matriz antes de adicionar qualquer upload. O padrão para dados operacionais é privado; um arquivo só deve ser público quando sua própria finalidade exige acesso anônimo.

| Classe                         | Exemplos                                                | Acesso                                          | Implementação                                                                                               |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Segredo transitório            | certificado PFX/P12 e senha                             | nunca armazenar                                 | multipart autenticado, encaminhamento direto ao provedor e descarte após a requisição                       |
| Documento fiscal               | XML, DANFE e XML original de compra                     | privado por organização                         | bucket `private-files`, path opaco e download por rota autenticada com verificação de organização/permissão |
| Documento financeiro           | OFX, CSV, planilha, PDF ou imagem de extrato            | privado por organização                         | upload server-side e download autenticado; nunca gerar URL pública                                          |
| Mídia pública do catálogo      | imagem de produto/variante e logo da organização        | público                                         | bucket público e URL durável                                                                                |
| Material público institucional | imagens do site, blog, convites e instaladores públicos | público                                         | bucket público e path estável                                                                               |
| Mídia de conversa              | anexos de WhatsApp/chat                                 | privado, salvo exigência temporária do provedor | migrar para bucket privado; entregar externamente com URL assinada curta quando a integração exigir URL     |
| Material de comunidade         | aula/material restrito                                  | privado quando houver controle de matrícula     | migrar com rota autenticada ou URL assinada curta; manter público apenas conteúdo deliberadamente aberto    |
| Relatório                      | imagem/arquivo com métricas da organização              | privado, salvo canal externo explícito          | gerar URL assinada curta para envio; não manter URL pública permanente                                      |

## Regras

- Clientes do navegador não recebem chave elevada do Supabase e não escolhem paths privados.
- Todo path privado inclui escopo de organização ou é resolvido por uma entidade que já possui esse escopo.
- Downloads privados validam sessão, permissão e vínculo da entidade com a organização antes de ler o objeto.
- URLs assinadas são concessões temporárias, não identificadores persistidos como se fossem URLs públicas.
- Senhas, certificados e tokens não entram em banco, logs, analytics, nomes de arquivo ou metadados de Storage.
- Hash SHA-256 identifica o conteúdo importado sem expor seus bytes.

## Pendências de migração

Chat/WhatsApp, materiais de comunidade e relatórios ainda têm consumidores que podem depender de URLs públicas. A migração deve primeiro identificar cada consumidor externo, trocar a entrega por URL assinada de curta duração e somente então mover os objetos e bloquear escrita anônima no bucket público.

O corte de documentos fiscais e extratos está descrito no [plano de implementação](../dev-planning/audit-fixes-cert-costs-xml-plan.md). Migrações e backfills são executados manualmente pelo responsável do projeto.
