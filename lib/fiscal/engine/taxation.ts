import type { TFiscalPisCofinsCstEnum } from "@/schemas/enums";
import { resolveCfop } from "./cfop";
import { mapOrigemToCodigo } from "./data/uf";
import { resolveEffectiveTaxConfig, resolveRuleCfopOverride } from "./rules";
import type { TDocumentTaxTotals, TEffectiveTaxConfig, TFiscalItemInput, TFiscalTaxGroupWithRules, TFiscalTaxScenario, TFiscalValidationError, TIcmsTaxResult, TItemTaxResult } from "./types";

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeContribuicao(cst: TFiscalPisCofinsCstEnum, aliquota: number, base: number) {
	// No Simples Nacional o padrao e CST 49 com valor zero (recolhimento no DAS).
	if (cst === "49" || cst === "99" || aliquota <= 0) {
		return { cst, vBC: 0, pAliq: 0, valor: 0 };
	}
	return { cst, vBC: round2(base), pAliq: aliquota, valor: round2((base * aliquota) / 100) };
}

function computeIcms({
	config,
	scenario,
	baseLiquida,
	origemCodigo,
	produtoId,
	erros,
}: {
	config: TEffectiveTaxConfig;
	scenario: TFiscalTaxScenario;
	baseLiquida: number;
	origemCodigo: string;
	produtoId: string;
	erros: TFiscalValidationError[];
}): TIcmsTaxResult {
	let vBC = 0;
	let pICMS = 0;
	let vICMS = 0;
	let vFCP = 0;

	const aplicaDebitoIcms = config.aliquotaIcms > 0;
	if (aplicaDebitoIcms) {
		vBC = round2(baseLiquida * (1 - config.percentualReducaoBc / 100));
		pICMS = config.aliquotaIcms;
		vICMS = round2((vBC * pICMS) / 100);
		if (config.aliquotaFcp > 0) vFCP = round2((vBC * config.aliquotaFcp) / 100);
	}

	let pCredSN: number | null = null;
	let vCredICMSSN: number | null = null;
	const csosnPermiteCredito = config.csosn === "101" || config.csosn === "201";
	if (csosnPermiteCredito) {
		if (config.percentualCreditoSn != null) {
			pCredSN = config.percentualCreditoSn;
			vCredICMSSN = round2((baseLiquida * pCredSN) / 100);
		} else {
			erros.push({
				codigo: "CREDITO_SN_AUSENTE",
				severidade: "ERRO",
				mensagem: `CSOSN ${config.csosn} permite credito de ICMS, mas o percentual de credito do Simples Nacional nao foi informado.`,
				produtoId,
			});
		}
	}

	// Coerencia entre CSOSN de substituicao tributaria e a flag de ST do grupo.
	const csosnIndicaSt = config.csosn === "201" || config.csosn === "202" || config.csosn === "203" || config.csosn === "500";
	if (csosnIndicaSt && !config.temSubstituicaoTributaria) {
		erros.push({
			codigo: "CSOSN_ST_INCOERENTE",
			severidade: "AVISO",
			mensagem: `CSOSN ${config.csosn} pressupoe substituicao tributaria, mas o grupo nao esta marcado com ST.`,
			produtoId,
		});
	}

	let st: TIcmsTaxResult["st"] = null;
	if (config.temSubstituicaoTributaria) {
		if (config.mvaSt != null && config.aliquotaInternaDestino != null) {
			const reducaoSt = config.percentualReducaoBcSt ?? 0;
			const vBCST = round2(baseLiquida * (1 + config.mvaSt / 100) * (1 - reducaoSt / 100));
			const pICMSST = config.aliquotaIcmsSt ?? config.aliquotaInternaDestino;
			const vICMSST = round2(Math.max((vBCST * pICMSST) / 100 - vICMS, 0));
			const vFCPST = config.aliquotaFcpSt > 0 ? round2((vBCST * config.aliquotaFcpSt) / 100) : 0;
			st = { vBCST, pMVAST: config.mvaSt, pICMSST, vICMSST, vFCPST };
		} else {
			erros.push({
				codigo: "ST_CONFIG_INCOMPLETA",
				severidade: "ERRO",
				mensagem: "Grupo tributario marcado com substituicao tributaria, mas faltam MVA e/ou aliquota interna de destino.",
				produtoId,
			});
		}
	}

	return {
		csosn: config.csosn,
		origem: origemCodigo,
		vBC,
		pICMS,
		vICMS,
		vFCP,
		pCredSN,
		vCredICMSSN,
		st,
	};
}

