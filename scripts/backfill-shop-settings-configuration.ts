import "dotenv/config";
import { DEFAULT_SHOP_SETTINGS_CONFIGURATION, ShopSettingsConfigurationSchema, type TShopSettingsConfiguration } from "@/schemas/shop";
import { connection, db } from "@/services/drizzle";
import { shopSettings } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

type TLegacyShopSettingsConfiguration = {
	headerCoverUrl?: unknown;
	headerCoverTipo?: unknown;
	aceitaRetirada?: unknown;
	aceitaEntrega?: unknown;
	produtos?: { modo?: unknown; produtoIds?: unknown; destaqueIds?: unknown };
	produtosEmDestaqueIds?: unknown;
	blocosComposicao?: unknown;
};

function migrateLegacyConfiguration(configuracoes: unknown): TShopSettingsConfiguration {
	const current = ShopSettingsConfigurationSchema.safeParse(configuracoes);
	if (current.success) return current.data;

	const config = typeof configuracoes === "object" && configuracoes !== null ? (configuracoes as TLegacyShopSettingsConfiguration) : {};
	const defaults = DEFAULT_SHOP_SETTINGS_CONFIGURATION;

	return ShopSettingsConfigurationSchema.parse({
		atendimento: {
			retirada: { ativo: config.aceitaRetirada ?? defaults.atendimento.retirada.ativo },
			entrega: {
				ativo: config.aceitaEntrega ?? defaults.atendimento.entrega.ativo,
				pedidoMinimo: defaults.atendimento.entrega.pedidoMinimo,
				prazoMinutos: defaults.atendimento.entrega.prazoMinutos,
			},
		},
		operacao: defaults.operacao,
		aparencia: {
			headerCoverUrl: config.headerCoverUrl ?? defaults.aparencia.headerCoverUrl,
			headerCoverTipo: config.headerCoverTipo ?? defaults.aparencia.headerCoverTipo,
			blocos: config.blocosComposicao ?? defaults.aparencia.blocos,
		},
		produtos: {
			...defaults.produtos,
			...config.produtos,
			destaqueIds: config.produtos?.destaqueIds ?? config.produtosEmDestaqueIds ?? defaults.produtos.destaqueIds,
		},
	});
}

function serializeCanonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(serializeCanonical).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${serializeCanonical(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

async function main() {
	const apply = process.argv.includes("--apply");
	const settings = await db.select().from(shopSettings);
	let changed = 0;

	for (const setting of settings) {
		const configuracoes = migrateLegacyConfiguration(setting.configuracoes);
		const needsUpdate = serializeCanonical(configuracoes) !== serializeCanonical(setting.configuracoes);

		console.log(`${setting.organizacaoId}: ${needsUpdate ? (apply ? "migrando" : "migracao pendente") : "ja atualizado"}.`);
		if (!needsUpdate) continue;

		changed += 1;
		if (apply) {
			await db.update(shopSettings).set({ configuracoes, dataAtualizacao: new Date() }).where(eq(shopSettings.id, setting.id));
		}
	}

	if (apply) {
		console.log(`${changed} configuracao(oes) migrada(s).`);
	} else if (changed === 0) {
		console.log("Nenhuma migracao pendente.");
	} else {
		console.log(`${changed} configuracao(oes) seriam migrada(s). Execute novamente com --apply para persistir.`);
	}
}

main()
	.catch((error) => {
		console.error("Falha no backfill das configuracoes da loja digital:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
