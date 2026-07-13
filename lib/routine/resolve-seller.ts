import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { sellers } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

/**
 * Resolve o vendedor da rotina: o vinculado ao membro logado (persona padrão do hub) ou,
 * para gestores ("ver como"), um vendedorId explícito — desde que da mesma organização.
 */
export async function resolveRoutineSeller({ session, explicitSellerId }: { session: TAuthUserSession; explicitSellerId?: string | null }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const vendedorId = explicitSellerId || session.membership?.usuarioVendedorId;
	if (!vendedorId) {
		throw new createHttpError.BadRequest("Seu usuário não está vinculado a um vendedor. Peça a um administrador para vincular ou informe um vendedor.");
	}

	const seller = await db.query.sellers.findFirst({
		where: and(eq(sellers.id, vendedorId), eq(sellers.organizacaoId, organizacaoId)),
		columns: { id: true, nome: true, avatarUrl: true, ativo: true },
	});
	if (!seller) throw new createHttpError.NotFound("Vendedor não encontrado.");

	return { organizacaoId, seller };
}
