import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { listFiscalOperationProfiles, upsertFiscalOperationProfile } from "@/lib/fiscal/settings";
import { FiscalDocumentTypeEnum, FiscalOperationConsumerPresenceEnum, FiscalOperationFinalityEnum } from "@/schemas/enums";
import { FiscalOperationProfileSchema } from "@/schemas/fiscal";
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

async function getFiscalOperationProfiles() {
	const { session, orgId } = await requireOrgSession();
	const userHasFiscalConfigurePermission = session.membership?.permissoes.fiscal.configurar;
	if (!userHasFiscalConfigurePermission)
		throw new createHttpError.Forbidden("Oops, você não possui permissão para configurar perfis de operação fiscal.");

	return {
		data: {
			default: await listFiscalOperationProfiles(orgId),
		},
		message: "Perfis de operação fiscal encontrados com sucesso.",
	};
}
export type TGetFiscalOperationProfilesOutput = Awaited<ReturnType<typeof getFiscalOperationProfiles>>;

async function getFiscalOperationProfilesRoute() {
	const result = await getFiscalOperationProfiles();
	return NextResponse.json(result);
}

const UpsertFiscalOperationProfileInputSchema = z.object({
	operationProfileId: z.string({
		required_error: "ID da operacao fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da operacao fiscal.",
	}),
	operationProfile: FiscalOperationProfileSchema.omit({
		organizacaoId: true,
		dataInsercao: true,
	}),
});

export type TUpsertFiscalOperationProfileInput = z.infer<typeof UpsertFiscalOperationProfileInputSchema>;

async function upsertFiscalOperationProfileRoute(request: NextRequest) {
	const { orgId } = await requireOrgSession();
	const payload = await request.json();
	const input = UpsertFiscalOperationProfileInputSchema.parse(payload);
	const result = await upsertFiscalOperationProfile({
		id: input.operationProfileId,
		organizacaoId: orgId,
		...input.operationProfile,
	});
	return NextResponse.json({
		data: result,
		message: "Perfil de operação fiscal salvo com sucesso.",
	});
}
export type TUpsertFiscalOperationProfileOutput = Awaited<ReturnType<typeof upsertFiscalOperationProfile>>;

export const GET = appApiHandler({ GET: getFiscalOperationProfilesRoute });
export const PUT = appApiHandler({ PUT: upsertFiscalOperationProfileRoute });
