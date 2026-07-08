# Plano de implementação: migração fiscal completa para Spedy

Contexto: a emissão fiscal atual está encapsulada pelo módulo `lib/fiscal`, com `IFiscalProvider` como contrato interno e `NuvemFiscalProvider` como implementação principal. Como não há clientes usando ativamente a emissão pela Nuvem Fiscal, a integração com a Spedy pode ser tratada como substituição completa, não como operação lado a lado.

Objetivo: remover a dependência operacional da Nuvem Fiscal e tornar a Spedy o provedor fiscal padrão/único para emissão fiscal automática e manual.

## Leitura da OpenAPI sobre credenciais

A OpenAPI informa autenticação por header `X-Api-Key`. Ela também expõe recursos de empresas (`/v1/companies`) e, no retorno de empresa (`CompanyGetDto`), existe `apiCredentials.apiKey`.

Ponto importante: os endpoints de emissão (`/v1/product-invoices` e `/v1/consumer-invoices`) não recebem `companyId` no path nem no payload. Isso sugere que a empresa emissora pode ser determinada pela API key usada na chamada.

Hipótese principal para implementação:

- Teremos uma credencial master/owner da RecompraCRM para criar e gerenciar empresas na Spedy.
- Cada organização será cadastrada como uma `company` na Spedy.
- A Spedy pode gerar ou retornar uma API key por empresa (`apiCredentials.apiKey`).
- O cliente final não deve ver nem acessar a Spedy.
- A aplicação armazena as credenciais necessárias de forma server-side e usa a API da Spedy em nome do cliente.

Pergunta a confirmar com a Spedy antes da implementação final:

> Com uma API key de integrador/owner, consigo emitir notas para qualquer `company` criada por mim informando algum identificador de empresa, ou a emissão exige usar a API key específica de cada company?

Como a OpenAPI não mostra `companyId` nos endpoints de nota, o plano deve suportar os dois cenários:

- **Cenário A, preferido:** `SPEDY_OWNER_API_KEY` em variável de ambiente gerencia tudo e também emite.
- **Cenário B, provável pela OpenAPI:** `SPEDY_OWNER_API_KEY` cria/atualiza empresas, e cada organização usa uma `companyApiKey` interna para emitir notas.

Mesmo no cenário B, o cliente não precisa acessar a Spedy. A API key por empresa seria uma credencial técnica provisionada e guardada pela RecompraCRM.

## Estratégia revisada

Como não precisamos preservar emissão ativa da Nuvem Fiscal:

- Trocar `NUVEM_FISCAL` por `SPEDY` como provedor real.
- Remover UI/caminhos de configuração específicos da Nuvem Fiscal.
- Manter `MANUAL` como fallback operacional/stub.
- Manter histórico de código da Nuvem Fiscal só temporariamente, se ajudar na migração dos mappers; depois remover.
- Não investir em dual-provider, feature flag de migração ou compatibilidade com documentos antigos da Nuvem.

Ainda vale manter `documento.provedor = "SPEDY"` nos documentos fiscais, porque isso ajuda auditoria e evita ambiguidade futura.

## Fase 1: limpeza de modelo e configuração

1. Atualizar enums:
   - `services/drizzle/schema/enums.ts`: substituir `NUVEM_FISCAL` por `SPEDY` em `fiscalProviderEnum`.
   - `schemas/enums.ts`: substituir `NUVEM_FISCAL` por `SPEDY` em `FiscalProviderEnum`.
   - Gerar migration Drizzle.

2. Atualizar schemas de organização:
   - `schemas/fiscal.ts`: substituir `nuvemFiscal` por `spedy`.
   - `schemas/organizations.ts`: aceitar `MANUAL | SPEDY`.

3. Modelo recomendado para `fiscalConfiguracao.spedy`:

```ts
spedy: {
  baseUrl?: string | null;
  companyId?: string | null;
  companyApiKey?: string | null;
  certificado: FiscalCertificateMetadata;
  nfce: {
    tokenId?: string | null;
    csc?: string | null;
  };
}
```

4. Credenciais:
   - `SPEDY_OWNER_API_KEY`: variável de ambiente para a conta RecompraCRM/integrador.
   - `companyApiKey`: guardar por organização apenas se a Spedy exigir API key por empresa para emitir.
   - Idealmente criptografar `companyApiKey` antes de persistir em `organizations.fiscalConfiguracao`.

