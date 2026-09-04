import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { recomputeClientDuplicatesForClient } from "@/lib/clients/duplicates";
import { ClientDuplicateStatusEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { clientDuplicateCandidates, clients, sales } from "@/services/drizzle/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const DEFAULT_PAGE_SIZE = 25;

const GetClientDuplicatesInputSchema = z.object({
	// By entity params (pill nas páginas de detalhe)
	entityType: z.enum(["client", "sale"]).optional().nullable(),
	entityId: z.string({ invalid_type_error: "Tipo não válido para o ID da entidade." }).optional().nullable(),
	// Listing params (fila de reconciliação)
	status: ClientDuplicateStatusEnum.optional().nullable().catch(null),
	cursorDataInsercao: z.string({ invalid_type_error: "Tipo não válido para o cursor de data." }).optional().nullable(),
	cursorId: z.string({ invalid_type_error: "Tipo não válido para o cursor de ID." }).optional().nullable(),
	limit: z
		.string({ invalid_type_error: "Tipo não válido para o limite." })
		.optional()
		.nullable()
		.transform((v) => (v ? Math.min(Math.max(Number(v), 1), 100) : DEFAULT_PAGE_SIZE)),
});
export type TGetClientDuplicatesInput = z.infer<typeof GetClientDuplicatesInputSchema>;

const CLIENT_SUMMARY_COLUMNS = {
	id: true,
	nome: true,
	telefone: true,
	email: true,
	cpfCnpj: true,
	instagram: true,
	dataInsercao: true,
} as const;

type TPairWithClients = typeof clientDuplicateCandidates.$inferSelect & {
	clienteA: {
		id: string;
		nome: string;
		telefone: string;
		email: string | null;
		cpfCnpj: string | null;
		instagram: string | null;
		dataInsercao: Date | null;
	} | null;
	clienteB: {
		id: string;
		nome: string;
		telefone: string;
		email: string | null;
		cpfCnpj: string | null;
		instagram: string | null;
		dataInsercao: Date | null;
	} | null;
};

function mapPair(pair: TPairWithClients) {
	return {
		id: pair.id,
		motivos: pair.motivos,
		status: pair.status,
		dataInsercao: pair.dataInsercao,
		clienteA: pair.clienteA,
		clienteB: pair.clienteB,
	};
}

async function resolveEntityClientId({
	organizacaoId,
	entityType,
	entityId,
}: {
	organizacaoId: string;
	entityType: "client" | "sale";
	entityId: string;
}): Promise<string | null> {
	if (entityType === "client") {
		const client = await db.query.clients.findFirst({
			columns: { id: true },
			where: and(eq(clients.id, entityId), eq(clients.organizacaoId, organizacaoId)),
		});
		return client?.id ?? null;
	}
	const sale = await db.query.sales.findFirst({
		columns: { clienteId: true },
		where: and(eq(sales.id, entityId), eq(sales.organizacaoId, organizacaoId)),
	});
	return sale?.clienteId ?? null;
}

async function getClientDuplicates({ input, session }: { input: TGetClientDuplicatesInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// ── Modo entidade: pares pendentes do cliente da página (com recheck ao vivo)
	if (input.entityType && input.entityId) {
		const clienteId = await resolveEntityClientId({ organizacaoId, entityType: input.entityType, entityId: input.entityId });
		if (!clienteId) return { data: { byEntity: { clienteId: null, items: [] }, default: null }, message: "Duplicidades carregadas." };

		// Recheck ao vivo (4 lookups indexados): a página de detalhe fica sempre
		// fresca mesmo entre varreduras do cron. Best-effort.
		await recomputeClientDuplicatesForClient({ organizacaoId, clienteId }).catch(() => null);

		const pairs = await db.query.clientDuplicateCandidates.findMany({
			where: and(
				eq(clientDuplicateCandidates.organizacaoId, organizacaoId),
				eq(clientDuplicateCandidates.status, "PENDENTE"),
				or(eq(clientDuplicateCandidates.clienteAId, clienteId), eq(clientDuplicateCandidates.clienteBId, clienteId)),
			),
			with: {
				clienteA: { columns: CLIENT_SUMMARY_COLUMNS },
				clienteB: { columns: CLIENT_SUMMARY_COLUMNS },
			},
			orderBy: [desc(clientDuplicateCandidates.dataInsercao)],
		});

		return { data: { byEntity: { clienteId, items: pairs.map(mapPair) }, default: null }, message: "Duplicidades carregadas." };
	}

	// ── Modo listagem: fila de reconciliação, paginada por cursor ──────────────
	const status = input.status ?? "PENDENTE";
	const whereConditions = [eq(clientDuplicateCandidates.organizacaoId, organizacaoId), eq(clientDuplicateCandidates.status, status)];
	if (input.cursorDataInsercao && input.cursorId) {
		const cursorDate = new Date(input.cursorDataInsercao);
		const cursorCondition = or(
			lt(clientDuplicateCandidates.dataInsercao, cursorDate),
			and(eq(clientDuplicateCandidates.dataInsercao, cursorDate), lt(clientDuplicateCandidates.id, input.cursorId)),
		);
		if (cursorCondition) whereConditions.push(cursorCondition);
	}

	const rows = await db.query.clientDuplicateCandidates.findMany({
		where: and(...whereConditions),
		with: {
			clienteA: { columns: CLIENT_SUMMARY_COLUMNS },
			clienteB: { columns: CLIENT_SUMMARY_COLUMNS },
		},
		orderBy: [desc(clientDuplicateCandidates.dataInsercao), desc(clientDuplicateCandidates.id)],
		limit: input.limit + 1,
	});

	const hasMore = rows.length > input.limit;
	const pageRows = hasMore ? rows.slice(0, input.limit) : rows;
	const lastRow = pageRows[pageRows.length - 1];

	return {
		data: {
			byEntity: null,
			default: {
				items: pageRows.map(mapPair),
				nextCursor: hasMore && lastRow ? { dataInsercao: lastRow.dataInsercao.toISOString(), id: lastRow.id } : null,
			},
		},
		message: "Duplicidades carregadas.",
	};
}
export type TGetClientDuplicatesOutput = Awaited<ReturnType<typeof getClientDuplicates>>;

async function getClientDuplicatesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetClientDuplicatesInputSchema.parse({
		entityType: searchParams.get("entityType"),
		entityId: searchParams.get("entityId"),
		status: searchParams.get("status"),
		cursorDataInsercao: searchParams.get("cursorDataInsercao"),
		cursorId: searchParams.get("cursorId"),
		limit: searchParams.get("limit"),
	});
	const result = await getClientDuplicates({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getClientDuplicatesRoute });
