import "dotenv/config";
import { connection } from "@/services/drizzle";
import { writeFileSync } from "node:fs";

/**
 * Exporta a planilha de classificacao fiscal dos produtos vendidos que ainda nao tem perfil.
 *
 * Read-only: nao grava nada no banco. Para cada produto sugere NCM/CFOP/grupo tributario a partir
 * dos perfis que ja existem na organizacao, sempre com o motivo e o nivel de confianca da sugestao
 * — NCM e decisao fiscal, entao a coluna `ncm_confirmado` nasce vazia para o contador preencher.
 *
 * A tabela IBPT entra como apoio, nunca como fonte da sugestao: valida que o NCM existe na UF,
 * traz a descricao oficial ao lado da sugestao e, para os produtos sem referencia, monta uma lista
 * curta de candidatos por palavra-chave. Descricao IBPT nao identifica NCM sozinha ("agua" casa com
 * 108 NCMs), entao ela orienta a leitura do contador em vez de decidir.
 *
 * Uso: npx tsx ./scripts/export-missing-fiscal-profiles.ts --org=<id> [--days=90] [--out=arquivo.csv]
 */

function arg(name: string, fallback?: string) {
	const found = process.argv.find((value) => value.startsWith(`--${name}=`));
	return found ? found.slice(name.length + 3) : fallback;
}

