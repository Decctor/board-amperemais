import { getAppBaseUrl } from "@/lib/organizations/poi-qr-codes";
import { db } from "@/services/drizzle";
import { inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import QRCode from "qrcode";

const STOCK_LOT_LABEL_QR_CODE_OPTIONS = {
	errorCorrectionLevel: "M" as const,
	margin: 1,
	width: 320,
};

export type TProductStockLotLabel = Awaited<ReturnType<typeof getProductStockLotLabels>>[number];

export async function getProductStockLotLabels({
	lotIds,
	organizationId,
	origin,
}: {
	lotIds: string[];
	organizationId: string;
	origin?: string | null;
}) {
	const uniqueLotIds = [...new Set(lotIds.map((id) => id.trim()).filter(Boolean))];
	if (uniqueLotIds.length === 0) throw new createHttpError.BadRequest("Informe ao menos um lote para gerar etiquetas.");

	const lots = await db.query.productStockLots.findMany({
		where: (fields, { and, eq }) => and(inArray(fields.id, uniqueLotIds), eq(fields.organizacaoId, organizationId)),
		with: {
			organizacao: {
				columns: {
					id: true,
					nome: true,
					cnpj: true,
					telefone: true,
					localizacaoCep: true,
					localizacaoEstado: true,
					localizacaoCidade: true,
					localizacaoBairro: true,
					localizacaoLogradouro: true,
					localizacaoNumero: true,
					localizacaoComplemento: true,
				},
			},
			produto: {
				columns: {
					id: true,
					nome: true,
					codigo: true,
					unidade: true,
					ncm: true,
				},
			},
			produtoVariante: {
				columns: {
					id: true,
					nome: true,
					codigo: true,
				},
			},
			producao: {
				columns: {
					id: true,
					titulo: true,
					dataConclusao: true,
				},
			},
			compra: {
				columns: {
					id: true,
					titulo: true,
				},
			},
		},
	});

	if (lots.length !== uniqueLotIds.length) throw new createHttpError.NotFound("Um ou mais lotes não foram encontrados.");

	const lotsById = new Map(lots.map((lot) => [lot.id, lot]));
	const baseUrl = normalizeOrigin(origin ?? getAppBaseUrl());

	return await Promise.all(
		uniqueLotIds.map(async (lotId) => {
			const lot = lotsById.get(lotId);
			if (!lot) throw new createHttpError.NotFound("Lote não encontrado.");

			const productName = lot.produtoVariante?.nome ?? lot.produto.nome;
			const productCode = lot.produtoVariante?.codigo ?? lot.produto.codigo;
			const lotUrl = `${baseUrl}/dashboard/operational/stock-lots/${lot.id}`;
			const qrCodeDataUrl = await QRCode.toDataURL(lotUrl, STOCK_LOT_LABEL_QR_CODE_OPTIONS);

			return {
				id: lot.id,
				url: lotUrl,
				qrCodeDataUrl,
				codigoLote: lot.codigoLote,
				produto: {
					id: lot.produto.id,
					nome: lot.produto.nome,
					codigo: lot.produto.codigo,
					unidade: lot.produto.unidade,
					ncm: lot.produto.ncm,
				},
				produtoVariante: lot.produtoVariante
					? {
							id: lot.produtoVariante.id,
							nome: lot.produtoVariante.nome,
							codigo: lot.produtoVariante.codigo,
						}
					: null,
				nomeExibicao: productName,
				codigoExibicao: productCode,
				dataFabricacao: lot.dataFabricacao,
				dataValidade: lot.dataValidade,
				quantidadeInicial: lot.quantidadeInicial,
				quantidadeAtual: lot.quantidadeAtual,
				status: lot.status,
				producao: lot.producao
					? {
							id: lot.producao.id,
							titulo: lot.producao.titulo,
							dataConclusao: lot.producao.dataConclusao,
						}
					: null,
				compra: lot.compra
					? {
							id: lot.compra.id,
							titulo: lot.compra.titulo,
						}
					: null,
				organizacao: {
					id: lot.organizacao.id,
					nome: lot.organizacao.nome,
					cnpj: lot.organizacao.cnpj,
					telefone: lot.organizacao.telefone,
					localizacaoCep: lot.organizacao.localizacaoCep,
					localizacaoEstado: lot.organizacao.localizacaoEstado,
					localizacaoCidade: lot.organizacao.localizacaoCidade,
					localizacaoBairro: lot.organizacao.localizacaoBairro,
					localizacaoLogradouro: lot.organizacao.localizacaoLogradouro,
					localizacaoNumero: lot.organizacao.localizacaoNumero,
					localizacaoComplemento: lot.organizacao.localizacaoComplemento,
				},
			};
		}),
	);
}

function normalizeOrigin(origin: string) {
	return origin.replace(/\/+$/, "");
}
