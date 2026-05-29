import { computeSaleTaxation } from "@/lib/fiscal/taxation-context";
import type { TFiscalSaleContext } from "@/lib/fiscal/types";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import { buildItemImposto } from "./imposto";
import { mapConsumerPresenceToNfeCode, mapFiscalFinalityToNfeCode, mapTaxRegistration, nonEmptyString, onlyDigits } from "./utils";

function mapDestinatario(snapshot: TFiscalSaleContext["destinatarioSnapshot"]) {
	if (!snapshot) return undefined;
	const cpfCnpj = onlyDigits(String(snapshot.cpfCnpj ?? ""));
	return {
		CPF: cpfCnpj && cpfCnpj.length <= 11 ? cpfCnpj : undefined,
		CNPJ: cpfCnpj && cpfCnpj.length > 11 ? cpfCnpj : undefined,
		xNome: snapshot.nome,
		email: snapshot.email,
		indIEDest: 9,
	};
}

export function mapSaleContextToNfePayload(context: TFiscalSaleContext, documento: TFiscalDocument) {
	const fiscalConfig = context.organizacao.fiscalConfiguracao!;
	const taxation = computeSaleTaxation(context);

	return {
		ambiente: fiscalConfig.ambiente === "PRODUCAO" ? "producao" : "homologacao",
		referencia: documento.referencia,
		infNFe: {
			versao: "4.00",
			ide: {
				mod: 55,
				natOp: context.operacao.naturezaOperacao,
				serie: Number(context.serie.serie),
				nNF: documento.numero ? Number(documento.numero) : context.serie.proximoNumero,
				dhEmi: new Date().toISOString(),
				// Devolucao e operacao de entrada (tpNF = 0); demais saidas tpNF = 1.
				tpNF: context.operacao.finalidade === "DEVOLUCAO" ? 0 : 1,
				idDest: 1,
				tpImp: 1,
				tpEmis: 1,
				tpAmb: fiscalConfig.ambiente === "PRODUCAO" ? 1 : 2,
				finNFe: mapFiscalFinalityToNfeCode(context.operacao.finalidade),
				indFinal: context.operacao.consumidorFinal ? 1 : 0,
				indPres: mapConsumerPresenceToNfeCode(context.operacao.presencaConsumidor),
				...(documento.chaveAcessoReferencia ? { NFref: [{ refNFe: documento.chaveAcessoReferencia }] } : {}),
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
					UF: fiscalConfig.endereco.uf,
					CEP: onlyDigits(fiscalConfig.endereco.cep),
					cPais: fiscalConfig.endereco.codigoPais,
					xPais: fiscalConfig.endereco.pais,
					fone: onlyDigits(fiscalConfig.telefoneFiscal ?? context.organizacao.telefone),
				},
				IE: mapTaxRegistration(fiscalConfig.inscricaoEstadual),
				IM: nonEmptyString(fiscalConfig.inscricaoMunicipal),
				CNAE: onlyDigits(fiscalConfig.cnae),
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
						xProd: item.metadados && typeof item.metadados === "object" && "descricao" in item.metadados ? item.metadados.descricao : `ITEM ${index + 1}`,
						NCM: perfil?.ncm ?? "00000000",
						CEST: perfil?.cest ?? undefined,
						CFOP: result.cfop ?? perfil?.cfopPadrao ?? context.operacao.cfopPadrao,
						uCom: perfil?.unidadeComercial ?? "UN",
						qCom: item.quantidade,
						vUnCom: item.valorVendaUnitario,
						vProd: item.valorVendaTotalBruto,
						cEANTrib: "SEM GTIN",
						uTrib: perfil?.unidadeComercial ?? "UN",
						qTrib: item.quantidade,
						vUnTrib: item.valorVendaUnitario,
						vDesc: item.valorTotalDesconto,
						indTot: 1,
					},
					imposto: buildItemImposto(result),
				};
			}),
			total: {
				ICMSTot: {
					vBC: taxation.totais.vBC,
					vICMS: taxation.totais.vICMS,
					vFCP: taxation.totais.vFCP,
					vBCST: taxation.totais.vBCST,
					vST: taxation.totais.vST,
					vFCPST: taxation.totais.vFCPST,
					vProd: taxation.totais.vProd,
					vDesc: taxation.totais.vDesc,
					vPIS: taxation.totais.vPIS,
					vCOFINS: taxation.totais.vCOFINS,
					vNF: context.venda.valorTotal,
					vTotTrib: taxation.totais.vTotTrib,
				},
			},
			transp: { modFrete: 9 },
			pag: {
				detPag: [
					{
						tPag: "99",
						vPag: context.venda.valorTotal,
					},
				],
			},
		},
	};
}

