import assert from "node:assert/strict";
import test from "node:test";
import { formatAvailabilityForClient } from "./product-availability";

const DISPONIVEL = { disponibilidade: "DISPONIVEL", quantidade: 3 } as const;
const NAO_RASTREADO = { disponibilidade: "NAO_RASTREADO", quantidade: null } as const;

test("oculto não devolve nenhum campo", () => {
	// Camada 3 do padrão dos preços: campo omitido, não nulo. `disponibilidade: null` chegaria ao
	// modelo como falta.
	assert.deepEqual(formatAvailabilityForClient(DISPONIVEL, "OCULTO"), {});
	assert.deepEqual(formatAvailabilityForClient(NAO_RASTREADO, "OCULTO"), {});
});

test("disponibilidade devolve o estado sem o número", () => {
	assert.deepEqual(formatAvailabilityForClient(DISPONIVEL, "DISPONIBILIDADE"), { disponibilidade: "DISPONIVEL" });
});

test("quantidade devolve estado e saldo", () => {
	assert.deepEqual(formatAvailabilityForClient(DISPONIVEL, "QUANTIDADE"), { disponibilidade: "DISPONIVEL", quantidade: 3 });
});

test("saldo desconhecido é omitido mesmo sob QUANTIDADE", () => {
	assert.deepEqual(formatAvailabilityForClient(NAO_RASTREADO, "QUANTIDADE"), { disponibilidade: "NAO_RASTREADO" });
});

test("saldo zero é um dado real e continua no payload", () => {
	// `quantidade: 0` só é perigoso quando inventado. Vindo de rastreamento ativo, é informação.
	assert.deepEqual(formatAvailabilityForClient({ disponibilidade: "ESGOTADO", quantidade: 0 }, "QUANTIDADE"), {
		disponibilidade: "ESGOTADO",
		quantidade: 0,
	});
});
