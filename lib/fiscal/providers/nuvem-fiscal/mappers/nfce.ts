import { UF_TO_IBGE_CODE } from "@/lib/fiscal/engine";
import { computeSaleTaxation } from "@/lib/fiscal/taxation-context";
import type { TFiscalSaleContext } from "@/lib/fiscal/types";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import { buildItemImposto } from "./imposto";
import { mapSalePaymentsToNfe } from "./pagamento";
import {
	formatCestForNuvemFiscal,
	formatNcmForNuvemFiscal,
	mapConsumerPresenceToNfeCode,
	mapFiscalFinalityToNfeCode,
	mapTaxRegistration,
	resolveFiscalItemName,
	nonEmptyString,
	onlyDigits,
} from "./utils";

function mapDestinatario(snapshot: TFiscalSaleContext["destinatarioSnapshot"]) {
	if (!snapshot) return undefined;
	const cpfCnpj = onlyDigits(String(snapshot.cpfCnpj ?? ""));
	return {
		CPF: cpfCnpj && cpfCnpj.length <= 11 ? cpfCnpj : undefined,
		CNPJ: cpfCnpj && cpfCnpj.length > 11 ? cpfCnpj : undefined,
		xNome: snapshot.nome,
		email: nonEmptyString(typeof snapshot.email === "string" ? snapshot.email : null),
		indIEDest: 9,
	};
}

export function mapSaleContextToNfcePayload(context: TFiscalSaleContext, documento: TFiscalDocument) {
	const fiscalConfig = context.organizacao.fiscalConfiguracao!;
	const uf = fiscalConfig.endereco.uf.toUpperCase();
	const taxation = computeSaleTaxation(context);
	const payments = mapSalePaymentsToNfe({
		payments: context.pagamentos,
		saleTotal: taxation.totais.vNF,
	});

	return {
		ambiente: fiscalConfig.ambiente === "PRODUCAO" ? "producao" : "homologacao",
		referencia: documento.referencia,
		infNFe: {
			versao: "4.00",
			ide: {
				cUF: UF_TO_IBGE_CODE[uf],
				mod: 65,
				natOp: context.operacao.naturezaOperacao,
				serie: Number(context.serie.serie),
				nNF: documento.numero ? Number(documento.numero) : context.serie.proximoNumero,
				dhEmi: new Date().toISOString(),
				tpNF: 1,
				idDest: 1,
				cMunFG: Number(fiscalConfig.endereco.codigoMunicipio),
				tpImp: 4,
				tpEmis: 1,
				tpAmb: fiscalConfig.ambiente === "PRODUCAO" ? 1 : 2,
				finNFe: mapFiscalFinalityToNfeCode(context.operacao.finalidade),
				indFinal: context.operacao.consumidorFinal ? 1 : 0,
				indPres: mapConsumerPresenceToNfeCode(context.operacao.presencaConsumidor),
				procEmi: 0,
				verProc: "recompra-crm",
			},
			emit: {
				CNPJ: onlyDigits(fiscalConfig.cpfCnpj),
				xNome: fiscalConfig.nomeRazaoSocial,
				xFant: fiscalConfig.nomeFantasia ?? undefined,
				enderEmit: {
					xLgr: fiscalConfig.endereco.logradouro,
					nro: fiscalConfig.endereco.numero,
					xCpl: fiscalConfig.endereco.complemento ?? undefined,
					xBairro: fiscalConfig.endereco.bairro,
					cMun: fiscalConfig.endereco.codigoMunicipio,
					xMun: fiscalConfig.endereco.cidade,
					UF: uf,
					CEP: onlyDigits(fiscalConfig.endereco.cep),
					cPais: fiscalConfig.endereco.codigoPais,
					xPais: fiscalConfig.endereco.pais,
					fone: onlyDigits(fiscalConfig.telefoneFiscal ?? context.organizacao.telefone ?? ""),
				},
				IE: mapTaxRegistration(fiscalConfig.inscricaoEstadual),
				IM: nonEmptyString(fiscalConfig.inscricaoMunicipal),
				CRT: fiscalConfig.regimeTributario,
			},
			dest: mapDestinatario(context.destinatarioSnapshot),
			det: taxation.itens.map(({ item, result }, index) => {
				const perfil = context.perfisProdutos.find((profile) => profile.produtoId === item.produtoId);
				return {
					nItem: index + 1,
					prod: {
						cProd: item.produtoId,
						cEAN: "SEM GTIN",
						xProd: resolveFiscalItemName(item.metadados, `ITEM ${index + 1}`),
						NCM: formatNcmForNuvemFiscal(perfil?.ncm),
						EXTIPI: perfil?.exTipi ?? undefined,
						CEST: formatCestForNuvemFiscal(perfil?.cest),
						CFOP: result.cfop ?? perfil?.cfopPadrao ?? context.operacao.cfopPadrao,
						uCom: perfil?.unidadeComercial ?? "UN",
						qCom: item.quantidade,
						vUnCom: item.valorVendaUnitario,
						vProd: item.valorVendaTotalBruto,
						cEANTrib: "SEM GTIN",
						uTrib: perfil?.unidadeComercial ?? "UN",
						qTrib: item.quantidade,
						vUnTrib: item.valorVendaUnitario,
						vDesc: item.valorTotalDesconto > 0 ? item.valorTotalDesconto : undefined,
						indTot: 1,
					},
					imposto: buildItemImposto(result),
				};
			}),
			total: {
				ICMSTot: {
					vBC: taxation.totais.vBC,
					vICMS: taxation.totais.vICMS,
					vICMSDeson: 0,
					vFCP: taxation.totais.vFCP,
					vBCST: taxation.totais.vBCST,
					vST: taxation.totais.vST,
					vFCPST: taxation.totais.vFCPST,
					vFCPSTRet: 0,
					vProd: taxation.totais.vProd,
					vFrete: 0,
					vSeg: 0,
					vDesc: taxation.totais.vDesc,
					vII: 0,
					vIPI: 0,
					vIPIDevol: 0,
					vPIS: taxation.totais.vPIS,
					vCOFINS: taxation.totais.vCOFINS,
					vOutro: 0,
					vNF: taxation.totais.vNF,
					vTotTrib: taxation.totais.vTotTrib,
				},
			},
			transp: { modFrete: 9 },
			pag: payments,
		},
	};
}
