# Plano de implementação — arquivos privados, custos de compra e XML

Estado: em implementação desde 2026-08-10.

Este plano é governado pelo [ADR-0001](../adr/0001-purchase-cost-composition-and-accounting-entry-lines.md) e pelo [guia de custos de compra](../domain/purchase-costing.md). Migrações de banco e backfills históricos serão preparados e executados separadamente pelo responsável do projeto; esta implementação altera os schemas Drizzle e o código, mas não cria nem aplica arquivos de migração.

## Decisões finais

- Certificados PFX/P12 são enviados diretamente ao provedor fiscal e nunca persistidos pelo RecompraCRM.
- Documentos fiscais, extratos, mídia de conversa e materiais restritos usam armazenamento privado; imagens públicas de produto, organização e marketing permanecem públicas.
- A compra guarda documentos importados em JSONB e cada item guarda seus modificadores de custo em JSONB versionado.
- Totais de custo usados pelo estoque permanecem em colunas numéricas exatas.
- Chaves tributárias começam com `IMPOSTOS_`; `MERCADORIA` não é modificador.
- O tratamento do modificador é independente da chave: `CUSTO_ESTOQUE`, `CREDITO_TRIBUTARIO` ou `DESPESA_PERIODO`.
- A contabilidade ganha `accounting_entry_lines`; não existe enum paralelo de chaves de linhas contábeis.
- XML de NF-e é analisado deterministicamente e não é enviado à IA.

## Etapa 1 — documentação e vocabulário

- [x] Registrar a decisão arquitetural.
- [x] Criar o guia vivo de custos, rateio, estoque e contabilização.
- [x] Adicionar conceitos ao `CONTEXT.md`.
- [x] Manter comentários locais e testes sincronizados com os documentos durante a implementação.

## Etapa 2 — composição de custo da compra

- [x] Criar enums e schemas Zod versionados para modificadores, tratamentos, efeitos, origens e rateio.
- [x] Adicionar `documentosImportados` à compra.
- [x] Adicionar `modificadoresCusto`, `valorTotalCusto` e `valorUnitarioCusto` ao item.
- [x] Implementar normalização, rateio por maior resto e cálculo de totais em centavos.
- [x] Recalcular e validar valores no servidor, sem confiar em totais recebidos do navegador.
- [x] Usar `valorUnitarioCusto` na entrada e no custo médio móvel.
- [x] Congelar composição e valores depois do recebimento.
- [x] Cobrir as regras contábeis com testes nomeados como regras de negócio.

## Etapa 3 — linhas contábeis genéricas

- [x] Adicionar o schema Drizzle de `accounting_entry_lines`, sem migration.
- [x] Implementar validação de partidas balanceadas e persistência transacional.
- [x] Fazer a compra gerar débitos por conta/tratamento e crédito em fornecedores.
- [x] Manter o par legado em dual-write até os readers serem migrados.
- [ ] Migrar gradualmente DRE, estatísticas, relatórios, conciliação e UI contábil.
- [ ] Remover o legado apenas depois da migration e do backfill manuais.

## Etapa 4 — importação de documentos e XML

- [x] Criar uma forma normalizada compartilhada por XML e extração visual.
- [x] Implementar parser NF-e para `nfeProc` e `NFe`, com namespaces e grupos tributários variantes.
- [x] Rejeitar DTD, entidades customizadas, XML excessivo e conteúdo malformado.
- [x] Detectar XML por extensão, MIME e conteúdo.
- [x] Mapear frete, seguro, desconto, despesas e tributos para modificadores dos itens.
- [x] Reconciliar totais de documento e itens em centavos.
- [x] Preservar metadados e arquivo original privado.
- [x] Atualizar a UI para “Importar documento”, com proveniência XML/IA.

## Etapa 5 — armazenamento seguro

- [x] Criar cliente Supabase elevado exclusivamente server-side.
- [x] Criar interface de upload/download privado autorizada pela sessão Lucia.
- [x] Substituir upload público do certificado por multipart autenticado e encaminhamento direto ao Spedy.
- [x] Remover senha e `storagePath` de novos certificados persistidos, mantendo leitura legada até a limpeza manual.
- [x] Trocar o gate de emissão automática por status confirmado no provedor.
- [x] Mover fluxos de XML/DANFE e extrato bancário para armazenamento privado.
- [x] Classificar e preparar a migração de chat, material restrito e relatórios confidenciais sem quebrar URLs públicas necessárias a integrações externas.
- [ ] Remover mutações anônimas do bucket público somente após os uploads públicos usarem concessões autenticadas.

## Etapa 6 — interface de compra

- [x] Exibir modificadores e tratamento em “Custos e tributos”.
- [x] Mostrar valor financeiro, custo de estoque, crédito tributário e despesa do período.
- [x] Mostrar custo unitário final e discriminação por item.
- [x] Permitir revisão do tratamento sugerido antes do recebimento.
- [x] Bloquear edição silenciosa depois do recebimento.

## Verificação e rollout

Ordem obrigatória, executada manualmente pelo responsável do projeto:

1. `npx tsx ./scripts/apply-sql-migration.ts drizzle/0072_purchase_cost_composition.sql` — **antes do deploy**. Sem as colunas novas de `purchase_items` nenhuma compra salva.
2. Deploy do código.
3. `npx tsx ./scripts/backfill-purchase-cost-composition.ts --dry-run` e depois sem a flag. Cobre: linhas contábeis dos lançamentos históricos, contas de crédito tributário e despesa do período nas organizações existentes, remoção da senha e do `storagePath` do certificado no JSONB, cópia dos objetos fiscais de `files/public/organizations/fiscal/**` para `private-files/fiscal/**` e reescrita dos caminhos no banco. A cópia precede a reescrita; o script força essa ordem.
4. Validar um download de XML e de DANFE pela rota autenticada e só então apagar os objetos antigos em `files/public/organizations/fiscal/**`. O script nunca apaga a origem.
5. Só então ligar `ACCOUNTING_ENTRY_LINES_ENABLED=true`.
6. Opcional e destrutivo, depois de conferir o `--dry-run`: `--only=orphan-imports` remove documentos importados que nenhuma compra referencia.

Antes de habilitar o novo armazenamento fiscal, o responsável do projeto deve:

- criar um bucket privado `private-files` (ou definir `SUPABASE_PRIVATE_FILES_BUCKET`);
- configurar `SUPABASE_SECRET_KEY` somente no runtime do servidor; `SUPABASE_SERVICE_ROLE_KEY` é aceito como fallback legado;
- mover `files/public/organizations/fiscal/**` para `private-files/fiscal/**` e ajustar os paths no banco removendo `public/organizations/`;
- validar downloads pelas rotas autenticadas antes de apagar os objetos públicos;
- apagar certificados legados somente depois de confirmar o certificado ativo mantido pela Spedy.

- [x] Testes unitários de composição, rateio, arredondamento e linhas balanceadas.
- [x] Fixtures NF-e válidas, variantes tributárias e XML hostil.
- [ ] Regressão de importação PDF/imagem.
- [x] Isolamento entre organizações: caminho do documento importado é derivado da sessão, não transportado no payload.
- [ ] Expiração de URLs privadas.
- [ ] Typecheck, lint e build sem lockfile estrangeiro.
- [ ] Migration e backfill executados manualmente antes de habilitar os novos readers em produção.
- [ ] Documentação, comentários e testes revisados junto da implementação final.
