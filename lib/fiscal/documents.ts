import { processFiscalDocumentDanfeAutoPrintIfEligible } from "@/lib/desktop-agent/auto-print";
import {
  getSaleChangeTotal,
  netSaleChangeFromPayments,
} from "@/lib/sales/sale-change";
import { isValidCpfCnpj } from "@/lib/validation";
import { db } from "@/services/drizzle";
import {
  fiscalDocumentEvents,
  fiscalOutboundDocuments,
} from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { getErrorMessage } from "../errors";
import { buildFiscalReference } from "./constants";
import {
  EXCEPTIONAL_PRESENCE_JUSTIFICATION_MAX_LENGTH,
  EXCEPTIONAL_PRESENCE_JUSTIFICATION_MIN_LENGTH,
} from "./exceptional-presence";
import { getFiscalRejectionInfo } from "./rejections";
import {
  formatValidationMessages,
  hasBlockingErrors,
  type TFiscalTaxGroupWithRules,
} from "./engine";
import { FiscalReadinessError } from "./errors";
import { computeSaleTaxation } from "./taxation-context";
import { ManualFiscalProvider } from "./providers/manual";
import { SpedyFiscalProvider } from "./providers/spedy";
import {
  findActiveFiscalSeries,
  loadFiscalOrganization,
  reserveFiscalSeriesNumber,
} from "./settings";
import { resolveOperationProfileForSale } from "./operation-profile";
import {
  downloadStoredFiscalAsset,
  getFiscalAssetContentType,
  storeFiscalAsset,
  type TFiscalAssetType,
} from "./storage";
import type {
  IFiscalProvider,
  TCancelDocumentInput,
  TEmitirDocumentoInput,
  TFiscalCorrectionInput,
  TFiscalInutilizationInput,
  TProviderDocumentDetails,
  TSaleForFiscal,
  TFiscalSaleContext,
  TFiscalSalePayment,
  TSyncDocumentInput,
} from "./types";

function resolveFiscalProvider(
  fiscalProvedor: "MANUAL" | "SPEDY" | string | null | undefined,
): IFiscalProvider {
  return fiscalProvedor === "SPEDY"
    ? new SpedyFiscalProvider()
    : new ManualFiscalProvider();
}

function serializeJson(value: unknown) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

export async function findFiscalDocumentByReference({
  organizacaoId,
  referencia,
}: {
  organizacaoId: string;
  referencia: string;
}) {
  return db.query.fiscalOutboundDocuments.findFirst({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.organizacaoId, organizacaoId),
        operators.eq(fields.referencia, referencia),
      ),
  });
}

type GetFiscalDocumentByIdParams = {
  documentId: string;
  organizationId: string;
};
export async function getFiscalDocumentById({
  documentId,
  organizationId,
}: GetFiscalDocumentByIdParams) {
  return db.query.fiscalOutboundDocuments.findFirst({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.id, documentId),
        operators.eq(fields.organizacaoId, organizationId),
      ),
  });
}

