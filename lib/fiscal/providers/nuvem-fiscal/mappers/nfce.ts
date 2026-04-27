import type { TFiscalSaleContext } from "@/lib/fiscal/types";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import { mapConsumerPresenceToNfeCode, mapFiscalFinalityToNfeCode } from "./utils";

const UF_TO_IBGE_CODE: Record<string, number> = {
	AC: 12,
	AL: 27,
	AM: 13,
	AP: 16,
	BA: 29,
	CE: 23,
	DF: 53,
	ES: 32,
	GO: 52,
	MA: 21,
	MG: 31,
	MS: 50,
	MT: 51,
	PA: 15,
	PB: 25,
	PE: 26,
	PI: 22,
	PR: 41,
	RJ: 33,
	RN: 24,
	RO: 11,
	RR: 14,
	RS: 43,
	SC: 42,
	SE: 28,
	SP: 35,
	TO: 17,
};

function onlyDigits(value: string | null | undefined) {
	return value?.replace(/\D/g, "") || undefined;
}

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

export function mapSaleContextToNfcePayload(context: TFiscalSaleContext, documento: TFiscalDocument) {
	const fiscalConfig = context.organizacao.fiscalConfiguracao!;
	const uf = fiscalConfig.endereco.uf.toUpperCase();
	const payments = [
		{
			tPag: "99",
			vPag: context.venda.valorTotal,
		},
	];

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
				IE: fiscalConfig.inscricaoEstadual ?? undefined,
				IM: fiscalConfig.inscricaoMunicipal ?? undefined,
				CNAE: fiscalConfig.cnae ?? undefined,
				CRT: fiscalConfig.regimeTributario,
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
					fone: onlyDigits(fiscalConfig.telefoneFiscal ?? context.organizacao.telefone),
				},
			},
			dest: mapDestinatario(context.destinatarioSnapshot),
			det: context.venda.itens.map((item, index) => {
				const perfil = context.perfisProdutos.find((profile) => profile.produtoId === item.produtoId);
				return {
					nItem: index + 1,
					prod: {
						cProd: item.produtoId,
						cEAN: "SEM GTIN",
						xProd: item.metadados && typeof item.metadados === "object" && "descricao" in item.metadados ? item.metadados.descricao : `ITEM ${index + 1}`,
						NCM: perfil?.ncm ?? "00000000",
						CFOP: perfil?.cfopPadrao ?? context.operacao.cfopPadrao,
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
					imposto: {
						vTotTrib: 0,
					},
				};
			}),
			total: {
				ICMSTot: {
					vBC: 0,
					vICMS: 0,
					vICMSDeson: 0,
					vFCP: 0,
					vBCST: 0,
					vST: 0,
					vFCPST: 0,
					vFCPSTRet: 0,
					vProd: context.venda.itens.reduce((acc, item) => acc + item.valorVendaTotalBruto, 0),
					vFrete: 0,
					vSeg: 0,
					vDesc: context.venda.itens.reduce((acc, item) => acc + item.valorTotalDesconto, 0),
					vII: 0,
					vIPI: 0,
					vIPIDevol: 0,
					vPIS: 0,
					vCOFINS: 0,
					vOutro: 0,
					vNF: context.venda.valorTotal,
				},
			},
			transp: { modFrete: 9 },
			pag: {
				detPag: payments,
			},
		},
	};
}

