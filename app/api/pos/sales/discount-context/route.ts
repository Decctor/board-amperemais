import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveDiscountAuthority } from "@/lib/permissions/discounts";
import { resolveSaleDiscountAuthority } from "@/lib/sales/sale-discount-authorization";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Contexto de desconto do PDV: a autoridade da identidade avaliada (vendedor selecionado ou, sem
 * membership vinculada, a sessão) para feedback imediato no checkout — o enforcement autoritativo
 * continua nas rotas de venda. Também informa se o usuário da sessão pode aprovar descontos.
 */
const GetSaleDiscountContextInputSchema = z.object({
	vendedorId: z.string({ invalid_type_error: "Tipo não válido para o ID do vendedor." }).optional().nullable(),
});
export type TGetSaleDiscountContextInput = z.infer<typeof GetSaleDiscountContextInputSchema>;

async function getSaleDiscountContext({ input, session }: { input: TGetSaleDiscountContextInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;
	const authority = await resolveSaleDiscountAuthority({ orgId, session, vendedorId: input.vendedorId });
	const sessionAuthority = resolveDiscountAuthority(session.membership!.permissoes);

	return {
		data: {
			authority,
			sessionCanApprove: sessionAuthority.aprovar,
		},
		message: "Contexto de desconto encontrado.",
	};
}
export type TGetSaleDiscountContextOutput = Awaited<ReturnType<typeof getSaleDiscountContext>>;

async function getSaleDiscountContextRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = GetSaleDiscountContextInputSchema.parse({ vendedorId: searchParams.get("vendedorId") });
	const result = await getSaleDiscountContext({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getSaleDiscountContextRoute });
