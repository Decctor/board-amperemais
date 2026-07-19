import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { confirmReconciliationMatch, createEntryFromStatementLine, setStatementLineIgnored } from "@/lib/financial-reconciliation";
import { canReconcileFinances } from "@/lib/permissions/finances";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Ações em lote podem efetivar transações (gatilhos de cashback/fiscal) — tempo estendido.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SyncReconciliationInputSchema = z.object({
	confirmarMatchIds: z.array(z.string({ invalid_type_error: "Tipo inválido para o ID da sugestão." })).default([]),
	criarLancamentos: z
		.array(
			z.object({
				linhaId: z.string({ required_error: "ID da linha do extrato não informado." }),
				titulo: z.string({ invalid_type_error: "Tipo inválido para o título do lançamento." }).optional().nullable(),
				anotacoes: z.string({ invalid_type_error: "Tipo inválido para as anotações do lançamento." }).optional().nullable(),
				contaContabilDebitoId: z.string({ required_error: "Conta contábil de débito não informada." }),
				contaContabilCreditoId: z.string({ required_error: "Conta contábil de crédito não informada." }),
			}),
		)
		.default([]),
	ignorarLinhaIds: z.array(z.string({ invalid_type_error: "Tipo inválido para o ID da linha." })).default([]),
});
export type TSyncReconciliationInput = z.infer<typeof SyncReconciliationInputSchema>;

async function syncReconciliation({ input, orgId, authorId }: { input: TSyncReconciliationInput; orgId: string; authorId: string }) {
	if (input.confirmarMatchIds.length === 0 && input.criarLancamentos.length === 0 && input.ignorarLinhaIds.length === 0) {
		throw new createHttpError.BadRequest("Nenhuma ação de conciliação informada.");
	}

	const erros: string[] = [];
	let confirmados = 0;
	let efetivados = 0;
	let lancamentosCriados = 0;
	let ignoradas = 0;

	// Sequencial de propósito: cada confirmação pode efetivar transações e disparar gatilhos
	// de venda (cashback/fiscal) — paralelizar arriscaria corridas nos mesmos registros.
	for (const matchId of input.confirmarMatchIds) {
		try {
			const result = await confirmReconciliationMatch({ organizacaoId: orgId, autorId: authorId, matchId });
			confirmados++;
			if (result.acao === "EFETIVADO") efetivados++;
		} catch (error) {
			erros.push(error instanceof Error ? error.message : `Erro ao confirmar a sugestão ${matchId}.`);
		}
	}

	for (const lancamento of input.criarLancamentos) {
		try {
			await createEntryFromStatementLine({
				organizacaoId: orgId,
				autorId: authorId,
				linhaId: lancamento.linhaId,
				titulo: lancamento.titulo,
				anotacoes: lancamento.anotacoes,
				contaContabilDebitoId: lancamento.contaContabilDebitoId,
				contaContabilCreditoId: lancamento.contaContabilCreditoId,
			});
			lancamentosCriados++;
		} catch (error) {
			erros.push(error instanceof Error ? error.message : `Erro ao criar lançamento para a linha ${lancamento.linhaId}.`);
		}
	}

	for (const linhaId of input.ignorarLinhaIds) {
		try {
			await setStatementLineIgnored({ organizacaoId: orgId, linhaId, ignorada: true });
			ignoradas++;
		} catch (error) {
			erros.push(error instanceof Error ? error.message : `Erro ao ignorar a linha ${linhaId}.`);
		}
	}

	const partes = [
		confirmados > 0 ? `${confirmados} conciliação(ões) confirmada(s)` : null,
		efetivados > 0 ? `${efetivados} transação(ões) efetivada(s)` : null,
		lancamentosCriados > 0 ? `${lancamentosCriados} lançamento(s) criado(s)` : null,
		ignoradas > 0 ? `${ignoradas} linha(s) ignorada(s)` : null,
	].filter(Boolean);

	return {
		data: { confirmados, efetivados, lancamentosCriados, ignoradas, erros },
		message: partes.length > 0 ? `Sincronização concluída: ${partes.join(", ")}.` : "Nenhuma ação foi aplicada.",
	};
}
export type TSyncReconciliationOutput = Awaited<ReturnType<typeof syncReconciliation>>;

async function syncReconciliationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canReconcileFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para realizar conciliação bancária.");

	const body = await request.json();
	const input = SyncReconciliationInputSchema.parse(body);
	const result = await syncReconciliation({ input, orgId: session.membership.organizacao.id, authorId: session.user.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: syncReconciliationRoute });
