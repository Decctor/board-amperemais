import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { fiscalOutboundDocuments, sales } from "@/services/drizzle/schema";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { classifyFiscalLifecycleStatus, type TFiscalHealthBucket } from "./classify";
import { buildSalesUniverseConditions, buildSalesUniverseIdsSubquery, type TSalesResultsFilters } from "./universe";

const PENDING_LIST_LIMIT = 20;
const REJECTION_LIST_LIMIT = 10;

function emptyBuckets() {
	return { autorizadas: 0, pendentes: 0, rejeitadas: 0, canceladas: 0, valorAutorizado: 0 };
}

function bucketKey(bucket: TFiscalHealthBucket): keyof ReturnType<typeof emptyBuckets> {
	switch (bucket) {
		case "AUTORIZADA":
			return "autorizadas";
		case "PENDENTE":
			return "pendentes";
		case "REJEITADA":
			return "rejeitadas";
		case "CANCELADA":
			return "canceladas";
	}
}

/**
 * Saúde da emissão fiscal do período. Cada venda do universo é classificada pelo seu documento
 * mais recente (`dataInsercao`), pelo `statusInterno`; vendas sem documento algum contam à parte.
 * Se a emissão era exigida ou não fica para o leitor — v1 apenas mostra a contagem.
 */
export async function getSalesResultsFiscalHealth({ filters }: { filters: TSalesResultsFilters }) {
	const [latestDocs, [universeRow]] = await Promise.all([
		db
			.selectDistinctOn([fiscalOutboundDocuments.vendaId], {
				documentoId: fiscalOutboundDocuments.id,
				vendaId: fiscalOutboundDocuments.vendaId,
				tipo: fiscalOutboundDocuments.tipo,
				statusInterno: fiscalOutboundDocuments.statusInterno,
				referencia: fiscalOutboundDocuments.referencia,
				codigoRejeicao: fiscalOutboundDocuments.codigoRejeicao,
				mensagens: fiscalOutboundDocuments.mensagens,
				dataInsercao: fiscalOutboundDocuments.dataInsercao,
				valorVenda: sales.valorTotal,
			})
			.from(fiscalOutboundDocuments)
			.innerJoin(sales, eq(fiscalOutboundDocuments.vendaId, sales.id))
			.where(and(eq(fiscalOutboundDocuments.organizacaoId, filters.organizacaoId), inArray(fiscalOutboundDocuments.vendaId, buildSalesUniverseIdsSubquery(filters, "CONFIRMADA"))))
			.orderBy(fiscalOutboundDocuments.vendaId, desc(fiscalOutboundDocuments.dataInsercao)),
		db
			.select({ qtde: count(sales.id) })
			.from(sales)
			.where(and(...buildSalesUniverseConditions(filters, "CONFIRMADA"))),
	]);

	const porTipo = new Map<TFiscalDocumentTypeEnum, ReturnType<typeof emptyBuckets>>();
	const rejeicoes = new Map<string, { codigoRejeicao: string | null; mensagem: string | null; qtde: number }>();
	const pendencias: {
		vendaId: string;
		documentoId: string;
		tipo: TFiscalDocumentTypeEnum;
		statusInterno: (typeof latestDocs)[number]["statusInterno"];
		referencia: string;
		dataInsercao: Date;
		valorVenda: number;
	}[] = [];
	let vendasComPendencia = { qtde: 0, valor: 0 };

	for (const doc of latestDocs) {
		const bucket = classifyFiscalLifecycleStatus(doc.statusInterno);
		const tipoBuckets = porTipo.get(doc.tipo) ?? emptyBuckets();
		tipoBuckets[bucketKey(bucket)] += 1;
		if (bucket === "AUTORIZADA") tipoBuckets.valorAutorizado += doc.valorVenda;
		porTipo.set(doc.tipo, tipoBuckets);

		if (bucket === "REJEITADA") {
			const key = doc.codigoRejeicao ?? doc.mensagens?.[0] ?? "SEM_CODIGO";
			const entry = rejeicoes.get(key) ?? { codigoRejeicao: doc.codigoRejeicao ?? null, mensagem: doc.mensagens?.[0] ?? null, qtde: 0 };
			entry.qtde += 1;
			rejeicoes.set(key, entry);
		}
		if (bucket === "PENDENTE" || bucket === "REJEITADA") {
			vendasComPendencia = { qtde: vendasComPendencia.qtde + 1, valor: vendasComPendencia.valor + doc.valorVenda };
			if (doc.vendaId) {
				pendencias.push({
					vendaId: doc.vendaId,
					documentoId: doc.documentoId,
					tipo: doc.tipo,
					statusInterno: doc.statusInterno,
					referencia: doc.referencia,
					dataInsercao: doc.dataInsercao,
					valorVenda: doc.valorVenda,
				});
			}
		}
	}

	const vendasSemDocumentoQtde = universeRow.qtde - latestDocs.length;

	return {
		porTipo: Array.from(porTipo.entries()).map(([tipo, buckets]) => ({ tipo, ...buckets })),
		vendasSemDocumento: { qtde: vendasSemDocumentoQtde },
		vendasComPendencia,
		rejeicoes: Array.from(rejeicoes.values())
			.sort((a, b) => b.qtde - a.qtde)
			.slice(0, REJECTION_LIST_LIMIT),
		ultimasPendencias: pendencias.sort((a, b) => b.dataInsercao.getTime() - a.dataInsercao.getTime()).slice(0, PENDING_LIST_LIMIT),
	};
}
export type TSalesResultsFiscalHealth = Awaited<ReturnType<typeof getSalesResultsFiscalHealth>>;
