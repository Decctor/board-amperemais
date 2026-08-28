import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { hydratePOSProducts } from "@/lib/pos/hydrate-pos-products";
import { getValidSaleConditions } from "@/lib/sales/valid-sale";
import { db } from "@/services/drizzle";
import { saleItems, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, desc, eq, gte, isNotNull, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// "Mais pedidos" do PDV: os itens corriqueiros da loja. Janela de 90 dias — fiel ao hábito
// recente sem carregar sazonalidade antiga (ex.: Panetone em julho).
const TOP_PRODUCTS_LIMIT = 10;
const TOP_PRODUCTS_WINDOW_DAYS = 90;

async function getPOSTopProducts({ session, channel }: { session: TAuthUserSession; channel: "POS" | "COMANDA" }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const windowStart = dayjs().subtract(TOP_PRODUCTS_WINDOW_DAYS, "days").toDate();

	const ranked = await db
		.select({ produtoId: saleItems.produtoId, quantidadeVendida: sum(saleItems.quantidade) })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(
			and(
				eq(saleItems.organizacaoId, organizacaoId),
				...getValidSaleConditions({ orgId: organizacaoId }),
				isNotNull(sales.dataVenda),
				gte(sales.dataVenda, windowStart),
			),
		)
		.groupBy(saleItems.produtoId)
		.orderBy(desc(sum(saleItems.quantidade)))
		.limit(TOP_PRODUCTS_LIMIT);

	const rankedIds = ranked.map((row) => row.produtoId);
	const hydrated = await hydratePOSProducts({ orgId: organizacaoId, productIds: rankedIds, canal: channel });

	// Reordena pelo ranking (a hidratação não preserva ordem) e descarta inativos filtrados nela.
	const rankIndex = new Map(rankedIds.map((id, index) => [id, index]));
	const topProducts = hydrated.sort((a, b) => (rankIndex.get(a.id) ?? 0) - (rankIndex.get(b.id) ?? 0));

	return {
		data: { products: topProducts },
		message: "Produtos mais pedidos carregados com sucesso.",
	};
}
export type TGetPOSTopProductsOutput = Awaited<ReturnType<typeof getPOSTopProducts>>;

async function getPOSTopProductsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const channel = request.nextUrl.searchParams.get("channel") === "COMANDA" ? ("COMANDA" as const) : ("POS" as const);
	const result = await getPOSTopProducts({ session, channel });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({
	GET: getPOSTopProductsRoute,
});
