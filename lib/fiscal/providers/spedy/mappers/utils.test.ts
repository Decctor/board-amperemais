import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeNfeText } from "./utils";

test("remove emoji do nome do destinatario", () => {
	assert.equal(sanitizeNfeText("Leonardo 🧸", 60), "Leonardo");
});

test("preserva caracteres latinos usados em nomes brasileiros", () => {
	assert.equal(sanitizeNfeText("João D'Ávila & Filhos", 60), "João D'Ávila & Filhos");
});

test("normaliza pontuacao Unicode e espacos antes de limitar o tamanho", () => {
	assert.equal(sanitizeNfeText("  Ana “Bia” — Silva\n", 17), 'Ana "Bia" - Silva');
});

test("nao envia texto composto somente por caracteres invalidos", () => {
	assert.equal(sanitizeNfeText("🧸🎉", 60), undefined);
});
