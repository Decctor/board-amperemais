import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPurchaseImportedDocumentPath } from "./imported-documents";

const REFERENCE = "8f14e45f-ceea-467a-9575-9a1b2c3d4e5f";

test("o caminho é escopado pela organização da sessão", () => {
	assert.equal(
		buildPurchaseImportedDocumentPath({ organizationId: "org-1", referencia: REFERENCE }),
		`organizations/org-1/purchase-imports/${REFERENCE}`,
	);
});

test("referência forjada não escapa do escopo da organização", () => {
	for (const referencia of ["../../organizations/org-2/bank-statements/x", "fiscal/qualquer-documento.xml", "/absoluto", `${REFERENCE}/../..`]) {
		assert.throws(() => buildPurchaseImportedDocumentPath({ organizationId: "org-1", referencia }), /Referência de documento importado inválida/);
	}
});
