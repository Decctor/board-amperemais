import assert from "node:assert/strict";
import test from "node:test";
import { inspectFiscalFreightRemediation } from "./freight-rejection-remediation";

function document(overrides: Record<string, unknown> = {}) {
	return {
		id: "documento",
		statusInterno: "REJEITADO",
		codigoRejeicao: "217",
		mensagens: ["Rejeicao posterior"],
		provedorPayload: JSON.stringify({
			presenceType: "presence",
			items: [{ totalAmount: 28 }, { totalAmount: 17, discountAmount: 17 }],
			total: { freightAmount: 7, invoiceAmount: 35 },
			payments: [{ amount: 35 }],
		}),
		presencaConsumidorDeclarada: null,
		...overrides,
	};
}

test("seleciona documento com rejeicao 866 historica e frete ausente nos itens", () => {
	const result = inspectFiscalFreightRemediation({
		document: document(),
		rejectionHistory: ["Rejeicao 866: Ausencia de troco quando o valor dos pagamentos informados for maior que o total da nota"],
	});

	assert.equal(result.classification, "READY_FREIGHT");
	assert.deepEqual(result.metrics, {
		freightTotal: 7,
		itemFreightTotal: 0,
		invoiceTotal: 35,
		paymentTotal: 35,
		presenceType: "presence",
	});
});

test("separa para revisao documento que tambem possui problema de presenca", () => {
	const result = inspectFiscalFreightRemediation({
		document: document({ mensagens: ["Perfil fiscal configurado como operação presencial para uma venda online"] }),
		rejectionHistory: ["Rejeicao 866: Ausencia de troco quando o valor dos pagamentos informados for maior que o total da nota"],
	});

	assert.equal(result.classification, "REVIEW_PRESENCE");
});

test("nao seleciona rejeicao 866 quando o frete ja estava distribuido nos itens", () => {
	const result = inspectFiscalFreightRemediation({
		document: document({
			codigoRejeicao: "866",
			provedorPayload: JSON.stringify({
				items: [{ freightAmount: 7 }],
				total: { freightAmount: 7, invoiceAmount: 35 },
				payments: [{ amount: 35 }],
			}),
		}),
		rejectionHistory: [],
	});

	assert.equal(result.classification, "SKIP_NOT_FREIGHT");
});

test("a chave de acesso de um documento rejeitado nao e tratada como autorizacao", () => {
	const result = inspectFiscalFreightRemediation({
		document: document({ chaveAcesso: "1".repeat(44) }),
		rejectionHistory: ["Rejeicao 866: Ausencia de troco quando o valor dos pagamentos informados for maior que o total da nota"],
	});

	assert.equal(result.classification, "READY_FREIGHT");
});

test("nao seleciona documento que possui protocolo de autorizacao", () => {
	const result = inspectFiscalFreightRemediation({
		document: document({ protocolo: "protocolo" }),
		rejectionHistory: ["Rejeicao 866: Ausencia de troco quando o valor dos pagamentos informados for maior que o total da nota"],
	});

	assert.equal(result.classification, "SKIP_NOT_FREIGHT");
});