export async function getFiscalDocumentDetailsById({
  documentId,
  organizationId,
}: GetFiscalDocumentByIdParams) {
  return db.query.fiscalOutboundDocuments.findFirst({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.id, documentId),
        operators.eq(fields.organizacaoId, organizationId),
      ),
    with: {
      venda: {
        columns: {
          id: true,
          valorTotal: true,
          dataVenda: true,
          statusVenda: true,
          canal: true,
          entregaModalidade: true,
        },
        with: {
          cliente: {
            columns: {
              id: true,
              nome: true,
              cpfCnpj: true,
              telefone: true,
            },
          },
          itens: true,
        },
      },
      autorPresencaConsumidor: {
        columns: { id: true, nome: true, avatarUrl: true },
      },
      documentoOrigem: {
        columns: {
          id: true,
          numero: true,
          tipo: true,
          chaveAcesso: true,
        },
      },
    },
  });
}
export async function listFiscalDocuments({
  organizacaoId,
  page = 1,
  search,
  statusInterno,
}: {
  organizacaoId: string;
  page?: number;
  search?: string | null;
  statusInterno?: string[] | null;
}) {
  const PAGE_SIZE = 25;
  const offset = (page - 1) * PAGE_SIZE;
  const searchLike = search?.trim() ? `%${search.trim()}%` : null;

  const conditions = [eq(fiscalOutboundDocuments.organizacaoId, organizacaoId)];
  if (searchLike)
    conditions.push(
      sql`(${fiscalOutboundDocuments.referencia} ilike ${searchLike} or ${fiscalOutboundDocuments.chaveAcesso} ilike ${searchLike})`,
    );
  if (statusInterno && statusInterno.length > 0) {
    conditions.push(
      inArray(
        fiscalOutboundDocuments.statusInterno,
        statusInterno as (typeof fiscalOutboundDocuments.statusInterno.enumValues)[number][],
      ),
    );
  }
  const whereClause = and(...conditions);

  const [documents, [{ count }]] = await Promise.all([
    db.query.fiscalOutboundDocuments.findMany({
      where: whereClause,
      with: {
        venda: {
          columns: {
            id: true,
            valorTotal: true,
            dataVenda: true,
            statusVenda: true,
            entregaModalidade: true,
          },
          with: {
            cliente: {
              columns: { nome: true },
            },
          },
        },
      },
      orderBy: (fields, operators) => operators.desc(fields.dataInsercao),
      offset,
      limit: PAGE_SIZE,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(fiscalOutboundDocuments)
      .where(whereClause),
  ]);

  return {
    documents,
    documentsMatched: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

type ListFiscalDocumentEventsParams = {
  documentId: string;
  organizationId: string;
};
export async function listFiscalDocumentEvents({
  documentId,
  organizationId,
}: ListFiscalDocumentEventsParams) {
  const documentBelongsToOrganization =
    await db.query.fiscalOutboundDocuments.findFirst({
      where: (fields, operators) =>
        operators.and(
          operators.eq(fields.id, documentId),
          operators.eq(fields.organizacaoId, organizationId),
        ),
      columns: { id: true },
    });
  if (!documentBelongsToOrganization)
    throw new createHttpError.NotFound("Documento fiscal nao encontrado.");
  return db.query.fiscalDocumentEvents.findMany({
    where: (fields, operators) =>
      operators.eq(fields.documentoFiscalId, documentId),
    orderBy: (fields, operators) => operators.desc(fields.dataInsercao),
    with: {
      autor: {
        columns: { id: true, nome: true, avatarUrl: true },
      },
    },
  });
}

async function patchFiscalDocument(
  documentoId: string,
  patch: Partial<typeof fiscalOutboundDocuments.$inferInsert>,
) {
  const [updated] = await db
    .update(fiscalOutboundDocuments)
    .set(patch)
    .where(eq(fiscalOutboundDocuments.id, documentoId))
    .returning();
  return updated;
}

// Apos esse tempo, um lock e considerado obsoleto (processo anterior morreu) e pode ser reclamado.
const FISCAL_SEND_LOCK_STALE_MINUTES = 15;

// Claim atomico do documento para envio ao provedor: marca bloqueadoEm somente se estiver livre
// ou com lock obsoleto. Compartilhado pela emissao manual e pelo worker da fila para impedir
// duas chamadas simultaneas ao provedor para o mesmo documento.
export async function claimFiscalDocumentForSend(
  documentId: string,
): Promise<boolean> {
  const staleThreshold = new Date(
    Date.now() - FISCAL_SEND_LOCK_STALE_MINUTES * 60_000,
  );
  const claimed = await db
    .update(fiscalOutboundDocuments)
    .set({ bloqueadoEm: new Date() })
    .where(
      and(
        eq(fiscalOutboundDocuments.id, documentId),
        or(
          isNull(fiscalOutboundDocuments.bloqueadoEm),
          lte(fiscalOutboundDocuments.bloqueadoEm, staleThreshold),
        ),
      ),
    )
    .returning({ id: fiscalOutboundDocuments.id });
  return claimed.length > 0;
}

async function releaseFiscalDocumentSendLock(documentId: string) {
  await db
    .update(fiscalOutboundDocuments)
    .set({ bloqueadoEm: null })
    .where(eq(fiscalOutboundDocuments.id, documentId));
}

async function addFiscalDocumentEvent({
  documentoFiscalId,
  tipo,
  descricao,
  payload,
  autorId,
}: {
  documentoFiscalId: string;
  tipo: typeof fiscalDocumentEvents.$inferInsert.tipo;
  descricao?: string | null;
  payload?: unknown;
  autorId?: string | null;
}) {
  const [event] = await db
    .insert(fiscalDocumentEvents)
    .values({
      documentoFiscalId,
      tipo,
      descricao: descricao ?? null,
      payload: serializeJson(payload),
      autorId: autorId ?? null,
    })
    .returning();
  return event;
}

async function applyProviderDocumentDetails(
  documentoId: string,
  details: TProviderDocumentDetails,
) {
  // Retornos parciais do provedor (ex.: cancelamento nao traz chave/numero/datas de emissao):
  // campos ausentes ficam undefined e sao ignorados pelo update, preservando o valor persistido.
  return patchFiscalDocument(documentoId, {
    status: details.status,
    statusInterno: details.statusInterno,
    ambiente: details.ambiente,
    provedorDocumentoId: details.id,
    provedorStatus: details.status,
    chaveAcesso: details.chaveAcesso ?? undefined,
    numero: details.numero ?? undefined,
    serie: details.serie ?? undefined,
    protocolo: details.protocolo ?? undefined,
    codigoRejeicao:
      details.statusInterno === "AUTORIZADO"
        ? null
        : (details.codigoStatus ?? null),
    mensagens: (details.mensagens as string[] | undefined) ?? [],
    provedorPayload: serializeJson(details.provedorPayload) ?? undefined,
    provedorRetorno: serializeJson(details.provedorRetorno) ?? undefined,
    dataEmissao: details.dataEmissao ?? undefined,
    dataAutorizacao: details.dataAutorizacao ?? undefined,
    dataCancelamento: details.dataCancelamento ?? undefined,
    dataUltimaSincronizacao: new Date(),
  });
}

async function createOrUpdateDraftDocument({
  input,
  referencia,
  statusInterno,
}: {
  input: TEmitirDocumentoInput;
  referencia: string;
  statusInterno: "RASCUNHO" | "PRONTO_PARA_ENVIO";
}) {
  const existing = await findFiscalDocumentByReference({
    organizacaoId: input.organizacaoId,
    referencia,
  });
  if (existing) return existing;

  const [inserted] = await db
    .insert(fiscalOutboundDocuments)
    .values({
      organizacaoId: input.organizacaoId,
      vendaId: input.vendaId,
      lancamentoContabilId: input.lancamentoContabilId ?? null,
      tipo: input.tipo,
      status: "PENDENTE",
      statusInterno,
      referencia,
      documentoOrigemId: input.documentoOrigemId ?? null,
      chaveAcessoReferencia: input.chaveAcessoReferencia ?? null,
    })
    .onConflictDoNothing({
      target: [
        fiscalOutboundDocuments.organizacaoId,
        fiscalOutboundDocuments.referencia,
      ],
    })
    .returning();
  if (inserted) return inserted;

  // Outra requisicao inseriu a mesma referencia entre o find e o insert: usa o registro vencedor.
  const winner = await findFiscalDocumentByReference({
    organizacaoId: input.organizacaoId,
    referencia,
  });
  if (!winner)
    throw new createHttpError.InternalServerError(
      "Erro ao criar o documento fiscal.",
    );
  return winner;
}

type LoadSaleForFiscalParams = {
  saleId: string;
  organizationId: string;
};
async function loadSaleForFiscal({
  saleId,
  organizationId,
}: LoadSaleForFiscalParams): Promise<TSaleForFiscal | null> {
  const sale = await db.query.sales.findFirst({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.id, saleId),
        operators.eq(fields.organizacaoId, organizationId),
      ),
    with: {
      itens: true,
      cliente: true,
      entregaLocalizacao: true,
    },
  });

  return sale ?? null;
}

async function loadProductFiscalProfilesForSale(venda: TSaleForFiscal) {
  if (venda.itens.length === 0) return [];
  const produtoIds = [...new Set(venda.itens.map((item) => item.produtoId))];
  return db.query.productFiscalProfiles.findMany({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.organizacaoId, venda.organizacaoId ?? ""),
        operators.inArray(fields.produtoId, produtoIds),
        operators.isNull(fields.produtoVarianteId),
      ),
  });
}

