import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, desc, eq, gte } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const IFOOD_ORDERS_DEFAULT_PERIOD_DAYS = 7;
const IFOOD_ORDERS_LIST_LIMIT = 100;

const GetIfoodOrdersInputSchema = z.object({
	periodAfter: z
		.string({ invalid_type_error: "Tipo inválido para o período." })
		.optional()
		.nullable()
		.transform((value) => (value ? new Date(value) : dayjs().subtract(IFOOD_ORDERS_DEFAULT_PERIOD_DAYS, "days").toDate())),
});
export type TGetIfoodOrdersInput = z.infer<typeof GetIfoodOrdersInputSchema>;

async function getIfoodOrders({ input, organizacaoId }: { input: TGetIfoodOrdersInput; organizacaoId: string }) {
	// Pedidos do iFood entram em `sales` pelo pipeline de ingestão (modelo = "IFOOD",
	// idExterno = orderId do iFood). A lista serve o painel de pedidos da integração.
	const result = await db.query.sales.findMany({
		where: and(eq(sales.organizacaoId, organizacaoId), eq(sales.modelo, "IFOOD"), gte(sales.dataVenda, input.periodAfter)),
		columns: {
			id: true,
			idExterno: true,
			documento: true,
			valorTotal: true,
			situacao: true,
			statusAtendimento: true,
			entregaModalidade: true,
			dataVenda: true,
			integracaoMetadados: true,
		},
		with: {
			cliente: { columns: { id: true, nome: true, telefone: true } },
			itens: { columns: { id: true } },
		},
		orderBy: desc(sales.dataVenda),
		limit: IFOOD_ORDERS_LIST_LIMIT,
	});

	const orders = result.map((sale) => ({
		vendaId: sale.id,
		orderId: sale.idExterno,
		displayId: sale.documento,
		valorTotal: sale.valorTotal,
		situacao: sale.situacao,
		statusAtendimento: sale.statusAtendimento,
		entregaModalidade: sale.entregaModalidade,
		dataVenda: sale.dataVenda,
		cliente: sale.cliente ? { id: sale.cliente.id, nome: sale.cliente.nome, telefone: sale.cliente.telefone } : null,
		quantidadeItens: sale.itens.length,
		// Disputa de cancelamento aberta na Plataforma de Negociação — exige resposta antes do prazo.
		disputaAberta: sale.integracaoMetadados?.disputaAberta ?? null,
	}));

	return { data: { orders }, message: "Pedidos do iFood carregados com sucesso." };
}
export type TGetIfoodOrdersOutput = Awaited<ReturnType<typeof getIfoodOrders>>;
export type TIfoodOrderListItem = TGetIfoodOrdersOutput["data"]["orders"][number];

async function getIfoodOrdersRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodOrdersInputSchema.parse({ periodAfter: searchParams.get("periodAfter") });
	const result = await getIfoodOrders({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodOrdersRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