export type TComputeItemTaxationInput = {
	scenario: TFiscalTaxScenario;
	item: TFiscalItemInput;
	group: TFiscalTaxGroupWithRules;
	// Valor aproximado dos tributos (Lei 12.741). Resolvido externamente (tabela IBPT / provedor).
	vTotTrib?: number;
};

export function computeItemTaxation({ scenario, item, group, vTotTrib }: TComputeItemTaxationInput): TItemTaxResult {
	const erros: TFiscalValidationError[] = [];
	const baseLiquida = round2(item.valorBruto - item.valorDesconto);
	const origemCodigo = mapOrigemToCodigo(item.origemMercadoria);

	const config = resolveEffectiveTaxConfig(group, scenario);

	const cfopBase = resolveRuleCfopOverride(group, scenario) ?? item.cfopBase;
	const cfop = resolveCfop({ cfopBase, ufOrigem: scenario.ufOrigem, ufDestino: scenario.ufDestino });
	if (!cfop) {
		erros.push({ codigo: "CFOP_AUSENTE", severidade: "ERRO", mensagem: "CFOP nao pode ser resolvido para o item (sem CFOP no produto, regra ou operacao).", produtoId: item.produtoId });
	}

	const icms = computeIcms({ config, scenario, baseLiquida, origemCodigo, produtoId: item.produtoId, erros });
	const pis = computeContribuicao(config.cstPis, config.aliquotaPis, baseLiquida);
	const cofins = computeContribuicao(config.cstCofins, config.aliquotaCofins, baseLiquida);

	return {
		produtoId: item.produtoId,
		cfop,
		icms,
		pis: { cst: pis.cst, vBC: pis.vBC, pPIS: pis.pAliq, vPIS: pis.valor },
		cofins: { cst: cofins.cst, vBC: cofins.vBC, pCOFINS: cofins.pAliq, vCOFINS: cofins.valor },
		vTotTrib: round2(vTotTrib ?? 0),
		erros,
	};
}

export function computeDocumentTotals(items: { result: TItemTaxResult; valorBruto: number; valorDesconto: number }[]): TDocumentTaxTotals {
	const totals: TDocumentTaxTotals = {
		vBC: 0,
		vICMS: 0,
		vFCP: 0,
		vBCST: 0,
		vST: 0,
		vFCPST: 0,
		vProd: 0,
		vDesc: 0,
		vPIS: 0,
		vCOFINS: 0,
		vTotTrib: 0,
		vNF: 0,
	};

	for (const { result, valorBruto, valorDesconto } of items) {
		totals.vBC += result.icms.vBC;
		totals.vICMS += result.icms.vICMS;
		totals.vFCP += result.icms.vFCP;
		totals.vBCST += result.icms.st?.vBCST ?? 0;
		totals.vST += result.icms.st?.vICMSST ?? 0;
		totals.vFCPST += result.icms.st?.vFCPST ?? 0;
		totals.vProd += valorBruto;
		totals.vDesc += valorDesconto;
		totals.vPIS += result.pis.vPIS;
		totals.vCOFINS += result.cofins.vCOFINS;
		totals.vTotTrib += result.vTotTrib;
	}

	totals.vBC = round2(totals.vBC);
	totals.vICMS = round2(totals.vICMS);
	totals.vFCP = round2(totals.vFCP);
	totals.vBCST = round2(totals.vBCST);
	totals.vST = round2(totals.vST);
	totals.vFCPST = round2(totals.vFCPST);
	totals.vProd = round2(totals.vProd);
	totals.vDesc = round2(totals.vDesc);
	totals.vPIS = round2(totals.vPIS);
	totals.vCOFINS = round2(totals.vCOFINS);
	totals.vTotTrib = round2(totals.vTotTrib);
	// vNF = produtos - desconto + ST (frete/seguro/outros fora de escopo nesta fase)
	totals.vNF = round2(totals.vProd - totals.vDesc + totals.vST);

	return totals;
}
