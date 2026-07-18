import "dotenv/config";
import { NATIVE_ACCESS_CLIENTS, ensureNativeAccessClients } from "@/lib/access/clients-catalog";
import { connection } from "@/services/drizzle";

async function main() {
	await ensureNativeAccessClients();
	console.log(
		"[SEED] Aplicações clientes nativas garantidas:",
		NATIVE_ACCESS_CLIENTS.map((client) => client.codigo).join(", "),
	);
}

main()
	.catch((error) => {
		console.error("[SEED] Erro ao garantir aplicações clientes nativas", error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
