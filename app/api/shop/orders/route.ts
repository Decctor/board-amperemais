import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetShopOrdersInputSchema = z.object({
	page: z
		.string({ invalid_type_error: "Tipo nao valido para pagina." })
		.optional()
		.default("1")
		.transform((value) => Number(value)),
	status: z.enum(["ORCAMENTO", "CONDICIONAL", "CONFIRMADA", "FATURADA", "CANCELADA"]).optional().nullable(),
	search: z.string({ invalid_type_error: "Tipo nao valido para busca." }).optional().nullable(),
});
export type TGetShopOrdersInput = z.infer<typeof GetShopOrdersInputSchema>;

function getSessionWithOrg(session: Awaited<ReturnType<typeof getCurrentSessionUncached>>) {
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");
	return session;
}

async function getShopOrdersRoute(request: NextRequest) {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const orgId = session.membership!.organizacao.id;
	const { searchParams } = new URL(request.url);
	const input = GetShopOrdersInputSchema.parse({
		page: searchParams.get("page") ?? undefined,
		status: searchParams.get("status") ?? undefined,
		search: searchParams.get("search") ?? undefined,
	});
	const pageSize = 20;
	const page = Math.max(1, input.page || 1);

	const conditions = [eq(sales.organizacaoId, orgId), eq(sales.canal, "SHOP"), eq(sales.status, input.status ?? "ORCAMENTO")];
	if (input.search) {
		conditions.push(or(ilike(sales.idExterno, `%${input.search}%`), ilike(sales.observacoes, `%${input.search}%`))!);
	}

	const orders = await db.query.sales.findMany({
		where: and(...conditions),
		with: {
			cliente: {
				columns: {
					id: true,
					nome: true,
					telefone: true,
				},
			},
			entregaLocalizacao: true,
			itens: {
				columns: {
					id: true,
					quantidade: true,
					valorVendaTotalLiquido: true,
				},
			},
		},
		orderBy: [desc(sales.id)],
		offset: (page - 1) * pageSize,
		limit: pageSize,
	});

	return NextResponse.json({
		data: {
			orders: orders.map((order) => ({
				...order,
				itemCount: order.itens.length,
				totalItemsQuantity: order.itens.reduce((sum, item) => sum + item.quantidade, 0),
			})),
			page,
			pageSize,
		},
		message: "Pedidos da loja digital carregados com sucesso.",
	});
}
export type TGetShopOrdersOutput = Awaited<ReturnType<typeof getShopOrdersRoute>> extends NextResponse<infer T> ? T : never;

export const GET = appApiHandler({ GET: getShopOrdersRoute });