5. Remover referências diretas a Nuvem Fiscal:
   - `lib/fiscal/settings.ts`.
   - `lib/fiscal/documents.ts`.
   - `lib/fiscal/index.ts`.
   - `lib/fiscal/auto-emission-capability.ts`.
   - `state-hooks/use-internal-fiscal-settings-state.tsx`.
   - `app/api/fiscal/settings/route.ts`.
   - `app/dashboard/operational/fiscal/fiscal-page.tsx`.
   - `schemas/utils.ts` e `services/drizzle/schema/utils.ts`, se o token global da Nuvem não for mais necessário.

## Fase 2: provider Spedy

Criar:

```txt
lib/fiscal/providers/spedy/
```

Arquivos:

- `client.ts`: cria Axios client com `X-Api-Key`.
- `credentials.ts`: resolve `SPEDY_OWNER_API_KEY` ou `companyApiKey` conforme tipo de operação.
- `types.ts`: tipos mínimos da OpenAPI.
- `status.ts`: mapeia status Spedy para status internos.
- `documents.ts`: emissão, consulta, sync, cancelamento, CC-e, inutilização e downloads.
- `company.ts`: cadastro/atualização de empresa, settings, certificado e captura de `apiCredentials.apiKey`.
- `mappers/nfe.ts`: venda interna -> `CreateProductInvoiceDto`.
- `mappers/nfce.ts`: venda interna -> `CreateConsumerInvoiceDto`.
- `mappers/imposto.ts`: engine tributária -> DTOs Spedy.
- `mappers/pagamento.ts`: métodos de pagamento internos -> `SefazInvoicePaymentMethod`.
- `index.ts`: `SpedyFiscalProvider implements IFiscalProvider`.

Depois:

- Trocar `resolveFiscalProvider` para retornar `SpedyFiscalProvider` quando `fiscalProvedor === "SPEDY"`.
- Remover `NuvemFiscalProvider` dos fluxos ativos.

## Fase 3: empresa e provisionamento invisível ao cliente

Fluxo desejado:

1. Usuário configura dados fiscais no RecompraCRM.
2. Usuário envia certificado e CSC/token NFC-e no RecompraCRM.
3. Backend cria/atualiza a empresa na Spedy usando credencial master.
4. Backend configura NF-e/NFC-e na Spedy.
5. Backend envia certificado.
6. Backend salva `spedy.companyId` e, se existir/necessário, `spedy.companyApiKey`.
7. A emissão passa a usar essas credenciais sem o cliente entrar na Spedy.

Endpoints Spedy envolvidos:

- `POST /v1/companies`.
- `PUT /v1/companies/{id}`.
- `PUT /v1/companies/{id}/settings`.
- `POST /v1/companies/{id}/certificates`.
- `GET /v1/companies/{id}` para recuperar `apiCredentials.apiKey`, se aplicável.

Pontos a validar:

- Formato do upload de certificado, porque a OpenAPI não mostra schema do request.
- Se a API key da empresa é retornada sempre, apenas na criação, ou precisa ser regenerada.
- Se a API key da empresa pode ser usada para todos os endpoints de nota.

## Fase 4: emissão NF-e/NFC-e

Mapeamento dos endpoints:

| Fluxo interno | Spedy |
| --- | --- |
| Emitir NF-e | `POST /v1/product-invoices` |
| Emitir NFC-e | `POST /v1/consumer-invoices` |
| Consultar NF-e | `GET /v1/product-invoices/{id}` |
| Consultar NFC-e | `GET /v1/consumer-invoices/{id}` |
| Sincronizar NF-e | `POST /v1/product-invoices/{id}/check-status` |
| Sincronizar NFC-e | `POST /v1/consumer-invoices/{id}/check-status` |
| Cancelar NF-e | `DELETE /v1/product-invoices/{id}` |
| Cancelar NFC-e | `DELETE /v1/consumer-invoices/{id}` |
| XML/PDF NF-e | `GET /v1/product-invoices/{id}/xml` e `/pdf` |
| XML/PDF NFC-e | `GET /v1/consumer-invoices/{id}/xml` e `/pdf` |
| Carta de correção | `POST /v1/product-invoices/{id}/corrections` |
| Inutilização | `POST /v1/product-invoices/disablement` ou `/consumer-invoices/disablement` |

Mapeamento principal de payload:

