import assert from "node:assert/strict";
import test from "node:test";
import type { AxiosInstance } from "axios";
import { fetchSpedyInvoice } from "./documents";

test("consulta NFC-e passivamente pelo endpoint de leitura", async () => {
	const calls: string[] = [];
	const client = {
		get: async (url: string) => {
			calls.push(url);
			return { data: { id: "spedy-document", status: "enqueued" } };
		},
	} as Pick<AxiosInstance, "get">;

	const result = await fetchSpedyInvoice(client, {
		tipo: "NFCE",
		provedorDocumentoId: "spedy-document",
	});

	assert.equal(result.status, "enqueued");
	assert.deepEqual(calls, ["/v1/consumer-invoices/spedy-document"]);
});

test("consulta NF-e passivamente pelo endpoint de leitura", async () => {
	const calls: string[] = [];
	const client = {
		get: async (url: string) => {
			calls.push(url);
			return { data: { id: "spedy-document", status: "authorized" } };
		},
	} as Pick<AxiosInstance, "get">;

	await fetchSpedyInvoice(client, {
		tipo: "NFE",
		provedorDocumentoId: "spedy-document",
	});

	assert.deepEqual(calls, ["/v1/product-invoices/spedy-document"]);
});