// Normalizacao para casar nomes: sem acento, sem pontuacao, sem tamanho/variacao.
function normalizeName(name: string) {
	return name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function baseName(name: string) {
	return normalizeName(name)
		.replace(/\b\d+\s?(ml|g|kg|l)\b/g, " ")
		.replace(/\bate \d+ sabores?\b/g, " ")
		.replace(/\b\d+ sabores?\b/g, " ")
		.replace(/\b(meia|avulso|avulsa|zero)\b/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

type TProfiledProduct = {
	nome: string;
	grupo: string;
	ncm: string;
	cfop_padrao: string | null;
	grupo_tributario_id: string | null;
	grupo_tributario_nome: string | null;
};

function csvCell(value: unknown) {
	const text = value === null || value === undefined ? "" : String(value);
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
	const orgId = arg("org");
	if (!orgId) throw new Error("Informe --org=<organizacaoId>.");
	const days = Number(arg("days", "90"));
	const outPath = arg("out", "perfis-fiscais-pendentes.csv") as string;

	const profiled = (await connection`
		select p.nome, p.grupo, f.ncm, f.cfop_padrao, f.grupo_tributario_id, g.nome as grupo_tributario_nome
		from ampmais_product_fiscal_profiles f
		join ampmais_products p on p.id = f.produto_id
		left join ampmais_fiscal_tax_groups g on g.id = f.grupo_tributario_id
		where f.organizacao_id = ${orgId} and f.produto_variante_id is null and f.ativo`) as unknown as TProfiledProduct[];

	if (profiled.length === 0) throw new Error("Organizacao nao tem nenhum perfil fiscal — nao ha base para sugerir.");

	// Constantes da organizacao: valor mais frequente entre os perfis existentes.
	const [constantes] = await connection`
		select mode() within group (order by cest) as cest,
			mode() within group (order by unidade_comercial) as unidade_comercial,
			mode() within group (order by origem_mercadoria) as origem_mercadoria
		from ampmais_product_fiscal_profiles
		where organizacao_id = ${orgId} and produto_variante_id is null and ativo`;

	const missing = await connection`
		with vendidos as (
			select i.produto_id, count(*) as vezes, max(s.data_venda)::date as ultima_venda
			from ampmais_sale_items i join ampmais_sales s on s.id = i.venda_id
			where s.organizacao_id = ${orgId} and s.data_venda > now() - (${days} || ' days')::interval
			group by i.produto_id
		)
		select p.id, p.nome, p.grupo, coalesce(p.ncm,'') as ncm_produto, v.vezes, v.ultima_venda
		from ampmais_products p
		join vendidos v on v.produto_id = p.id
		left join ampmais_product_fiscal_profiles f
			on f.produto_id = p.id and f.organizacao_id = ${orgId} and f.produto_variante_id is null and f.ativo
		where p.organizacao_id = ${orgId} and f.id is null
		order by v.vezes desc`;

	const profiledIndexed = profiled.map((item) => ({ item, base: baseName(item.nome), exact: normalizeName(item.nome) }));

	// Familia = os dois primeiros termos do nome-base ("petit gateau", "torta de", "gelato").
	// So vira sugestao quando TODA a familia concorda no NCM: "Adicional Trufado" e "Adicional
	// Trufado de Pistache" tem NCMs diferentes, entao a familia inteira volta como indecidivel.
	function familyKey(name: string) {
		return baseName(name).split(" ").slice(0, 2).join(" ");
	}

	function unanimous(candidates: Array<{ item: TProfiledProduct; base: string }>) {
		if (candidates.length === 0) return null;
		if (new Set(candidates.map((candidate) => candidate.item.ncm)).size > 1) return null;
		// Referencia = o nome mais especifico da familia, que e o mais parecido com o produto.
		return candidates.reduce((best, candidate) => (candidate.base.length > best.base.length ? candidate : best)).item;
	}

	function resolveMatch(nome: string, grupo: string) {
		const exact = unanimous(profiledIndexed.filter((candidate) => candidate.exact === normalizeName(nome)));
		if (exact) return { match: exact, confianca: "ALTA", motivo: "NOME_IDENTICO" };

		const key = familyKey(nome);
		if (key.length >= 3) {
			const family = profiledIndexed.filter((candidate) => familyKey(candidate.item.nome) === key);
			if (family.length > 0) {
				const match = unanimous(family);
				if (match) return { match, confianca: "MEDIA", motivo: "MESMA_FAMILIA_DE_NOME" };
				// Familia existe mas diverge: nao adianta cair no grupo, a decisao e do contador.
				return { match: null, confianca: "NENHUMA", motivo: "FAMILIA_COM_NCM_DIVERGENTE" };
			}
		}

		const byGroup = unanimous(profiledIndexed.filter((candidate) => candidate.item.grupo === grupo));
		if (byGroup) return { match: byGroup, confianca: "MEDIA", motivo: "MESMO_GRUPO_NCM_UNICO" };

		return { match: null, confianca: "NENHUMA", motivo: "SEM_REFERENCIA_CLASSIFICAR_MANUALMENTE" };
	}

	const [orgRow] = await connection`
		select fiscal_configuracao -> 'endereco' ->> 'uf' as uf from ampmais_organizations where id = ${orgId}`;
	const uf = ((arg("uf") ?? (orgRow?.uf as string | undefined) ?? "") as string).toUpperCase();
	const ibpt = uf
		? ((await connection`
				select ncm, descricao from ampmais_fiscal_ibpt_rates
				where uf = ${uf} and coalesce(descricao,'') <> ''`) as unknown as Array<{ ncm: string; descricao: string }>)
		: [];
	if (uf && ibpt.length === 0) console.warn(`Aviso: nenhuma linha IBPT para a UF ${uf} — validacao e candidatos ficam vazios.`);

	const ibptByNcm = new Map<string, string[]>();
	for (const rate of ibpt) {
		const list = ibptByNcm.get(rate.ncm) ?? [];
		if (!list.includes(rate.descricao)) list.push(rate.descricao);
		ibptByNcm.set(rate.ncm, list);
	}
	const ncmsDaOrganizacao = new Set(profiled.map((item) => item.ncm));

	const STOPWORDS = new Set([
		"avulso",
		"avulsa",
		"sabor",
		"sabores",
		"para",
		"com",
		"sem",
		"meia",
		"zero",
		"premium",
		"tradicional",
		"grande",
		"medio",
		"pequeno",
	]);
	const ibptIndexed = ibpt.map((rate) => ({ ...rate, texto: normalizeName(rate.descricao) }));

	// Candidatos IBPT: score = termos do nome do produto achados na descricao, com desempate a favor
	// dos NCMs que a organizacao ja usa (o conjunto real dela e um prior muito melhor que a NCM inteira).
	function ibptCandidates(nome: string) {
		const tokens = [...new Set(baseName(nome).split(" "))].filter((token) => token.length >= 4 && !STOPWORDS.has(token));
		if (tokens.length === 0 || ibptIndexed.length === 0) return "";

		const scored = new Map<string, { score: number; descricao: string }>();
		for (const rate of ibptIndexed) {
			// Compara pelo radical (5 letras): "bolachinha" precisa achar "bolachas", "tortas" achar "torta".
			const score = tokens.reduce((sum, token) => sum + (rate.texto.includes(token.slice(0, 5)) ? 1 : 0), 0);
			if (score === 0) continue;
			const boosted = score + (ncmsDaOrganizacao.has(rate.ncm) ? 0.5 : 0);
			const current = scored.get(rate.ncm);
			if (!current || boosted > current.score) scored.set(rate.ncm, { score: boosted, descricao: rate.descricao });
		}

		return [...scored.entries()]
			.sort((a, b) => b[1].score - a[1].score || a[1].descricao.length - b[1].descricao.length)
			.slice(0, 3)
			.map(([ncm, entry]) => `${ncm} (${entry.descricao.slice(0, 70)})`)
			.join(" | ");
	}

	const header = [
		"produto_id",
		"produto_nome",
		"grupo",
		"vezes_vendido",
		"ultima_venda",
		"ncm_no_produto",
		"confianca",
		"motivo",
		"referencia",
		"ncm_sugerido",
		"ncm_sugerido_descricao_ibpt",
		"ncm_sugerido_existe_no_ibpt",
		"ncm_candidatos_ibpt",
		"cfop_sugerido",
		"grupo_tributario_id_sugerido",
		"grupo_tributario_nome",
		"cest",
		"unidade_comercial",
		"origem_mercadoria",
		"ncm_confirmado",
		"cfop_confirmado",
		"grupo_tributario_id_confirmado",
	];
	const lines = [header.join(",")];
	const tally = { ALTA: 0, MEDIA: 0, NENHUMA: 0 };

	for (const product of missing as unknown as Array<Record<string, string>>) {
		const { match, confianca, motivo } = resolveMatch(product.nome, product.grupo);
		tally[confianca as keyof typeof tally] += 1;

		lines.push(
			[
				product.id,
				product.nome,
				product.grupo,
				product.vezes,
				product.ultima_venda,
				product.ncm_produto,
				confianca,
				motivo,
				match?.nome ?? "",
				match?.ncm ?? "",
				match ? (ibptByNcm.get(match.ncm)?.[0] ?? "") : "",
				match ? (ibptByNcm.has(match.ncm) ? "SIM" : "NAO") : "",
				ibptCandidates(product.nome),
				match?.cfop_padrao ?? "",
				match?.grupo_tributario_id ?? "",
				match?.grupo_tributario_nome ?? "",
				constantes.cest ?? "",
				constantes.unidade_comercial ?? "",
				constantes.origem_mercadoria ?? "",
				"",
				"",
				"",
			]
				.map(csvCell)
				.join(","),
		);
	}

	writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
	console.log(`Produtos sem perfil vendidos nos ultimos ${days} dias: ${(missing as unknown[]).length}`);
	console.log(`  ALTA (nome identico a um produto ja classificado): ${tally.ALTA}`);
	console.log(`  MEDIA (mesma base de nome ou grupo com NCM unico): ${tally.MEDIA}`);
	console.log(`  NENHUMA (precisa do contador): ${tally.NENHUMA}`);
	console.log(`Planilha: ${outPath}`);
	await connection.end();
}

main().catch(async (error) => {
	console.error("Falha na exportacao:", error.message ?? error);
	await connection.end();
	process.exit(1);
});
