import "@/utils/scripts/load-next-env";

import { syncProductsForOrganization } from "@/lib/data-connectors";
import { connection } from "@/services/drizzle";

const SCRIPT_NAME = "SYNC-ORGANIZATION-PRODUCTS";

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const arg = process.argv.find((value) => value.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function getFirstArgValue(names: string[]) {
	for (const name of names) {
		const value = getArgValue(name);
		if (value) return value;
	}

	return null;
}

function printHelp() {
	console.log(`
Uso:
  npm run sync:organization-products -- --org=<organizationId>

Aliases:
  --orgId, --organizationId

Exemplo:
  npm run sync:organization-products -- --org=b75a88a2-ef7c-4ff5-a53c-4e227791cad3

Integrações suportadas:
  - CARDAPIO-WEB
  - NUVEM-SHOP
`);
}

function parseOptions() {
	if (hasFlag("help") || process.argv.includes("-h")) return null;

	const organizationId = getFirstArgValue(["org", "orgId", "organizationId"]);
	if (!organizationId) throw new Error("Informe --org=<organizationId>.");

	return { organizationId };
}

async function main() {
	const options = parseOptions();
	if (!options) {
		printHelp();
		return;
	}

	const startedAt = Date.now();

	console.log(`[${SCRIPT_NAME}] Iniciando sincronização de produtos`, {
		organizationId: options.organizationId,
	});

	const result = await syncProductsForOrganization({ organizationId: options.organizationId });
	const elapsedMs = Date.now() - startedAt;

	console.log(`[${SCRIPT_NAME}] Sincronização concluída em ${elapsedMs}ms.`);
	console.log(`[${SCRIPT_NAME}] Resultado`, result);
}

void main()
	.then(() => {
		process.exitCode = process.exitCode ?? 0;
	})
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] Falha ao sincronizar produtos.`);
		if (error?.isAxiosError) {
			console.error({
				message: error.message,
				status: error.response?.status,
				data: error.response?.data,
				url: error.config?.url,
				params: error.config?.params,
			});
		} else {
			console.error(
				error instanceof Error
					? {
							type: error.name,
							message: error.message,
							stack: error.stack,
						}
					: String(error),
			);
		}
		process.exit(1);
	})
	.finally(async () => {
		await connection.end().catch((error) => {
			console.error(`[${SCRIPT_NAME}] Erro ao fechar conexão com o banco:`, error instanceof Error ? error.message : String(error));
		});

		process.exit(process.exitCode ?? 0);
	});
