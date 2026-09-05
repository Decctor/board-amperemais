import { canAccessDashboardCapability, type TDashboardCapability } from "@/lib/access/capabilities";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatDateAsLocale, formatStringAsOnlyDigits, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { createSimplifiedEmailSearchCondition, createSimplifiedPhoneSearchCondition, createSimplifiedSearchCondition } from "@/lib/search";
import { db } from "@/services/drizzle";
import { clients, products, sales, sellers } from "@/services/drizzle/schema";
import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Busca global da paleta de comandos (⌘K): um termo, várias entidades, poucos resultados por grupo.
 *
 * Cada entidade responde à pergunta que o usuário faz no balcão: "quem é esse cliente", "cadê a
 * venda daquele cliente", "qual o código desse produto", "quem é esse vendedor". Por isso vendas são
 * encontradas pelo cliente (nome, telefone, CPF/CNPJ) e não só pelo próprio identificador: a relação
 * cliente → vendas é o caminho de busca mais comum, e a venda ganha o nome do cliente como rótulo.
 *
 * O gate por entidade reaproveita as capacidades do dashboard: quem não enxerga a rota de vendedores
 * na sidebar também não os encontra aqui.
 */

export const globalSearchEntityTypes = ["clients", "sales", "products", "sellers"] as const;
export type TGlobalSearchEntityType = (typeof globalSearchEntityTypes)[number];

const ENTITY_CAPABILITY: Record<TGlobalSearchEntityType, TDashboardCapability> = {
	clients: "customers",
	sales: "sales",
	products: "products",
	sellers: "sellers",
};

const GlobalSearchInputSchema = z.object({
	search: z
		.string({ required_error: "Termo de busca não informado.", invalid_type_error: "Tipo inválido para o termo de busca." })
		.trim()
		.min(2, "Digite ao menos 2 caracteres para buscar."),
	entities: z
		.string({ invalid_type_error: "Tipo inválido para entidades." })
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",").filter((e): e is TGlobalSearchEntityType => (globalSearchEntityTypes as readonly string[]).includes(e)) : [])),
	limit: z
		.string({ invalid_type_error: "Tipo inválido para limite." })
		.optional()
		.nullable()
		.transform((v) => {
			const parsed = v ? Number(v) : 5;
			if (!Number.isFinite(parsed)) return 5;
			return Math.min(Math.max(Math.trunc(parsed), 1), 10);
		}),
});
export type TGetGlobalSearchInput = z.infer<typeof GlobalSearchInputSchema>;

export type TGlobalSearchResultItem = {
	id: string;
	/** Texto principal do resultado (nome do cliente, do produto, do vendedor; cliente da venda). */
	rotulo: string;
	/** Linha secundária: contexto suficiente para desambiguar homônimos sem abrir o registro. */
	descricao: string | null;
	url: string;
	entidade: TGlobalSearchEntityType;
};

/**
 * Termo "numérico": telefone, CPF/CNPJ, código de produto ou número de pedido. Sem letras e com
 * dígitos suficientes para discriminar — "12" ainda é nome de produto ("Coca 12 un"), "12345" não.
 */
function isNumericSearch(search: string) {
	return !/\p{L}/u.test(search) && formatStringAsOnlyDigits(search).length >= 5;
}

/** CPF/CNPJ é persistido com máscara; comparar dígito a dígito torna a busca indiferente à formatação. */
function createDocumentDigitsCondition(column: typeof clients.cpfCnpj, digits: string) {
	return sql`regexp_replace(coalesce(${column}, ''), '\\D', '', 'g') LIKE '%' || ${digits} || '%'`;
}

/** Condição compartilhada por clientes e vendas: é a "identidade" do cliente sob qualquer forma digitada. */
function createClientLookupCondition(search: string) {
	if (isNumericSearch(search)) {
		const digits = formatStringAsOnlyDigits(search);
		return or(createSimplifiedPhoneSearchCondition(clients.telefoneBase, search), createDocumentDigitsCondition(clients.cpfCnpj, digits)) as SQL;
	}
	return or(
		createSimplifiedSearchCondition(clients.nome, search),
		createSimplifiedEmailSearchCondition(clients.email, search),
		createSimplifiedPhoneSearchCondition(clients.telefoneBase, search),
	) as SQL;
}

async function searchClients({ organizacaoId, search, limit }: { organizacaoId: string; search: string; limit: number }) {
	const rows = await db
		.select({ id: clients.id, nome: clients.nome, telefone: clients.telefone, cpfCnpj: clients.cpfCnpj, email: clients.email })
		.from(clients)
		.where(and(eq(clients.organizacaoId, organizacaoId), createClientLookupCondition(search)))
		.orderBy(clients.nome)
		.limit(limit);
	return rows.map(
		(row): TGlobalSearchResultItem => ({
			id: row.id,
			rotulo: row.nome,
			descricao: [row.telefone || null, row.cpfCnpj || null, row.email || null].filter(Boolean).join(" · ") || null,
			url: appRoutes.customers.details(row.id),
			entidade: "clients",
		}),
	);
}

