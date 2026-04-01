import type { TFiscalSaleContext } from "@/lib/fiscal/types";
import type { TFiscalDocument } from "@/services/drizzle/schema";

export function mapSaleContextToNfePayload(context: TFiscalSaleContext, documento: TFiscalDocument) {
	const fiscalConfig = context.organizacao.fiscalConfiguracao!;

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
				idDest: 1,
				tpImp: 1,
				tpEmis: 1,
				tpAmb: fiscalConfig.ambiente === "PRODUCAO" ? 1 : 2,
				finNFe: 1,
				indFinal: context.operacao.consumidorFinal ? 1 : 0,
				indPres: 0,
				procEmi: 0,
				verProc: "recompra-crm",
			},
			emit: {
				CNPJ: fiscalConfig.cpfCnpj,
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
					UF: fiscalConfig.endereco.uf,
					CEP: fiscalConfig.endereco.cep,
					cPais: fiscalConfig.endereco.codigoPais,
					xPais: fiscalConfig.endereco.pais,
					fone: fiscalConfig.telefoneFiscal ?? context.organizacao.telefone ?? undefined,
				},
			},
			dest: context.destinatarioSnapshot
				? {
						CPF: String(context.destinatarioSnapshot.cpfCnpj ?? "").length <= 11 ? context.destinatarioSnapshot.cpfCnpj : undefined,
						CNPJ: String(context.destinatarioSnapshot.cpfCnpj ?? "").length > 11 ? context.destinatarioSnapshot.cpfCnpj : undefined,
						xNome: context.destinatarioSnapshot.nome,
						email: context.destinatarioSnapshot.email,
						indIEDest: 9,
					}
				: undefined,
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
						vDesc: item.valorTotalDesconto,
						indTot: 1,
					},
					imposto: {
						vTotTrib: 0,
					},
				};
			}),
			total: {
				ICMSTot: {
					vProd: context.venda.itens.reduce((acc, item) => acc + item.valorVendaTotalBruto, 0),
					vDesc: context.venda.itens.reduce((acc, item) => acc + item.valorTotalDesconto, 0),
					vNF: context.venda.valorTotal,
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