async function loadSalePayments({
  saleId,
  organizationId,
}: {
  saleId: string;
  organizationId: string;
}) {
  const entries = await db.query.accountingEntries.findMany({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.vendaId, saleId),
        operators.eq(fields.organizacaoId, organizationId),
      ),
    columns: { id: true },
    with: {
      transacoesFinanceiras: {
        columns: {
          valor: true,
          tipo: true,
          metodo: true,
          provedorStatus: true,
          modificadoresMetadata: true,
        },
      },
    },
  });

  const transactions = entries.flatMap((entry) => entry.transacoesFinanceiras);
  const totalsByMethod = new Map<TFiscalSalePayment["metodo"], number>();
  for (const transaction of transactions) {
    if (transaction.tipo !== "ENTRADA") continue;
    if (["CANCELADO", "ESTORNADO"].includes(transaction.provedorStatus ?? ""))
      continue;
    totalsByMethod.set(
      transaction.metodo,
      (totalsByMethod.get(transaction.metodo) ?? 0) + transaction.valor,
    );
  }

  const payments = [...totalsByMethod.entries()].map(([metodo, valor]) => ({
    metodo,
    valor: Math.round((valor + Number.EPSILON) * 100) / 100,
  }));
  // Os recebimentos ficam pelo valor entregue pelo cliente (R$ 50 numa venda de R$ 37) e o troco
  // e uma SAIDA do mesmo lancamento. A Spedy nao expoe vTroco e pagamentos acima do total sao a
  // rejeicao 866: a visao fiscal sai liquida do troco, fechando exatamente no valor da venda.
  return netSaleChangeFromPayments(payments, getSaleChangeTotal(transactions));
}
async function loadTaxGroupsForProfiles(
  perfisProdutos: { grupoTributarioId: string | null }[],
): Promise<TFiscalTaxGroupWithRules[]> {
  const grupoIds = [
    ...new Set(
      perfisProdutos
        .map((perfil) => perfil.grupoTributarioId)
        .filter((id): id is string => !!id),
    ),
  ];
  if (grupoIds.length === 0) return [];
  return db.query.fiscalTaxGroups.findMany({
    where: (fields) => inArray(fields.id, grupoIds),
    with: { regras: true },
  });
}

async function loadIbptRatesForSale({
  perfisProdutos,
  uf,
}: {
  perfisProdutos: { ncm: string }[];
  uf: string | null | undefined;
}) {
  if (!uf) return [];
  const ncms = [
    ...new Set(
      perfisProdutos
        .map((perfil) => perfil.ncm)
        .filter((ncm): ncm is string => !!ncm),
    ),
  ];
  if (ncms.length === 0) return [];
  return db.query.fiscalIbptRates.findMany({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.uf, uf.toUpperCase()),
        operators.inArray(fields.ncm, ncms),
        // Ignora versoes da tabela IBPT com vigencia encerrada.
        operators.or(
          operators.isNull(fields.vigenciaFim),
          operators.gte(fields.vigenciaFim, new Date()),
        ),
      ),
    orderBy: (fields, operators) => operators.desc(fields.vigenciaInicio),
  });
}

function buildDestinatarioSnapshot(venda: TSaleForFiscal | null) {
  if (!venda?.cliente) return null;
  const address = venda.entregaLocalizacao ?? venda.cliente;
  return {
    nome: venda.cliente.nome,
    cpfCnpj: venda.cliente.cpfCnpj,
    inscricaoEstadual: venda.cliente.inscricaoEstadual,
    indicadorInscricaoEstadual: venda.cliente.indicadorInscricaoEstadual,
    email: venda.cliente.email,
    endereco: {
      cep: address?.localizacaoCep ?? null,
      estado: address?.localizacaoEstado ?? null,
      cidade: address?.localizacaoCidade ?? null,
      bairro: address?.localizacaoBairro ?? null,
      logradouro: address?.localizacaoLogradouro ?? null,
      numero: address?.localizacaoNumero ?? null,
      complemento: address?.localizacaoComplemento ?? null,
    },
  };
}

function assertFiscalReadiness(context: TFiscalSaleContext) {
  const fiscalConfig = context.organizacao.fiscalConfiguracao;
  if (!fiscalConfig)
    throw new FiscalReadinessError(
      "Configuracao fiscal da organizacao nao encontrada.",
    );
  if (!context.serie?.id)
    throw new FiscalReadinessError(
      "Serie fiscal ativa nao encontrada para esta emissao.",
    );
  if (!context.operacao?.id)
    throw new FiscalReadinessError(
      "Perfil de operacao fiscal nao encontrado para esta emissao.",
    );
  if (!fiscalConfig.cpfCnpj)
    throw new FiscalReadinessError(
      "CPF/CNPJ fiscal da organizacao nao configurado.",
    );
  if (!fiscalConfig.nomeRazaoSocial)
    throw new FiscalReadinessError(
      "Razao social fiscal da organizacao nao configurada.",
    );
  if (
    context.venda.entregaModalidade === "ENTREGA" &&
    !isValidCpfCnpj(context.venda.cliente?.cpfCnpj ?? "") &&
    !context.classificacaoPresencaExcepcional
  ) {
    throw new FiscalReadinessError(
      "Informe um CPF ou CNPJ valido para o destinatario da entrega antes de emitir o documento fiscal.",
    );
  }

  // CSC/token e companyApiKey sao credenciais da emissao via Spedy; no provedor MANUAL nao ha envio.
  if (context.organizacao.fiscalProvedor === "SPEDY") {
    if (!fiscalConfig.spedy?.companyApiKey)
      throw new FiscalReadinessError(
        "Empresa fiscal nao sincronizada com a Spedy.",
      );
    if (context.operacao.tipoDocumento === "NFCE") {
      if (!fiscalConfig.spedy?.nfce?.csc)
        throw new FiscalReadinessError("CSC da NFC-e nao configurado.");
      if (!fiscalConfig.spedy?.nfce?.tokenId)
        throw new FiscalReadinessError("Token da NFC-e nao configurado.");
    }
  }
  if (
    context.operacao.finalidade !== "DEVOLUCAO" &&
    context.pagamentos.length > 0
  ) {
    const paymentTotal = context.pagamentos.reduce(
      (total, payment) => total + payment.valor,
      0,
    );
    // A visao fiscal ja sai liquida do troco (loadSalePayments); bloqueia apenas pagamento insuficiente.
    if (paymentTotal + 0.01 < context.venda.valorTotal) {
      throw new FiscalReadinessError(
        "A soma dos pagamentos e menor que o valor total da venda.",
      );
    }
  }

  if (context.perfisProdutos.length === 0)
    throw new FiscalReadinessError(
      "Nenhum perfil fiscal de produto encontrado para a venda.",
    );
}

