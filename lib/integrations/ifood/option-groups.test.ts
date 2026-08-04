import assert from "node:assert/strict";
import test from "node:test";
import { describeOptionGroupRequirement, findOptionGroupIssue, validateIfoodOptionGroups } from "./option-groups";

const OPCOES = [{ nome: "Coca" }, { nome: "Guaraná" }];

test("grupo bem formado não gera aviso", () => {
	assert.deepEqual(validateIfoodOptionGroups([{ nome: "Bebida", min: 0, max: 1, opcoes: OPCOES }]), []);
});

test("mínimo maior que o máximo é apontado no campo mínimo", () => {
	const issues = validateIfoodOptionGroups([{ nome: "Bebida", min: 2, max: 1, opcoes: OPCOES }]);
	assert.equal(findOptionGroupIssue(issues, 0, "min"), "O mínimo não pode ser maior que o máximo.");
});

test("máximo acima da quantidade de opções é bloqueado — item viraria não vendível", () => {
	const issues = validateIfoodOptionGroups([{ nome: "Bebida", min: 1, max: 5, opcoes: OPCOES }]);
	assert.equal(findOptionGroupIssue(issues, 0, "max"), "O máximo não pode passar de 2 — é quantas opções o grupo tem.");
});

test("grupo sem opção e opção sem nome são apontados", () => {
	assert.equal(
		findOptionGroupIssue(validateIfoodOptionGroups([{ nome: "Bebida", min: 0, max: 1, opcoes: [] }]), 0, "opcoes"),
		"Adicione ao menos uma opção.",
	);
	const semNome = validateIfoodOptionGroups([{ nome: "Bebida", min: 0, max: 1, opcoes: [{ nome: "  " }] }]);
	assert.equal(findOptionGroupIssue(semNome, 0, "opcoes"), "Toda opção precisa de um nome.");
});

test("avisos carregam o índice do grupo que os gerou", () => {
	const issues = validateIfoodOptionGroups([
		{ nome: "Bebida", min: 0, max: 1, opcoes: OPCOES },
		{ nome: "", min: 0, max: 1, opcoes: OPCOES },
	]);
	assert.equal(issues.length, 1);
	assert.equal(issues[0].indiceGrupo, 1);
});

test("resumo de obrigatoriedade cobre os quatro formatos", () => {
	assert.equal(describeOptionGroupRequirement({ min: 0, max: 1 }), "Opcional — o cliente escolhe no máximo 1");
	assert.equal(describeOptionGroupRequirement({ min: 0, max: 5 }), "Opcional — o cliente escolhe até 5");
	assert.equal(describeOptionGroupRequirement({ min: 1, max: 1 }), "Obrigatório — o cliente escolhe exatamente 1");
	assert.equal(describeOptionGroupRequirement({ min: 2, max: 3 }), "Obrigatório — o cliente escolhe de 2 a 3");
});
