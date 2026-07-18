import type { TAccessClientCategoryEnum, TAccessScopeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { accessClients } from "@/services/drizzle/schema";

// Scopes operacionais do fluxo POI — teto tanto do app mobile quanto do kiosk web.
export const POI_ACCESS_SCOPES: TAccessScopeEnum[] = [
	"poi:configuration:read",
	"poi:clients:read",
	"poi:clients:create",
	"poi:transactions:create",
	"poi:coupons:read",
	"poi:prizes:read",
];

type TNativeAccessClientDefinition = {
	codigo: string;
	nome: string;
	categoria: TAccessClientCategoryEnum;
	escoposPermitidos: TAccessScopeEnum[];
};
// Catálogo das aplicações nativas. Service accounts e parceiros são cadastrados por fluxo
// administrativo próprio, não por este catálogo.
export const NATIVE_ACCESS_CLIENTS: TNativeAccessClientDefinition[] = [
	{
		codigo: "RECOMPRA_POI_MOBILE",
		nome: "Aplicativo POI para tablets",
		categoria: "NATIVO_MOBILE",
		escoposPermitidos: POI_ACCESS_SCOPES,
	},
	{
		codigo: "RECOMPRA_POI_WEB",
		nome: "POI web (kiosk no navegador)",
		categoria: "NATIVO_WEB_KIOSK",
		escoposPermitidos: POI_ACCESS_SCOPES,
	},
];

// Upsert idempotente por código — seguro de rodar em deploy/seed repetidamente.
export async function ensureNativeAccessClients() {
	for (const definition of NATIVE_ACCESS_CLIENTS) {
		await db
			.insert(accessClients)
			.values({
				codigo: definition.codigo,
				nome: definition.nome,
				categoria: definition.categoria,
				nativo: true,
				escoposPermitidos: definition.escoposPermitidos,
			})
			.onConflictDoUpdate({
				target: accessClients.codigo,
				set: {
					nome: definition.nome,
					categoria: definition.categoria,
					nativo: true,
					escoposPermitidos: definition.escoposPermitidos,
					dataAtualizacao: new Date(),
				},
			});
	}
}
