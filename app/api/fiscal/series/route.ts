import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { findFiscalSeriesById, listFiscalSeries, upsertFiscalSeries } from "@/lib/fiscal/settings";
import { FiscalSeriesSchema } from "@/schemas/fiscal";
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

const GetFiscalSeriesInputSchema = z.object({
	id: z
		.string({
			required_error: "ID da serie fiscal nao informado.",
			invalid_type_error: "Tipo nao valido para o ID da serie fiscal.",
		})
		.optional()
		.nullable(),
});
export type TGetFiscalSeriesInput = z.infer<typeof GetFiscalSeriesInputSchema>;

async function getFiscalSeries({ input }: { input: TGetFiscalSeriesInput }) {
	const { orgId } = await requireOrgSession();
	if (input.id) {
		const series = await findFiscalSeriesById({ seriesId: input.id, organizationId: orgId });
		if (!series) throw new createHttpError.NotFound("Oops, serie fiscal nao encontrada.");
		return {
			data: {
				byId: series,
				default: null,
			},
			message: "Série fiscal encontrada com sucesso.",
		};
	}

	const result = await listFiscalSeries(orgId);
	return {
		data: {
			byId: null,
			default: result,
		},
		message: "Séries fiscais encontradas com sucesso.",
	};
}
export type TGetFiscalSeriesOutput = Awaited<ReturnType<typeof getFiscalSeries>>;
export type TGetFiscalSeriesOutputById = NonNullable<TGetFiscalSeriesOutput["data"]["byId"]>;
export type TGetFiscalSeriesOutputDefault = NonNullable<TGetFiscalSeriesOutput["data"]["default"]>;

async function getFiscalSeriesRoute(request: NextRequest) {
	const params = await request.nextUrl.searchParams;
	const input = GetFiscalSeriesInputSchema.parse({
		id: params.get("id") ?? undefined,
	});
	const result = await getFiscalSeries({ input });
	return NextResponse.json(result);
}

const UpdateFiscalSeriesInputSchema = z.object({
	fiscalSeriesId: z.string({
		required_error: "ID da serie fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da serie fiscal.",
	}),
	fiscalSeries: FiscalSeriesSchema.omit({
		organizacaoId: true,
		dataInsercao: true,
	}),
});
export type TUpdateFiscalSeriesInput = z.infer<typeof UpdateFiscalSeriesInputSchema>;

async function updateFiscalSeries({ input }: { input: TUpdateFiscalSeriesInput }) {
	const { orgId } = await requireOrgSession();
	const result = await upsertFiscalSeries({
		id: input.fiscalSeriesId,
		organizacaoId: orgId,
		tipoDocumento: input.fiscalSeries.tipoDocumento,
		ambiente: input.fiscalSeries.ambiente,
		serie: input.fiscalSeries.serie,
		proximoNumero: input.fiscalSeries.proximoNumero,
		ativo: input.fiscalSeries.ativo,
	});
	return {
		data: {
			updatedId: result.id,
		},
		message: "Série fiscal atualizada com sucesso.",
	};
}
export type TUpdateFiscalSeriesOutput = Awaited<ReturnType<typeof updateFiscalSeries>>;

async function updateFiscalSeriesRoute(request: NextRequest) {
	const { session, orgId } = await requireOrgSession();
	const userHasFiscalConfigurePermission = session.membership?.permissoes.fiscal.configurar;
	if (!userHasFiscalConfigurePermission) throw new createHttpError.Forbidden("Oops, você não possui permissão para configurar séries fiscais.");

	const payload = await request.json();
	const input = UpdateFiscalSeriesInputSchema.parse(payload);
	const result = await updateFiscalSeries({ input });
	return NextResponse.json(result);
}

const CreateFiscalSeriesInputSchema = z.object({
	fiscalSeries: FiscalSeriesSchema.omit({
		organizacaoId: true,
		dataInsercao: true,
	}),
});
export type TCreateFiscalSeriesInput = z.infer<typeof CreateFiscalSeriesInputSchema>;
async function createFiscalSeries({ input }: { input: TCreateFiscalSeriesInput }) {
	const { orgId } = await requireOrgSession();
	const result = await upsertFiscalSeries({
		organizacaoId: orgId,
		tipoDocumento: input.fiscalSeries.tipoDocumento,
		ambiente: input.fiscalSeries.ambiente,
		serie: input.fiscalSeries.serie,
		proximoNumero: input.fiscalSeries.proximoNumero,
		ativo: input.fiscalSeries.ativo,
	});
	return {
		data: {
			createdId: result.id,
		},
		message: "Série fiscal criada com sucesso.",
	};
}
export type TCreateFiscalSeriesOutput = Awaited<ReturnType<typeof createFiscalSeries>>;

async function createFiscalSeriesRoute(request: NextRequest) {
	const { session, orgId } = await requireOrgSession();
	const userHasFiscalConfigurePermission = session.membership?.permissoes.fiscal.configurar;
	if (!userHasFiscalConfigurePermission) throw new createHttpError.Forbidden("Oops, você não possui permissão para configurar séries fiscais.");

	const payload = await request.json();
	const input = CreateFiscalSeriesInputSchema.parse(payload);
	const result = await createFiscalSeries({ input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFiscalSeriesRoute });
export const PUT = appApiHandler({ PUT: updateFiscalSeriesRoute });
export const POST = appApiHandler({ POST: createFiscalSeriesRoute });
