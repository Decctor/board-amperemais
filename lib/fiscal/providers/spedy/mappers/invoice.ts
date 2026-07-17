import { buildFiscalPaymentsForManagedSale } from "@/lib/fiscal/managed-sale-payments";
import { computeSaleTaxation } from "@/lib/fiscal/taxation-context";
import type { TFiscalSaleContext } from "@/lib/fiscal/types";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import { mapFiscalEnvironmentToSpedy } from "../status";
import type { TSpedyCreateInvoicePayload } from "../types";
import { buildSpedyItemTaxes } from "./imposto";
import { mapSalePaymentsToSpedy } from "./pagamento";
import {
	buildSpedyIntegrationId,
	formatCest,
	formatNcm,
	mapDestinationType,
	mapPresenceType,
	mapPurposeType,
	mapTaxRegistration,
	nonEmptyString,
	onlyDigits,
	resolveFiscalItemName,
} from "./utils";

function mapReceiver(snapshot: TFiscalSaleContext["destinatarioSnapshot"]) {
	if (!snapshot) return undefined;
	const address = snapshot.endereco as
		| {
				cep?: string | null;
				estado?: string | null;
				cidade?: string | null;
				bairro?: string | null;
				logradouro?: string | null;
				numero?: string | null;
				complemento?: string | null;
		  }
		| undefined;
	return {
		name: typeof snapshot.nome === "string" ? snapshot.nome : undefined,
		federalTaxNumber: onlyDigits(String(snapshot.cpfCnpj ?? "")),
		stateTaxNumber: mapTaxRegistration(typeof snapshot.inscricaoEstadual === "string" ? snapshot.inscricaoEstadual : null),
		email: nonEmptyString(typeof snapshot.email === "string" ? snapshot.email : null),
		address: address
			? {
					street: address.logradouro ?? undefined,
					district: address.bairro ?? undefined,
					postalCode: onlyDigits(address.cep ?? undefined),
					number: address.numero ?? undefined,
					additionalInformation: address.complemento ?? undefined,
					city: {
						name: address.cidade ?? undefined,
						state: address.estado?.toLowerCase(),
					},
					country: "BRA",
				}
			: undefined,
	};
}

export function mapSaleContextToSpedyInvoicePayload(context: TFiscalSaleContext, documento: TFiscalDocument): TSpedyCreateInvoicePayload {
	const taxation = computeSaleTaxation(context);
	const isNfce = documento.tipo === "NFCE";
	const isReturn = context.operacao.finalidade === "DEVOLUCAO";
	// Canal gerenciado (fase 5/C2): pagamentos fiscais reconstruídos para somar exatamente o vNF
	// (transações cruas somam o valor cheio do pedido → vTroco artificial na NFC-e).
	const integracaoMetadados = context.venda.integracaoMetadados;
	const fiscalPayments = integracaoMetadados
		? buildFiscalPaymentsForManagedSale({ payments: context.pagamentos, integracaoMetadados, fiscalTotal: taxation.totais.vNF })
		: context.pagamentos;

	return {
		integrationId: buildSpedyIntegrationId(documento.referencia),
		issuedOn: new Date().toISOString(),
		effectiveDate: context.venda.dataVenda?.toISOString?.() ?? new Date().toISOString(),
		number: documento.numero ? Number(documento.numero) : context.serie.proximoNumero,
		status: "created",
		sendEmailToCustomer: false,
		series: context.serie.serie,
		printingType: isNfce ? "consumerInvoice" : "portrait",
		operationType: isReturn ? "incoming" : "outgoing",
		purposeType: mapPurposeType(context.operacao.finalidade),
		issueType: "normal",
		operationNature: context.operacao.naturezaOperacao,
		operationDate: new Date().toISOString(),
		destination: isNfce ? "internal" : mapDestinationType(taxation.scenario.escopo),
		presenceType: mapPresenceType(context.operacao.presencaConsumidor),
		isFinalCustomer: context.operacao.consumidorFinal,
		environmentType: mapFiscalEnvironmentToSpedy(context.organizacao.fiscalConfiguracao?.ambiente),
		receiver: mapReceiver(context.destinatarioSnapshot),
		items: taxation.itens.map(({ item, result }, index) => {
			const perfil = context.perfisProdutos.find((profile) => profile.produtoId === item.produtoId);
			return {
				code: item.produtoId,
				gtinCode: "SEM GTIN",
				description: resolveFiscalItemName(item.metadados, `ITEM ${index + 1}`),
				ncm: formatNcm(perfil?.ncm),
				cest: formatCest(perfil?.cest),
				cfop: Number(result.cfop ?? perfil?.cfopPadrao ?? context.operacao.cfopPadrao),
				unit: perfil?.unidadeComercial ?? "UN",
				quantity: item.quantidade,
				unitAmount: item.valorVendaUnitario,
				totalAmount: item.valorVendaTotalBruto,
				unitTax: perfil?.unidadeComercial ?? "UN",
				quantityTax: item.quantidade,
				unitTaxAmount: item.valorVendaUnitario,
				discountAmount: item.valorTotalDesconto > 0 ? item.valorTotalDesconto : undefined,
				makeupTotal: true,
				taxBenefitCode: perfil?.codigoBeneficioFiscal ?? undefined,
				taxes: buildSpedyItemTaxes(result),
			};
		}),
		total: {
			invoiceAmount: taxation.totais.vNF,
			productAmount: taxation.totais.vProd,
			discountAmount: taxation.totais.vDesc,
			pisAmount: taxation.totais.vPIS,
			cofinsAmount: taxation.totais.vCOFINS,
			totalTax: taxation.totais.vTotTrib,
			icmsBaseTax: taxation.totais.vBC,
			icmsAmount: taxation.totais.vICMS,
			icmsStBaseTax: taxation.totais.vBCST,
			icmsStAmount: taxation.totais.vST,
			fcpAmount: taxation.totais.vFCP,
			fcpStAmount: taxation.totais.vFCPST,
			freightAmount: taxation.totais.vFrete,
			insuranceAmount: 0,
			othersAmount: 0,
			ipiAmount: 0,
			importTaxAmount: 0,
			icmsExemptAmount: 0,
		},
		payments: mapSalePaymentsToSpedy({
			payments: fiscalPayments,
			saleTotal: taxation.totais.vNF,
			isReturn,
		}),
		referencedDocuments: documento.chaveAcessoReferencia ? [{ accessKey: documento.chaveAcessoReferencia }] : undefined,
	};
}
