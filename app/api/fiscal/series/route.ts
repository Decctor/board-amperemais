import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { listFiscalSeries, upsertFiscalSeries } from "@/lib/fiscal/settings";
import { FiscalDocumentEnvironmentEnum, FiscalDocumentTypeEnum } from "@/schemas/enums";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

async function requireOrgSession() {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	return { session, orgId };
}

async function getFiscalSeries() {
	const { orgId } = await requireOrgSession();
	return {
		data: {
			default: await listFiscalSeries(orgId),
		},
		message: "Séries fiscais encontradas com sucesso.",
	};
}
export type TGetFiscalSeriesOutput = Awaited<ReturnType<typeof getFiscalSeries>>;

async function getFiscalSeriesRoute() {
	const result = await getFiscalSeries();
	return NextResponse.json(result);
}

const UpsertFiscalSeriesInputSchema = z.object({
	id: z.string().optional().nullable(),
	tipoDocumento: FiscalDocumentTypeEnum,
	ambiente: FiscalDocumentEnvironmentEnum,
	serie: z.string(),
	proximoNumero: z.number(),
	ativo: z.boolean().default(true),
});
export type TUpsertFiscalSeriesInput = z.infer<typeof UpsertFiscalSeriesInputSchema>;

async function upsertFiscalSeriesRoute(request: NextRequest) {
	const { orgId } = await requireOrgSession();
	const payload = await request.json();
	const input = UpsertFiscalSeriesInputSchema.parse(payload);
	const result = await upsertFiscalSeries({
		id: input.id ?? undefined,
		organizacaoId: orgId,
		tipoDocumento: input.tipoDocumento,
		ambiente: input.ambiente,
		serie: input.serie,
		proximoNumero: input.proximoNumero,
		ativo: input.ativo,
	});
	return NextResponse.json({
		data: result,
		message: "Série fiscal salva com sucesso.",
	});
}
export type TUpsertFiscalSeriesOutput = Awaited<ReturnType<typeof upsertFiscalSeries>>;

export const GET = appApiHandler({ GET: getFiscalSeriesRoute });
export const PUT = appApiHandler({ PUT: upsertFiscalSeriesRoute });