- `documento.referencia` -> `integrationId`, respeitando limite de 36 caracteres.
- `documento.numero` -> `number`.
- `context.serie.serie` -> `series`.
- `context.operacao.naturezaOperacao` -> `operationNature`.
- `NORMAL/DEVOLUCAO` -> `purposeType`.
- `presencaConsumidor` -> `presenceType`.
- `context.operacao.finalidade === "DEVOLUCAO"` -> `operationType: "incoming"`.
- Demais vendas -> `operationType: "outgoing"`.
- `context.operacao.consumidorFinal` -> `isFinalCustomer`.
- `computeSaleTaxation(context)` -> `items`, `taxes`, `total`.
- `context.pagamentos` -> `payments`.
- `documento.chaveAcessoReferencia` -> `referencedDocuments`.

## Fase 5: status e eventos

Mapear `InvoiceStatus`:

- `authorized` -> `AUTORIZADA` / `AUTORIZADO`.
- `canceled` -> `CANCELADA` / `CANCELADO`.
- `disabled` -> `INUTILIZADA` / `INUTILIZADO`.
- `rejected`, `denied` -> `PENDENTE` / `REJEITADO`.
- `created`, `enqueued`, `received`, `inContingent` -> `PENDENTE` / `EM_PROCESSAMENTO`.
- `removed` -> tratar como `ERRO` até confirmar semântica com a Spedy.

Atenção: a própria OpenAPI descreve que `processingDetail.status = success` não significa nota autorizada. O status da nota deve continuar sendo a fonte principal.

## Fase 6: UI fiscal

Como o cliente não deve acessar a Spedy:

- Não exibir campo de API key Spedy na UI do cliente.
- Exibir apenas dados fiscais, certificado, CSC/token NFC-e, status da empresa Spedy e botão de sincronização.
- Se for necessário diagnosticar credenciais, expor apenas status como "Empresa provisionada", "Certificado enviado", "Credencial de emissão ativa".
- API keys devem ficar em variável de ambiente ou campo server-side protegido.

Atualizar:

- `app/dashboard/operational/fiscal/fiscal-page.tsx`.
- `state-hooks/use-internal-fiscal-settings-state.tsx`.
- `lib/mutations/fiscal.ts`.
- `lib/queries/fiscal.ts`, se necessário.

## Fase 7: remover Nuvem Fiscal

Depois que a Spedy emitir em homologação:

- Remover `lib/fiscal/providers/nuvem-fiscal/`.
- Remover token OAuth e utils da Nuvem Fiscal.
- Remover campos `nuvemFiscal` dos defaults/schemas/state.
- Remover textos de UI sobre Nuvem Fiscal.
- Remover validações específicas de Nuvem Fiscal em readiness.
- Atualizar docs internas.

Se houver documentos de teste antigos com `provedor = "NUVEM_FISCAL"`, eles podem permanecer como histórico inerte ou ser limpos em ambiente de desenvolvimento.

## Fase 8: testes e homologação

Testes unitários:

- Mapper NF-e normal.
- Mapper NFC-e consumidor final.
- Mapper NF-e devolução com documento referenciado.
- Mapper de status Spedy.
- Mapper de pagamentos.
- Resolução de credenciais owner vs company.
- Truncamento/hash de `integrationId`.

Homologação manual:

1. Criar/atualizar empresa Spedy.
2. Configurar NF-e/NFC-e.
3. Enviar certificado.
4. Emitir NFC-e simples.
5. Sincronizar até autorização.
6. Baixar XML/PDF.
7. Cancelar.
8. Inutilizar numeração.
9. Emitir NF-e de devolução.
10. Conferir rejeições e mensagens.

## MVP recomendado

1. Substituir enum/config de `NUVEM_FISCAL` para `SPEDY`.
2. Criar `SpedyFiscalProvider`.
3. Implementar provisionamento de empresa.
4. Implementar emissão NF-e/NFC-e direta.
5. Implementar `check-status`.
6. Implementar XML/PDF.
7. Implementar cancelamento.
8. Ajustar UI sem expor API key ao cliente.
9. Remover caminhos ativos da Nuvem Fiscal.

Ficar para depois:

- Webhooks.
- Fluxo Spedy de pedidos (`/v1/orders`).
- Cadastro/sync de clientes/produtos na Spedy.
- NFS-e.
- DF-e inbound pela Spedy.

## Riscos

- NFC-e aparece como Beta na OpenAPI.
- O request de certificado não está descrito.
- A semântica de API key precisa ser confirmada com a Spedy.
- `integrationId` tem limite de 36 caracteres.
- Se a emissão exigir `companyApiKey`, precisamos armazenar segredo por organização com cuidado.
- Se a conta owner puder emitir para todas as empresas, precisamos descobrir como selecionar a empresa, já que a OpenAPI não mostra `companyId` no endpoint de nota.
