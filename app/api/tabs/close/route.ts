import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { CheckoutPaymentSplitSchema } from "@/lib/payments";
import { resolveActiveSalesSession } from "@/lib/sales-sessions";
import { closeTab } from "@/lib/tabs";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CloseTabInputSchema = z.object({
	tabId: z.string({ required_error: "ID da conta nao informado." }),
	pagamentos: z.array(CheckoutPaymentSplitSchema.omit({ id: true })).min(1, { message: "Informe os pagamentos do fechamento." }),
	sessaoVendaId: z.string({ invalid_type_error: "Tipo nao valido para o ID da sessao de venda." }).optional().nullable(),
	contaDebitoId: z.string({ invalid_type_error: "Tipo nao valido para conta de debito." }).optional().nullable(),
	contaCreditoId: z.string({ invalid_type_error: "Tipo nao valido para conta de credito." }).optional().nullable(),
});
export type TCloseTabRouteInput = z.infer<typeof CloseTabInputSchema>;

async function closeTabService({ input, session }: { input: TCloseTabRouteInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
	});
	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");

	// Turno de caixa: mesma resolucao do POS — enforcement opcional/obrigatorio + validacao da sessao.
	const sessaoObrigatoria = organization.configuracao.preferencias.sessoesVenda?.obrigatorio ?? false;
	if (sessaoObrigatoria && !input.sessaoVendaId) {
		throw new createHttpError.BadRequest("Nenhum caixa aberto. Abra uma sessao de venda para continuar.");
	}
	let sessaoVendaId: string | null = null;
	if (input.sessaoVendaId) {
		const activeSession = await resolveActiveSalesSession({ orgId, sessaoVendaId: input.sessaoVendaId });
		if (!activeSession) throw new createHttpError.BadRequest("Sessao de venda invalida ou nao esta aberta.");
		sessaoVendaId = activeSession.id;
	}

	const result = await closeTab({
		organization,
		userId: session.user.id,
		input: {
			tabId: input.tabId,
			pagamentos: input.pagamentos,
			sessaoVendaId,
			contaDebitoId: input.contaDebitoId,
			contaCreditoId: input.contaCreditoId,
		},
	});

	return {
		data: result,
		message: "Conta fechada com sucesso.",
	};
}
export type TCloseTabOutput = Awaited<ReturnType<typeof closeTabService>>;

async function closeTabRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organizacao nao possui acesso ao modulo de ERP.");
	}

	const body = await request.json();
	const input = CloseTabInputSchema.parse(body);
	const result = await closeTabService({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: closeTabRoute });
