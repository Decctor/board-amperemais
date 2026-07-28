import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetAvailableRewardsInputSchema = z.object({
	clienteId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente.",
	}),
});
export type TGetAvailablePosRewardsInput = z.infer<typeof GetAvailableRewardsInputSchema>;

async function getAvailablePosRewards({ input, session }: { input: TGetAvailablePosRewardsInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// Mesma resolução do resgate (`admitSaleRewardRedemption`): o programa do cliente é o do seu
	// saldo. Só quando o cliente não tem saldo em nenhum programa é que se cai no programa da
	// organização — do contrário, uma org com mais de um programa listaria prêmios de um e
	// debitaria o saldo de outro.
	const clientBalance = await db.query.cashbackProgramBalances.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizationId), eq(fields.clienteId, input.clienteId)),
		columns: { saldoValorDisponivel: true, programaId: true },
	});

	const program = await db.query.cashbackPrograms.findFirst({
		where: (fields, { and, eq }) =>
			clientBalance?.programaId
				? and(eq(fields.id, clientBalance.programaId), eq(fields.organizacaoId, organizationId))
				: eq(fields.organizacaoId, organizationId),
		columns: {
			id: true,
			ativo: true,
			terminologia: true,
			modalidadeRecompensasPermitida: true,
		},
	});
	const rewardsAvailable = !!program && program.ativo && program.modalidadeRecompensasPermitida;
	// Saldo só conta quando é do programa resolvido.
	const balance = clientBalance && clientBalance.programaId === program?.id ? clientBalance : null;

	const prizes =
		rewardsAvailable && program
			? await db.query.cashbackProgramPrizes.findMany({
					where: (fields, { and, eq, gt }) =>
						and(eq(fields.organizacaoId, organizationId), eq(fields.programaId, program.id), eq(fields.ativo, true), gt(fields.valor, 0)),
					columns: {
						id: true,
						titulo: true,
						descricao: true,
						imagemCapaUrl: true,
						valor: true,
						produtoId: true,
						produtoVarianteId: true,
					},
					with: {
						produto: { columns: { precoVenda: true, grupo: true } },
						produtoVariante: { columns: { precoVenda: true } },
					},
					orderBy: (fields, { asc }) => asc(fields.valor),
				})
			: [];

	const saldoValorDisponivel = balance?.saldoValorDisponivel ?? 0;

	const rewards = prizes
		// Prêmio sem vínculo com produto/variante não é resgatável (não vira item de venda).
		// `valor > 0` já é filtrado na query: prêmio de valor zero não passa no débito do ledger.
		.filter((prize) => !!prize.produtoId || !!prize.produtoVarianteId)
		.map((prize) => {
			const valorVenda = prize.produtoVariante?.precoVenda ?? prize.produto?.precoVenda ?? 0;
			const elegivel = saldoValorDisponivel >= prize.valor;
			return {
				id: prize.id,
				titulo: prize.titulo,
				descricao: prize.descricao,
				imagemCapaUrl: prize.imagemCapaUrl,
				grupo: prize.produto?.grupo ?? null,
				valor: prize.valor,
				valorVenda,
				elegivel,
				motivo: elegivel ? null : "Saldo insuficiente.",
			};
		});

	return {
		data: {
			program: program
				? {
						id: program.id,
						ativo: program.ativo,
						terminologia: program.terminologia,
						modalidadeRecompensasPermitida: program.modalidadeRecompensasPermitida,
					}
				: null,
			saldoValorDisponivel,
			rewards,
		},
		message: "Recompensas disponíveis encontradas com sucesso.",
	};
}
export type TGetAvailablePosRewardsOutput = Awaited<ReturnType<typeof getAvailablePosRewards>>;

async function getAvailablePosRewardsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = GetAvailableRewardsInputSchema.parse({
		clienteId: searchParams.get("clienteId"),
	});
	const result = await getAvailablePosRewards({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getAvailablePosRewardsRoute });
