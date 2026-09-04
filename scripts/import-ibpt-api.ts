/**
 * Valida ou atualiza a tabela IBPT (Lei 12.741) por UF.
 *
 * Uso seguro (somente valida e mostra resumo):
 *   npm run import:ibpt:api -- --uf=MG
 *
 * Aplicar no banco:
 *   npm run import:ibpt:api -- --uf=MG --apply
 *   npm run import:ibpt:api -- --all --apply
 */
import "dotenv/config";

import { IBPT_UFS, normalizeIbptUf, refreshIbptRates, type TIbptUf } from "@/lib/fiscal/ibpt-rates";
import { connection } from "@/services/drizzle";

function getArg(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function formatDate(value: Date) {
	return value.toISOString().slice(0, 10);
}

async function main() {
	const apply = hasFlag("apply");
	const ufs: TIbptUf[] = hasFlag("all") ? [...IBPT_UFS] : [normalizeIbptUf(getArg("uf"))];
	if (!apply) console.log("Modo validação: nenhuma alteração será feita. Use --apply para atualizar o banco.");

	const results = await refreshIbptRates({ ufs, apply });
	for (const result of results) {
		if (result.status === "FALHA") {
			console.error(`IBPT ${result.uf}: falha após ${result.tentativas} tentativas: ${result.erro}`);
			continue;
		}
		console.log(
			`IBPT ${result.uf}: ${result.registros} NCMs, versão ${result.versao}, vigência ${formatDate(result.vigenciaInicio)} a ${formatDate(result.vigenciaFim)} — ${result.status}.`,
		);
	}

	if (results.some((result) => result.status === "FALHA")) process.exitCode = 1;
	else console.log(apply ? "Atualização IBPT concluída." : "Validação IBPT concluída.");
}

void main()
	.catch((error) => {
		console.error("Falha na importação IBPT via API:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end().catch(() => undefined);
	});