async function buildSaleFiscalContext(
  input: TEmitirDocumentoInput,
): Promise<TFiscalSaleContext> {
  const venda = await loadSaleForFiscal({
    saleId: input.vendaId,
    organizationId: input.organizacaoId,
  });
  if (!venda)
    throw new createHttpError.NotFound(
      "Venda nao encontrada para emissao fiscal.",
    );

  const organizacao = await loadFiscalOrganization(input.organizacaoId);
  if (!organizacao)
    throw new createHttpError.NotFound(
      "Organizacao nao encontrada para emissao fiscal.",
    );
  if (input.classificacaoPresencaExcepcional) {
    if (input.origem !== "MANUAL") {
      throw new FiscalReadinessError(
        "A classificacao presencial excepcional exige emissao manual.",
      );
    }
    if (venda.entregaModalidade !== "ENTREGA") {
      throw new FiscalReadinessError(
        "A classificacao presencial excepcional esta disponivel somente para vendas com entrega.",
      );
    }
    if (
      !organizacao.fiscalConfiguracao?.emissaoManual
        ?.classificacaoPresencialExcepcional?.habilitada
    ) {
      throw new FiscalReadinessError(
        "A classificacao presencial excepcional nao esta habilitada para esta organizacao.",
      );
    }
    const justificationLength =
      input.classificacaoPresencaExcepcional.justificativa.trim().length;
    if (
      justificationLength < EXCEPTIONAL_PRESENCE_JUSTIFICATION_MIN_LENGTH ||
      justificationLength > EXCEPTIONAL_PRESENCE_JUSTIFICATION_MAX_LENGTH
    ) {
      throw new FiscalReadinessError(
        "A justificativa da classificacao presencial excepcional possui tamanho invalido.",
      );
    }
  }

  const ambiente = organizacao.fiscalConfiguracao?.ambiente ?? "HOMOLOGACAO";
  const resolvedOperation = await resolveOperationProfileForSale({
    organizacaoId: input.organizacaoId,
    tipoDocumento: input.tipo,
    signals: {
      canal: venda.canal,
      entregaModalidade: venda.entregaModalidade,
    },
    operationProfileId: input.operationProfileId,
    operacaoPadraoPorTipoId:
      organizacao.fiscalConfiguracao?.operacaoPadraoPorTipo?.[input.tipo] ??
      null,
    // Documento encadeado a um original e sempre devolucao: garante o perfil DEVOLUCAO
    // mesmo quando o operationProfileId nao foi repassado (ex.: retentativa via worker).
    finalidade: input.documentoOrigemId ? "DEVOLUCAO" : "NORMAL",
  });
  const operacao = input.classificacaoPresencaExcepcional
    ? {
        ...resolvedOperation,
        presencaConsumidor:
          input.classificacaoPresencaExcepcional.presencaConsumidor,
      }
    : resolvedOperation;

  const serie =
    operacao.seriePadrao ??
    (await findActiveFiscalSeries({
      organizacaoId: input.organizacaoId,
      tipoDocumento: input.tipo,
      ambiente,
    }));
  if (!serie)
    throw new createHttpError.BadRequest("Serie fiscal nao configurada.");

  const [perfisProdutos, pagamentos] = await Promise.all([
    loadProductFiscalProfilesForSale(venda),
    loadSalePayments({ saleId: venda.id, organizationId: input.organizacaoId }),
  ]);
  const gruposTributarios = await loadTaxGroupsForProfiles(perfisProdutos);
  const ibptRates = await loadIbptRatesForSale({
    perfisProdutos,
    uf: organizacao.fiscalConfiguracao?.endereco.uf,
  });

  return {
    venda,
    organizacao,
    serie,
    operacao,
    perfisProdutos,
    gruposTributarios,
    ibptRates,
    destinatarioSnapshot: buildDestinatarioSnapshot(venda),
    pagamentos,
    classificacaoPresencaExcepcional:
      input.classificacaoPresencaExcepcional ?? null,
  };
}

// Validacao tributaria local (motor fiscal) antes de enviar ao provedor.
// Bloqueia a emissao quando ha erros impeditivos detectaveis sem custo de rejeicao SEFAZ.
function assertFiscalTaxationValid(context: TFiscalSaleContext) {
  const taxation = computeSaleTaxation(context);
  if (hasBlockingErrors(taxation.erros)) {
    throw new FiscalReadinessError(
      `Validacao fiscal falhou: ${formatValidationMessages(taxation.erros).join("; ")}`,
    );
  }
}

