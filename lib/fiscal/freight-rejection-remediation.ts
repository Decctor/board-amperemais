type TFiscalRemediationDocument = {
	id: string;
	statusInterno: string;
	codigoRejeicao: string | null;
	mensagens: string[] | null;
	provedorPayload: string | null;
	presencaConsumidorDeclarada: string | null;
	protocolo?: string | null;
	dataAutorizacao?: Date | null;
};

export type TFiscalFreightRemediationInspection = {
	classification: "READY_FREIGHT" | "REVIEW_PRESENCE" | "SKIP_NOT_FREIGHT";
	reasons: string[];
	checks: {
		freightMismatch: boolean;
		rejection866: boolean;
		presenceConflict: boolean;
		authorizationEvidence: boolean;
	};
	metrics: {
		freightTotal: number | null;
		itemFreightTotal: number | null;
		invoiceTotal: number | null;
		paymentTotal: number | null;
		presenceType: string | null;
	};
};

function normalizeText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asFiniteNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseProviderPayload(value: string | null): Record<string, unknown> | null {
	if (!value) return null;
	try {
		return asRecord(JSON.parse(value));
	} catch {
		return null;
	}
}

function toCents(value: number) {
	return Math.round((value + Number.EPSILON) * 100);
}

function hasRejection866(text: string) {
	const normalized = normalizeText(text);
	return /(^|\D)866(\D|$)/.test(normalized) || normalized.includes("ausencia de troco quando o valor dos pagamentos");
}

function hasPresenceProblem(text: string) {
	const normalized = normalizeText(text);
	return (
		/(^|\D)794(\D|$)/.test(normalized) ||
		normalized.includes("presenca") ||
		normalized.includes("internet") ||
		normalized.includes("online") ||
		normalized.includes("entrega a domicilio") ||
		normalized.includes("indpres")
	);
}

export function inspectFiscalFreightRemediation({
	document,
	rejectionHistory,
}: {
	document: TFiscalRemediationDocument;
	rejectionHistory: string[];
}): TFiscalFreightRemediationInspection {
	const reasons: string[] = [];
	const payload = parseProviderPayload(document.provedorPayload);
	const total = asRecord(payload?.total);
	const items = Array.isArray(payload?.items) ? payload.items : null;
	const payments = Array.isArray(payload?.payments) ? payload.payments : null;
	const freightTotal = asFiniteNumber(total?.freightAmount);
	const invoiceTotal = asFiniteNumber(total?.invoiceAmount);
	const presenceType = typeof payload?.presenceType === "string" ? payload.presenceType : null;
	const itemFreightTotal = items ? items.reduce((sum, item) => sum + (asFiniteNumber(asRecord(item)?.freightAmount) ?? 0), 0) : null;
	const paymentTotal = payments ? payments.reduce((sum, payment) => sum + (asFiniteNumber(asRecord(payment)?.amount) ?? 0), 0) : null;
	const evidence = [document.codigoRejeicao ?? "", ...(document.mensagens ?? []), ...rejectionHistory];
	const freightRejection = evidence.some(hasRejection866);
	const presenceProblem = evidence.some(hasPresenceProblem);
	const freightMismatch =
		freightTotal !== null && freightTotal > 0 && itemFreightTotal !== null && toCents(freightTotal) !== toCents(itemFreightTotal);
	// A chave de acesso e formada antes da autorizacao e tambem existe em documentos rejeitados.
	// Protocolo ou data de autorizacao, por outro lado, impedem qualquer tentativa de reemissao.
	const hasAuthorizationEvidence = Boolean(document.protocolo || document.dataAutorizacao);

	if (!["REJEITADO", "ERRO"].includes(document.statusInterno)) reasons.push(`status atual ${document.statusInterno}`);
	if (!payload) reasons.push("payload do provedor ausente ou invalido");
	if (!freightRejection) reasons.push("sem evidencia historica da rejeicao 866");
	if (!freightMismatch) reasons.push("payload nao apresenta divergencia entre frete total e frete dos itens");
	if (hasAuthorizationEvidence) reasons.push("documento possui protocolo ou data de autorizacao e nao pode ser reemitido automaticamente");

	if (document.presencaConsumidorDeclarada) {
		reasons.push(`possui declaracao excepcional de presenca (${document.presencaConsumidorDeclarada})`);
	}
	if (presenceProblem) reasons.push("historico contem rejeicao ou erro relacionado a presenca do consumidor");

	const hasPresenceConflict = Boolean(document.presencaConsumidorDeclarada) || presenceProblem;
	const isFreightCandidate =
		["REJEITADO", "ERRO"].includes(document.statusInterno) && Boolean(payload) && freightRejection && freightMismatch && !hasAuthorizationEvidence;

	return {
		classification: hasPresenceConflict ? "REVIEW_PRESENCE" : isFreightCandidate ? "READY_FREIGHT" : "SKIP_NOT_FREIGHT",
		reasons,
		checks: {
			freightMismatch,
			rejection866: freightRejection,
			presenceConflict: hasPresenceConflict,
			authorizationEvidence: hasAuthorizationEvidence,
		},
		metrics: { freightTotal, itemFreightTotal, invoiceTotal, paymentTotal, presenceType },
	};
}