async function searchSales({ organizacaoId, search, limit }: { organizacaoId: string; search: string; limit: number }) {
	const numeric = isNumericSearch(search);
	// A venda é encontrada pelo cliente (o caminho comum) ou pelos seus próprios números — id externo
	// do ERP/integração e comanda — quando o termo é numérico.
	const saleOwnCondition = numeric
		? or(sql`${sales.idExterno} ILIKE '%' || ${search} || '%'`, sql`coalesce(${sales.comandaNumero}, '') ILIKE '%' || ${search} || '%'`)
		: undefined;
	const rows = await db
		.select({
			id: sales.id,
			clienteNome: clients.nome,
			dataVenda: sales.dataVenda,
			valorTotal: sales.valorTotal,
			vendedorNome: sales.vendedorNome,
			statusVenda: sales.statusVenda,
		})
		.from(sales)
		.leftJoin(clients, eq(clients.id, sales.clienteId))
		.where(and(eq(sales.organizacaoId, organizacaoId), or(createClientLookupCondition(search), saleOwnCondition)))
		.orderBy(desc(sales.dataVenda))
		.limit(limit);
	return rows.map(
		(row): TGlobalSearchResultItem => ({
			id: row.id,
			rotulo: row.clienteNome ?? "Ao consumidor",
			descricao: [
				row.dataVenda ? formatDateAsLocale(row.dataVenda, true) : null,
				formatToMoney(row.valorTotal),
				row.vendedorNome || null,
				row.statusVenda === "ORCAMENTO" ? "Orçamento" : null,
			]
				.filter(Boolean)
				.join(" · "),
			url: appRoutes.sales.details(row.id),
			entidade: "sales",
		}),
	);
}

async function searchProducts({ organizacaoId, search, limit }: { organizacaoId: string; search: string; limit: number }) {
	const rows = await db
		.select({
			id: products.id,
			nome: products.nome,
			codigo: products.codigo,
			grupo: products.grupo,
			precoVenda: products.precoVenda,
			ativo: products.ativo,
		})
		.from(products)
		.where(
			and(
				eq(products.organizacaoId, organizacaoId),
				or(createSimplifiedSearchCondition(products.nome, search), sql`${products.codigo} ILIKE '%' || ${search} || '%'`),
			),
		)
		.orderBy(desc(products.ativo), products.nome)
		.limit(limit);
	return rows.map(
		(row): TGlobalSearchResultItem => ({
			id: row.id,
			rotulo: row.nome,
			descricao: [
				row.codigo ? `Cód. ${row.codigo}` : null,
				row.grupo || null,
				row.precoVenda !== null && row.precoVenda !== undefined ? formatToMoney(row.precoVenda) : null,
				row.ativo === false ? "Inativo" : null,
			]
				.filter(Boolean)
				.join(" · "),
			url: appRoutes.catalog.product(row.id),
			entidade: "products",
		}),
	);
}

async function searchSellers({ organizacaoId, search, limit }: { organizacaoId: string; search: string; limit: number }) {
	const rows = await db
		.select({ id: sellers.id, nome: sellers.nome, identificador: sellers.identificador, telefone: sellers.telefone, ativo: sellers.ativo })
		.from(sellers)
		.where(
			and(
				eq(sellers.organizacaoId, organizacaoId),
				or(
					createSimplifiedSearchCondition(sellers.nome, search),
					sql`${sellers.identificador} ILIKE '%' || ${search} || '%'`,
					createSimplifiedPhoneSearchCondition(sellers.telefone, search),
				),
			),
		)
		.orderBy(desc(sellers.ativo), sellers.nome)
		.limit(limit);
	return rows.map(
		(row): TGlobalSearchResultItem => ({
			id: row.id,
			rotulo: row.nome,
			descricao: [row.identificador || null, row.telefone || null, row.ativo ? null : "Inativo"].filter(Boolean).join(" · ") || null,
			url: appRoutes.management.seller(row.id),
			entidade: "sellers",
		}),
	);
}

async function getGlobalSearch({ input, session }: { input: TGetGlobalSearchInput; session: TAuthUserSession }) {
	const membership = session.membership;
	if (!membership) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para buscar.");
	const organizacaoId = membership.organizacao.id;
	const capabilityContext = { organization: membership.organizacao, permissions: membership.permissoes };

	const requested = input.entities.length > 0 ? input.entities : [...globalSearchEntityTypes];
	const active = requested.filter((entity) => canAccessDashboardCapability(ENTITY_CAPABILITY[entity], capabilityContext));

	const results: Record<TGlobalSearchEntityType, TGlobalSearchResultItem[]> = { clients: [], sales: [], products: [], sellers: [] };
	const args = { organizacaoId, search: input.search, limit: input.limit };
	const searchers: Record<TGlobalSearchEntityType, () => Promise<TGlobalSearchResultItem[]>> = {
		clients: () => searchClients(args),
		sales: () => searchSales(args),
		products: () => searchProducts(args),
		sellers: () => searchSellers(args),
	};

	await Promise.all(
		active.map(async (entity) => {
			results[entity] = await searchers[entity]();
		}),
	);

	return { data: { results }, message: "Busca realizada com sucesso." };
}
export type TGetGlobalSearchOutput = Awaited<ReturnType<typeof getGlobalSearch>>;

async function getGlobalSearchRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para buscar.");

	const searchParams = request.nextUrl.searchParams;
	const input = GlobalSearchInputSchema.parse({
		search: searchParams.get("search") ?? "",
		entities: searchParams.get("entities"),
		limit: searchParams.get("limit"),
	});
	const result = await getGlobalSearch({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getGlobalSearchRoute });