async function persistAuthorizedAssets(
  documento: typeof fiscalOutboundDocuments.$inferSelect,
  organizacaoId: string,
) {
  const organizacao = await loadFiscalOrganization(organizacaoId);
  if (!organizacao) return null;
  const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
  const [xmlBuffer, pdfBuffer] = await Promise.all([
    provider.baixarXml(documento, organizacao),
    provider.baixarPdf(documento, organizacao),
  ]);
  const xmlStoragePath = xmlBuffer
    ? await storeFiscalAsset({
        documentoId: documento.id,
        tipo: documento.tipo,
        asset: "xml",
        buffer: xmlBuffer,
      })
    : null;
  const pdfStoragePath = pdfBuffer
    ? await storeFiscalAsset({
        documentoId: documento.id,
        tipo: documento.tipo,
        asset: "pdf",
        buffer: pdfBuffer,
      })
    : null;
  const patched = await patchFiscalDocument(documento.id, {
    xmlStoragePath,
    pdfStoragePath,
  });
  // Auto-print da DANFE: hook único para os dois caminhos de autorização (emissão e sync),
  // depois do pdfStoragePath gravado. Nunca lança; idempotente por DANFE:<documentoId>.
  if (patched?.pdfStoragePath) {
    await processFiscalDocumentDanfeAutoPrintIfEligible({ documento: patched });
  }
  return patched;
}

// Parte "preparar": cria/atualiza o rascunho, valida prontidao e tributacao, reserva numeracao
// e marca PRONTO_PARA_ENVIO. NAO chama o provedor. Compartilhada pela emissao sincrona e pela fila.
async function prepareFiscalDocumentForSend({
  input,
  documento,
  referencia,
}: {
  input: TEmitirDocumentoInput;
  documento: typeof fiscalOutboundDocuments.$inferSelect;
  referencia: string;
}): Promise<TFiscalSaleContext> {
  if (input.classificacaoPresencaExcepcional) {
    await patchFiscalDocument(documento.id, {
      presencaConsumidorDeclarada:
        input.classificacaoPresencaExcepcional.presencaConsumidor,
      justificativaPresencaConsumidor:
        input.classificacaoPresencaExcepcional.justificativa,
      autorPresencaConsumidorId: input.classificacaoPresencaExcepcional.autorId,
      dataDeclaracaoPresencaConsumidor:
        input.classificacaoPresencaExcepcional.dataDeclaracao,
      proximaTentativaEm: null,
    });
    await addFiscalDocumentEvent({
      documentoFiscalId: documento.id,
      tipo: "CLASSIFICACAO_PRESENCA_EXCEPCIONAL",
      descricao:
        "Venda com entrega declarada excepcionalmente como operação presencial para esta tentativa manual.",
      payload: {
        presencaConsumidor:
          input.classificacaoPresencaExcepcional.presencaConsumidor,
        justificativa: input.classificacaoPresencaExcepcional.justificativa,
      },
      autorId: input.classificacaoPresencaExcepcional.autorId,
    });
  } else if (documento.presencaConsumidorDeclarada) {
    await patchFiscalDocument(documento.id, {
      presencaConsumidorDeclarada: null,
      justificativaPresencaConsumidor: null,
      autorPresencaConsumidorId: null,
      dataDeclaracaoPresencaConsumidor: null,
    });
    await addFiscalDocumentEvent({
      documentoFiscalId: documento.id,
      tipo: "CLASSIFICACAO_PRESENCA_EXCEPCIONAL",
      descricao:
        "Classificação presencial excepcional removida antes de uma nova tentativa de emissão.",
      payload: { ativa: false },
      autorId: input.autorId ?? null,
    });
  }
  const context = await buildSaleFiscalContext(input);
  assertFiscalReadiness(context);
  assertFiscalTaxationValid(context);
  // Rejeicoes nao-reenviaveis (ex.: 204/539, duplicidade) exigem numeracao nova: reutilizar
  // o mesmo numero repetiria a mesma rejeicao indefinidamente.
  const rejectionInfo = getFiscalRejectionInfo(documento.codigoRejeicao);
  const mustAdvanceNumber =
    !!documento.numero && !!rejectionInfo && !rejectionInfo.reenviavel;
  const reservedNumber =
    documento.numero && !mustAdvanceNumber
      ? Number(documento.numero)
      : await reserveFiscalSeriesNumber(context.serie.id);

  await patchFiscalDocument(documento.id, {
    codigoRejeicao: null,
    statusInterno: "PRONTO_PARA_ENVIO",
    ambiente: context.organizacao.fiscalConfiguracao?.ambiente ?? "HOMOLOGACAO",
    referencia,
    provedor: context.organizacao.fiscalProvedor ?? "MANUAL",
    serie: context.serie.serie,
    numero: String(reservedNumber),
    snapshotOrigemVenda: JSON.stringify({
      venda: context.venda,
      destinatario: context.destinatarioSnapshot,
      classificacaoPresencaExcepcional:
        context.classificacaoPresencaExcepcional,
    }),
    tentativasEnvio: (documento.tentativasEnvio ?? 0) + 1,
  });

  await addFiscalDocumentEvent({
    documentoFiscalId: documento.id,
    tipo: "CRIADO",
    descricao: `Documento fiscal preparado para emissao ${input.origem.toLowerCase()}.`,
    autorId: input.autorId ?? null,
  });

  return context;
}

