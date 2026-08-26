/**
 * Normaliza UF e cidade dos clientes já gravados para a forma canônica: UF em sigla de duas letras,
 * cidade em caixa alta com a acentuação oficial do IBGE.
 *
 * O dado entrou torto porque cada integração grava o endereço no formato da sua API — a NuvemShop
 * manda `billing_province` por extenso ("Paraná"). Isso quebra três consumidores que comparam por
 * igualdade exata: o escopo fiscal (CFOP intra vs interestadual), os filtros de público de campanha
 * e o payload do provedor fiscal. O helper `lib/geo/brazilian-locations` passou a normalizar na
 * escrita; este script corrige o passivo.
 *
 * Uso:
 *   npx tsx ./scripts/normalize-client-locations.ts --org=<organizacaoId>
 *   npx tsx ./scripts/normalize-client-locations.ts --org=<organizacaoId> --apply
 *   npx tsx ./scripts/normalize-client-locations.ts --all
 *   npx tsx ./scripts/normalize-client-locations.ts --all --apply
 *
 * Sem `--apply` nada é gravado: o script apenas relata o que mudaria.
 */
import "dotenv/config";

import { isKnownCityForUf, normalizeCityName, normalizeUf } from "@/lib/geo/brazilian-locations";
import { connection, db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

function getArg(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

type TClientRow = {
	id: string;
	organizacao_id: string;
	nome: string | null;
	localizacao_estado: string | null;
	localizacao_cidade: string | null;
};

type TChange = {
	id: string;
	organizacaoId: string;
	nome: string | null;
	estadoDe: string | null;
	estadoPara: string | null;
	cidadeDe: string | null;
	cidadePara: string | null;
	// UF que o script não conseguiu resolver — vira null e precisa de atenção humana.
	perdeuEstado: boolean;
	cidadeForaDaLista: boolean;
};

async function main() {
	const organizationId = getArg("org") ?? getArg("orgId");
	const all = hasFlag("all");
	const apply = hasFlag("apply");

	if (!organizationId && !all) {
		console.error("Informe --org=<organizacaoId> ou --all.");
		process.exitCode = 1;
		return;
	}

	const rows = (
		organizationId
			? await connection`
				select id, organizacao_id, nome, localizacao_estado, localizacao_cidade
				from ampmais_clients where organizacao_id = ${organizationId}`
			: await connection`
				select id, organizacao_id, nome, localizacao_estado, localizacao_cidade
				from ampmais_clients`
	) as unknown as TClientRow[];

	console.log(`Escopo: ${organizationId ?? "TODAS AS ORGANIZAÇÕES"} — ${rows.length} clientes.`);

	const changes: TChange[] = [];
	let semLocalizacao = 0;
	let jaNormalizados = 0;

	for (const row of rows) {
		if (!row.localizacao_estado && !row.localizacao_cidade) {
			semLocalizacao++;
			continue;
		}

		const estadoPara = normalizeUf(row.localizacao_estado);
		const cidadePara = normalizeCityName(row.localizacao_cidade, estadoPara ?? row.localizacao_estado);

		if (estadoPara === row.localizacao_estado && cidadePara === row.localizacao_cidade) {
			jaNormalizados++;
			continue;
		}

		changes.push({
			id: row.id,
			organizacaoId: row.organizacao_id,
			nome: row.nome,
			estadoDe: row.localizacao_estado,
			estadoPara,
			cidadeDe: row.localizacao_cidade,
			cidadePara,
			perdeuEstado: Boolean(row.localizacao_estado) && !estadoPara,
			cidadeForaDaLista: Boolean(cidadePara) && !isKnownCityForUf(cidadePara, estadoPara),
		});
	}

	console.log("\n=== RESUMO ===");
	console.log({
		clientes: rows.length,
		semLocalizacao,
		jaNormalizados,
		aAtualizar: changes.length,
		ufNaoResolvida: changes.filter((change) => change.perdeuEstado).length,
		cidadeForaDaListaOficial: changes.filter((change) => change.cidadeForaDaLista).length,
	});

	const porTransformacao = new Map<string, number>();
	for (const change of changes) {
		const key = `${change.estadoDe ?? "(null)"} -> ${change.estadoPara ?? "(null)"}`;
		porTransformacao.set(key, (porTransformacao.get(key) ?? 0) + 1);
	}
	console.log("\n=== TRANSFORMAÇÕES DE UF ===");
	console.table(Object.fromEntries([...porTransformacao.entries()].sort((a, b) => b[1] - a[1]).map(([key, total]) => [key, { clientes: total }])));

	const perdas = changes.filter((change) => change.perdeuEstado);
	if (perdas.length) {
		// Zerar a UF é destrutivo: sem ela o escopo fiscal cai para intraestadual por padrão.
		console.log("\n!!! UF NÃO RESOLVIDA — estes clientes ficariam SEM estado:");
		for (const change of perdas.slice(0, 20)) {
			console.log(`  - ${change.nome ?? change.id}: "${change.estadoDe}" (cidade: ${change.cidadeDe ?? "-"})`);
		}
		if (perdas.length > 20) console.log(`  ... e mais ${perdas.length - 20}.`);
	}

	console.log("\n=== AMOSTRA DE MUDANÇAS ===");
	for (const change of changes.slice(0, 15)) {
		const estado = change.estadoDe !== change.estadoPara ? `UF "${change.estadoDe}" -> "${change.estadoPara}"` : null;
		const cidade = change.cidadeDe !== change.cidadePara ? `cidade "${change.cidadeDe}" -> "${change.cidadePara}"` : null;
		console.log(`  ${change.nome ?? change.id}: ${[estado, cidade].filter(Boolean).join(" | ")}`);
	}

	if (!apply) {
		console.log("\nDRY-RUN: nada gravado. Rode com --apply para aplicar.");
		return;
	}
	if (!changes.length) {
		console.log("\nNada a atualizar.");
		return;
	}

	// UF irreconhecível ("0", "XX", "EX") mantém o valor original em vez de virar null: normalizar
	// não pode apagar dado. A cidade, essa sim, continua sendo corrigida — são campos independentes,
	// e descartar a correção de cidade por causa da UF só espalharia o problema.
	const ufPreservadas = changes.filter((change) => change.perdeuEstado).length;
	if (ufPreservadas > 0) {
		console.log(`\n${ufPreservadas} cliente(s) com UF não resolvida: o valor original da UF será PRESERVADO (só a cidade é normalizada).`);
	}

	let atualizados = 0;
	let apenasCidade = 0;
	await db.transaction(async (tx) => {
		for (const change of changes) {
			const estadoFinal = change.perdeuEstado ? change.estadoDe : change.estadoPara;
			if (change.perdeuEstado) apenasCidade++;
			await tx
				.update(clients)
				.set({ localizacaoEstado: estadoFinal, localizacaoCidade: change.cidadePara })
				.where(eq(clients.id, change.id));
			atualizados++;
			if (atualizados % 200 === 0) console.log(`  ${atualizados}/${changes.length}...`);
		}
	});

	console.log(`\nOK: ${atualizados} cliente(s) atualizado(s) — ${apenasCidade} com a UF original preservada.`);
}

main()
	.then(async () => {
		await connection.end();
	})
	.catch(async (error) => {
		console.error("Falha na normalização:", error instanceof Error ? error.message : error);
		await connection.end();
		process.exit(1);
	});
