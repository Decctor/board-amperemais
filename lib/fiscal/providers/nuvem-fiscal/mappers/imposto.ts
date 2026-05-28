import type { TItemTaxResult } from "@/lib/fiscal/engine";

// Monta o grupo ICMS do Simples Nacional (ICMSSNxxx) conforme o leiaute NF-e 4.00.
function buildIcmsNode(icms: TItemTaxResult["icms"]) {
	const orig = icms.origem;
	const credito = icms.pCredSN != null && icms.vCredICMSSN != null ? { pCredSN: icms.pCredSN, vCredICMSSN: icms.vCredICMSSN } : {};
	const stForward = icms.st ? { modBCST: 4, pMVAST: icms.st.pMVAST, vBCST: icms.st.vBCST, pICMSST: icms.st.pICMSST, vICMSST: icms.st.vICMSST } : {};

	switch (icms.csosn) {
		case "101":
			return { ICMS: { ICMSSN101: { orig, CSOSN: "101", ...credito } } };
		case "201":
			return { ICMS: { ICMSSN201: { orig, CSOSN: "201", ...stForward, ...credito } } };
		case "202":
		case "203":
			return { ICMS: { [`ICMSSN${icms.csosn}`]: { orig, CSOSN: icms.csosn, ...stForward } } };
		case "500":
			return { ICMS: { ICMSSN500: { orig, CSOSN: "500", ...(icms.st ? { vBCSTRet: icms.st.vBCST, vICMSSTRet: icms.st.vICMSST } : {}) } } };
		case "900":
			return {
				ICMS: {
					ICMSSN900: {
						orig,
						CSOSN: "900",
						modBC: 3,
						vBC: icms.vBC,
						pICMS: icms.pICMS,
						vICMS: icms.vICMS,
						...stForward,
						...credito,
					},
				},
			};
		default:
			// 102, 103, 300, 400 -> sem tributacao/credito de ICMS
			return { ICMS: { ICMSSN102: { orig, CSOSN: icms.csosn } } };
	}
}

function buildPisNode(pis: TItemTaxResult["pis"]) {
	if (pis.cst === "01" || pis.cst === "02") {
		return { PIS: { PISAliq: { CST: pis.cst, vBC: pis.vBC, pPIS: pis.pPIS, vPIS: pis.vPIS } } };
	}
	if (pis.cst === "49" || pis.cst === "99") {
		return { PIS: { PISOutr: { CST: pis.cst, vBC: pis.vBC, pPIS: pis.pPIS, vPIS: pis.vPIS } } };
	}
	// 04-09: nao tributado
	return { PIS: { PISNT: { CST: pis.cst } } };
}

function buildCofinsNode(cofins: TItemTaxResult["cofins"]) {
	if (cofins.cst === "01" || cofins.cst === "02") {
		return { COFINS: { COFINSAliq: { CST: cofins.cst, vBC: cofins.vBC, pCOFINS: cofins.pCOFINS, vCOFINS: cofins.vCOFINS } } };
	}
	if (cofins.cst === "49" || cofins.cst === "99") {
		return { COFINS: { COFINSOutr: { CST: cofins.cst, vBC: cofins.vBC, pCOFINS: cofins.pCOFINS, vCOFINS: cofins.vCOFINS } } };
	}
	return { COFINS: { COFINSNT: { CST: cofins.cst } } };
}

// Bloco "imposto" completo de um item de NF-e/NFC-e.
export function buildItemImposto(result: TItemTaxResult) {
	return {
		vTotTrib: result.vTotTrib,
		...buildIcmsNode(result.icms),
		...buildPisNode(result.pis),
		...buildCofinsNode(result.cofins),
	};
}