// Enfileira a emissao (preparar + agendar) sem chamar o provedor. Usada pelo fluxo de venda
// para nao acoplar a confirmacao a latencia/disponibilidade da SEFAZ. O worker faz o envio.
export async function enqueueFiscalDocument(input: TEmitirDocumentoInput) {
  if (input.classificacaoPresencaExcepcional) {
    throw new createHttpError.BadRequest(
      "A classificação presencial excepcional não pode ser enfileirada para emissão automática.",
    );
  }
  const referencia = buildFiscalReference(input);
  const existing = await findFiscalDocumentByReference({
    organizacaoId: input.organizacaoId,
    referencia,
  });
  if (
    existing &&
    ["AUTORIZADO", "EM_PROCESSAMENTO", "PRONTO_PARA_ENVIO"].includes(
      existing.statusInterno,
    )
  ) {
    return {
      documentoId: existing.id,
      status: existing.status,
      statusInterno: existing.statusInterno,
    };
  }

  const documento = await createOrUpdateDraftDocument({
    input,
    referencia,
    statusInterno: "RASCUNHO",
  });
  try {
    await prepareFiscalDocumentForSend({ input, documento, referencia });
    // Nao zera bloqueadoEm aqui: um lock ativo pertence a outro envio em andamento;
    // locks de processos mortos sao reclamados pelo claim apos ficarem obsoletos.
    await patchFiscalDocument(documento.id, { proximaTentativaEm: new Date() });
    return {
      documentoId: documento.id,
      status: "PENDENTE" as const,
      statusInterno: "PRONTO_PARA_ENVIO" as const,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    await patchFiscalDocument(documento.id, {
      statusInterno: "ERRO",
      mensagens: [message],
      proximaTentativaEm: null,
    });
    await addFiscalDocumentEvent({
      documentoFiscalId: documento.id,
      tipo: "ERRO",
      descricao: message,
      autorId: input.autorId ?? null,
    });
    throw error;
  }
}

export async function emitFiscalDocument(input: TEmitirDocumentoInput) {
  if (input.classificacaoPresencaExcepcional && input.origem !== "MANUAL") {
    throw new createHttpError.BadRequest(
      "A classificação presencial excepcional só pode ser usada em uma emissão manual.",
    );
  }
  const referencia = buildFiscalReference(input);
  const existing = await findFiscalDocumentByReference({
    organizacaoId: input.organizacaoId,
    referencia,
  });
  if (
    existing?.statusInterno === "AUTORIZADO" ||
    existing?.statusInterno === "EM_PROCESSAMENTO"
  ) {
    return {
      documentoId: existing.id,
      status: existing.status,
      statusInterno: existing.statusInterno,
      chaveAcesso: existing.chaveAcesso,
      numero: existing.numero,
      serie: existing.serie,
      protocolo: existing.protocolo,
    };
  }
  if (input.origem !== "MANUAL" && existing?.presencaConsumidorDeclarada) {
    throw new createHttpError.BadRequest(
      "Este documento exige uma nova confirmação manual da classificação presencial excepcional.",
    );
  }

  const documento = await createOrUpdateDraftDocument({
    input,
    referencia,
    statusInterno: "RASCUNHO",
  });
  // Lock de envio compartilhado com a fila: se o worker (ou outra emissao manual) ja esta
  // processando este documento, nao dispara uma segunda chamada ao provedor.
  if (!(await claimFiscalDocumentForSend(documento.id))) {
    throw new createHttpError.Conflict(
      "Documento fiscal ja esta sendo processado por outro envio. Aguarde e sincronize o documento.",
    );
  }
  try {
    const context = await prepareFiscalDocumentForSend({
      input,
      documento,
      referencia,
    });

    await addFiscalDocumentEvent({
      documentoFiscalId: documento.id,
      tipo: "ENVIO_SOLICITADO",
      descricao: "Envio ao provedor fiscal solicitado.",
      autorId: input.autorId ?? null,
    });

    const provider = resolveFiscalProvider(context.organizacao.fiscalProvedor);
    const latestDocument =
      (await findFiscalDocumentByReference({
        organizacaoId: input.organizacaoId,
        referencia,
      })) ?? documento;
    const providerDetails = await provider.emitirDocumento(
      context,
      latestDocument,
    );
    const updatedDocument = await applyProviderDocumentDetails(
      documento.id,
      providerDetails,
    );

    const providerMessages = (providerDetails.mensagens ?? []).map((message) =>
      typeof message === "string" ? message : JSON.stringify(message),
    );
    const rejectionDetail =
      providerDetails.statusInterno === "REJEITADO" ||
      providerDetails.statusInterno === "ERRO"
        ? providerMessages.join("; ") || "sem motivo informado pelo provedor"
        : null;

    await addFiscalDocumentEvent({
      documentoFiscalId: documento.id,
      tipo:
        providerDetails.statusInterno === "AUTORIZADO"
          ? "AUTORIZADO"
          : providerDetails.statusInterno === "REJEITADO"
            ? "REJEITADO"
            : "ERRO",
      descricao: rejectionDetail
        ? `Documento ${providerDetails.statusInterno.toLowerCase()}: ${rejectionDetail}`
        : `Documento retornou do provedor com status ${providerDetails.statusInterno}.`,
      payload: providerDetails.provedorRetorno,
      autorId: input.autorId ?? null,
    });

    if (
      providerDetails.statusInterno === "REJEITADO" ||
      providerDetails.statusInterno === "ERRO"
    ) {
      console.warn("[FISCAL] Emissao fiscal finalizada sem autorizacao", {
        documentoFiscalId: documento.id,
        vendaId: input.vendaId,
        tipo: input.tipo,
        statusInterno: providerDetails.statusInterno,
        codigoRejeicao: providerDetails.codigoStatus,
        mensagens: providerMessages,
        provedorDocumentoId: providerDetails.id,
      });
    }

    if (providerDetails.statusInterno === "AUTORIZADO" && updatedDocument) {
      await persistAuthorizedAssets(updatedDocument, context.organizacao.id);
    }

    const finalDocument =
      updatedDocument ??
      (await findFiscalDocumentByReference({
        organizacaoId: input.organizacaoId,
        referencia,
      })) ??
      documento;
    return {
      documentoId: finalDocument.id,
      status: finalDocument.status,
      statusInterno: finalDocument.statusInterno,
      chaveAcesso: finalDocument.chaveAcesso,
      numero: finalDocument.numero,
      serie: finalDocument.serie,
      protocolo: finalDocument.protocolo,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    await patchFiscalDocument(documento.id, {
      statusInterno: "ERRO",
      mensagens: [message],
    });
    await addFiscalDocumentEvent({
      documentoFiscalId: documento.id,
      tipo: "ERRO",
      descricao: message,
      autorId: input.autorId ?? null,
    });
    throw error;
  } finally {
    await releaseFiscalDocumentSendLock(documento.id);
  }
}

export async function syncFiscalDocument(input: TSyncDocumentInput) {
  const documento = await getFiscalDocumentById({
    documentId: input.documentId,
    organizationId: input.organizationId,
  });
  if (!documento)
    throw new createHttpError.NotFound("Documento fiscal nao encontrado.");

  const organizacao = await loadFiscalOrganization(documento.organizacaoId);
  if (!organizacao)
    throw new createHttpError.NotFound(
      "Organizacao do documento fiscal nao encontrada.",
    );

  const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
  const providerDetails = await provider.sincronizarDocumento(
    documento,
    organizacao,
  );
  const updated = await applyProviderDocumentDetails(
    documento.id,
    providerDetails,
  );

  const syncMessages = (providerDetails.mensagens ?? []).map((message) =>
    typeof message === "string" ? message : JSON.stringify(message),
  );
  const syncRejectionDetail =
    providerDetails.statusInterno === "REJEITADO" ||
    providerDetails.statusInterno === "ERRO"
      ? syncMessages.join("; ") || "sem motivo informado pelo provedor"
      : null;

  await addFiscalDocumentEvent({
    documentoFiscalId: documento.id,
    tipo: "SINCRONIZADO",
    descricao: syncRejectionDetail
      ? `Sincronizacao: documento ${providerDetails.statusInterno.toLowerCase()} — ${syncRejectionDetail}`
      : "Documento fiscal sincronizado manualmente.",
    payload: providerDetails.provedorRetorno,
    autorId: input.authorId ?? null,
  });

  if (
    providerDetails.statusInterno === "REJEITADO" ||
    providerDetails.statusInterno === "ERRO"
  ) {
    console.warn("[FISCAL] Sincronizacao fiscal sem autorizacao", {
      documentoFiscalId: documento.id,
      statusInterno: providerDetails.statusInterno,
      codigoRejeicao: providerDetails.codigoStatus,
      mensagens: syncMessages,
      provedorDocumentoId: providerDetails.id,
    });
  }

  if (providerDetails.statusInterno === "AUTORIZADO" && updated) {
    await persistAuthorizedAssets(updated, organizacao.id);
  }

  return {
    documentoId: updated?.id ?? documento.id,
    status: updated?.status ?? providerDetails.status,
    statusInterno: updated?.statusInterno ?? providerDetails.statusInterno,
  };
}

export async function cancelFiscalDocument(input: TCancelDocumentInput) {
  const documento = await getFiscalDocumentById({
    documentId: input.documentId,
    organizationId: input.organizationId,
  });
  if (!documento)
    throw new createHttpError.NotFound("Documento fiscal nao encontrado.");

  const organizacao = await loadFiscalOrganization(documento.organizacaoId);
  if (!organizacao)
    throw new createHttpError.NotFound(
      "Organizacao do documento fiscal nao encontrada.",
    );

  await addFiscalDocumentEvent({
    documentoFiscalId: documento.id,
    tipo: "CANCELAMENTO_SOLICITADO",
    descricao: input.reason,
    autorId: input.authorId ?? null,
  });

  const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
  const providerDetails = await provider.cancelarDocumento(
    input,
    documento,
    organizacao,
  );
  const updated = await applyProviderDocumentDetails(
    documento.id,
    providerDetails,
  );

  await addFiscalDocumentEvent({
    documentoFiscalId: documento.id,
    tipo: providerDetails.statusInterno === "CANCELADO" ? "CANCELADO" : "ERRO",
    descricao:
      providerDetails.statusInterno === "CANCELADO"
        ? "Documento cancelado com sucesso."
        : "Falha ao cancelar documento.",
    payload: providerDetails.provedorRetorno,
    autorId: input.authorId ?? null,
  });

  return {
    documentoId: updated?.id ?? documento.id,
    status: updated?.status ?? providerDetails.status,
    statusInterno: updated?.statusInterno ?? providerDetails.statusInterno,
  };
}

export async function registerFiscalCorrection(input: TFiscalCorrectionInput) {
  const documento = await getFiscalDocumentById({
    documentId: input.documentId,
    organizationId: input.organizationId,
  });
  if (!documento)
    throw new createHttpError.NotFound("Documento fiscal nao encontrado.");
  if (documento.tipo !== "NFE")
    throw new createHttpError.BadRequest(
      "Carta de correcao disponivel apenas para NF-e.",
    );
  if (documento.statusInterno !== "AUTORIZADO")
    throw new createHttpError.BadRequest(
      "Carta de correcao disponivel apenas para documento autorizado.",
    );

  const organizacao = await loadFiscalOrganization(documento.organizacaoId);
  if (!organizacao)
    throw new createHttpError.NotFound(
      "Organizacao do documento fiscal nao encontrada.",
    );

  const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
  const result = await provider.cartaCorrecaoDocumento(
    input,
    documento,
    organizacao,
  );

  await addFiscalDocumentEvent({
    documentoFiscalId: documento.id,
    tipo: "CARTA_CORRECAO",
    descricao: `Carta de correcao (sequencia ${result.sequenciaEvento}): ${input.correcao}`,
    payload: result.provedorRetorno,
    autorId: input.authorId ?? null,
  });

  return {
    documentoId: documento.id,
    sequenciaEvento: result.sequenciaEvento,
    protocolo: result.protocolo ?? null,
  };
}

export async function inutilizeFiscalDocument(
  input: TFiscalInutilizationInput,
) {
  const documento = await getFiscalDocumentById({
    documentId: input.documentId,
    organizationId: input.organizationId,
  });
  if (!documento)
    throw new createHttpError.NotFound("Documento fiscal nao encontrado.");
  if (
    documento.statusInterno === "AUTORIZADO" ||
    documento.status === "AUTORIZADA"
  ) {
    throw new createHttpError.BadRequest(
      "Nao e possivel inutilizar a numeracao de um documento autorizado.",
    );
  }

  const organizacao = await loadFiscalOrganization(documento.organizacaoId);
  if (!organizacao)
    throw new createHttpError.NotFound(
      "Organizacao do documento fiscal nao encontrada.",
    );

  const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
  const result = await provider.inutilizarNumeracao(
    input,
    documento,
    organizacao,
  );

  await patchFiscalDocument(documento.id, {
    status: result.status,
    statusInterno: "INUTILIZADO",
    proximaTentativaEm: null,
    bloqueadoEm: null,
  });
  await addFiscalDocumentEvent({
    documentoFiscalId: documento.id,
    tipo: "INUTILIZACAO",
    descricao: `Inutilizacao de numeracao: ${input.justificativa}`,
    payload: result.provedorRetorno,
    autorId: input.authorId ?? null,
  });

  return {
    documentoId: documento.id,
    status: result.status,
    protocolo: result.protocolo ?? null,
  };
}

type CreateReturnFiscalDocumentParams = {
  organizationId: string;
  originalDocumentId: string;
  operationProfileId?: string | null;
  authorId?: string | null;
};
// Gera uma NF-e de devolucao referenciando um documento autorizado (mesma venda, finalidade DEVOLUCAO).
export async function createReturnFiscalDocument({
  organizationId,
  originalDocumentId,
  operationProfileId,
  authorId,
}: CreateReturnFiscalDocumentParams) {
  const original = await getFiscalDocumentById({
    documentId: originalDocumentId,
    organizationId,
  });
  if (!original)
    throw new createHttpError.NotFound(
      "Documento fiscal original nao encontrado.",
    );
  if (original.statusInterno !== "AUTORIZADO")
    throw new createHttpError.BadRequest(
      "A devolucao so pode ser gerada a partir de um documento autorizado.",
    );
  if (!original.vendaId)
    throw new createHttpError.BadRequest(
      "Documento original sem venda vinculada.",
    );
  if (!original.chaveAcesso)
    throw new createHttpError.BadRequest(
      "Documento original sem chave de acesso.",
    );

  let profileId = operationProfileId ?? null;
  if (!profileId) {
    const devProfile = await db.query.fiscalOperationProfiles.findFirst({
      where: (fields, operators) =>
        operators.and(
          operators.eq(fields.organizacaoId, organizationId),
          operators.eq(fields.tipoDocumento, "NFE"),
          operators.eq(fields.finalidade, "DEVOLUCAO"),
          operators.eq(fields.ativo, true),
        ),
    });
    if (!devProfile)
      throw new createHttpError.BadRequest(
        "Configure um perfil de operacao fiscal de devolucao (NF-e com finalidade DEVOLUCAO).",
      );
    profileId = devProfile.id;
  }

  return enqueueFiscalDocument({
    vendaId: original.vendaId,
    tipo: "NFE",
    organizacaoId: organizationId,
    autorId: authorId ?? null,
    origem: "MANUAL",
    operationProfileId: profileId,
    documentoOrigemId: original.id,
    chaveAcessoReferencia: original.chaveAcesso,
  });
}

/**
 * Nome do arquivo servido ao usuario. A chave de acesso e o nome canonico de um documento fiscal
 * no Brasil — e o que os sistemas de contabilidade esperam receber. Sem chave (nota ainda nao
 * autorizada), cai para tipo/serie/numero e, em ultimo caso, para o id.
 */
function buildFiscalAssetFileName(
  document: { id: string; tipo: string; serie: string | null; numero: string | null; chaveAcesso: string | null },
  asset: TFiscalAssetType,
) {
  const identifier =
    document.chaveAcesso ??
    [document.tipo, document.serie, document.numero].filter(Boolean).join("-") ??
    document.id;
  // Content-Disposition nao aceita qualquer byte no filename; a chave e so digito, mas o fallback
  // passa por campos livres.
  const safeIdentifier = identifier.replace(/[^A-Za-z0-9._-]/g, "-") || document.id;
  return `${safeIdentifier}.${asset}`;
}

type GetFiscalDocumentAssetParams = {
  documentId: string;
  organizationId: string;
  asset: TFiscalAssetType;
};
export async function getFiscalDocumentAsset({
  documentId,
  organizationId,
  asset,
}: GetFiscalDocumentAssetParams) {
  const document = await getFiscalDocumentById({ documentId, organizationId });
  if (!document)
    throw new createHttpError.NotFound("Documento fiscal nao encontrado.");

  const fileName = buildFiscalAssetFileName(document, asset);

  const path =
    asset === "xml" ? document.xmlStoragePath : document.pdfStoragePath;
  if (path) {
    return {
      buffer: await downloadStoredFiscalAsset(path),
      contentType: getFiscalAssetContentType(asset),
      fileName,
    };
  }

  const organization = await loadFiscalOrganization(document.organizacaoId);
  if (!organization)
    throw new createHttpError.NotFound("Organizacao nao encontrada.");

  const provider = resolveFiscalProvider(organization.fiscalProvedor);
  const buffer =
    asset === "xml"
      ? await provider.baixarXml(document, organization)
      : await provider.baixarPdf(document, organization);
  if (!buffer)
    throw new createHttpError.NotFound("Arquivo fiscal nao encontrado.");

  const storedPath = await storeFiscalAsset({
    documentoId: document.id,
    tipo: document.tipo,
    asset,
    buffer,
  });
  await patchFiscalDocument(
    document.id,
    asset === "xml"
      ? { xmlStoragePath: storedPath }
      : { pdfStoragePath: storedPath },
  );

  return {
    buffer,
    contentType: getFiscalAssetContentType(asset),
    fileName,
  };
}

type SyncPendingFiscalDocumentsParams = {
  organizationId: string;
  limit?: number;
};
export async function syncPendingFiscalDocuments({
  organizationId,
  limit = 20,
}: SyncPendingFiscalDocumentsParams) {
  const pendingDocuments = await db.query.fiscalOutboundDocuments.findMany({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.organizacaoId, organizationId),
        operators.inArray(fields.statusInterno, [
          "EM_PROCESSAMENTO",
          "CANCELAMENTO_PENDENTE",
        ]),
      ),
    orderBy: (fields, operators) => operators.asc(fields.dataInsercao),
    limit,
  });

  const results = [];
  for (const document of pendingDocuments) {
    results.push(
      await syncFiscalDocument({ organizationId, documentId: document.id }),
    );
  }
  return results;
}
