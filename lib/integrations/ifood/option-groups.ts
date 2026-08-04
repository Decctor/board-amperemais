/**
 * Regras de `min`/`max` dos grupos de complementos, isoladas para valerem igual na UI (aviso inline,
 * antes do submit) e no gate do botão de salvar.
 *
 * A regra que mais dói é a última: um grupo obrigatório que pede mais escolhas do que tem opções é
 * aceito pelo iFood no cadastro, e só depois o item aparece em `unsellableItems` com
 * `OPTION_GROUP_WITHOUT_AVAILABLE_OPTIONS`. O lojista vê "salvo com sucesso" e o item não vende.
 */

export type TOptionGroupValidationTarget = {
	nome: string;
	min: number;
	max: number;
	opcoes: { nome: string }[];
};

export type TOptionGroupIssueField = "nome" | "min" | "max" | "opcoes";

export type TOptionGroupIssue = {
	indiceGrupo: number;
	campo: TOptionGroupIssueField;
	mensagem: string;
};

export function validateIfoodOptionGroups(grupos: TOptionGroupValidationTarget[]): TOptionGroupIssue[] {
	const issues: TOptionGroupIssue[] = [];

	grupos.forEach((grupo, indiceGrupo) => {
		if (!grupo.nome.trim()) {
			issues.push({ indiceGrupo, campo: "nome", mensagem: "Dê um nome ao grupo." });
		}

		if (grupo.opcoes.length === 0) {
			issues.push({ indiceGrupo, campo: "opcoes", mensagem: "Adicione ao menos uma opção." });
		}

		if (grupo.opcoes.some((opcao) => !opcao.nome.trim())) {
			issues.push({ indiceGrupo, campo: "opcoes", mensagem: "Toda opção precisa de um nome." });
		}

		if (grupo.min < 0) {
			issues.push({ indiceGrupo, campo: "min", mensagem: "O mínimo não pode ser negativo." });
		}

		if (grupo.max < 1) {
			issues.push({ indiceGrupo, campo: "max", mensagem: "O máximo precisa ser ao menos 1." });
		}

		if (grupo.min > grupo.max) {
			issues.push({ indiceGrupo, campo: "min", mensagem: "O mínimo não pode ser maior que o máximo." });
		}

		if (grupo.opcoes.length > 0 && grupo.max > grupo.opcoes.length) {
			issues.push({
				indiceGrupo,
				campo: "max",
				mensagem: `O máximo não pode passar de ${grupo.opcoes.length} — é quantas opções o grupo tem.`,
			});
		}
	});

	return issues;
}

/** Primeira mensagem de um campo específico, para exibir embaixo do input. */
export function findOptionGroupIssue(issues: TOptionGroupIssue[], indiceGrupo: number, campo: TOptionGroupIssueField): string | null {
	return issues.find((issue) => issue.indiceGrupo === indiceGrupo && issue.campo === campo)?.mensagem ?? null;
}

/** Resumo humano da obrigatoriedade, para o usuário entender min/max sem decorar a tabela do iFood. */
export function describeOptionGroupRequirement({ min, max }: { min: number; max: number }): string {
	if (min === 0) return max === 1 ? "Opcional — o cliente escolhe no máximo 1" : `Opcional — o cliente escolhe até ${max}`;
	if (min === max) return min === 1 ? "Obrigatório — o cliente escolhe exatamente 1" : `Obrigatório — o cliente escolhe exatamente ${min}`;
	return `Obrigatório — o cliente escolhe de ${min} a ${max}`;
}
