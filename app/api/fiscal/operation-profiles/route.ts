import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { listFiscalOperationProfiles, upsertFiscalOperationProfile } from "@/lib/fiscal/settings";
import { FiscalDocumentTypeEnum, FiscalOperationConsumerPresenceEnum, FiscalOperationFinalityEnum } from "@/schemas/enums";
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
	id: z.string().optional().nullable(),
	nome: z.string(),
	descricao: z.string().optional().nullable(),
	tipoDocumento: FiscalDocumentTypeEnum,
	finalidade: FiscalOperationFinalityEnum,
	presencaConsumidor: FiscalOperationConsumerPresenceEnum,
	consumidorFinal: z.boolean(),
	cfopPadrao: z.string(),
	naturezaOperacao: z.string(),
	seriePadraoId: z.string().optional().nullable(),
	ativo: z.boolean().default(true),
});
export type TUpsertFiscalOperationProfileInput = z.infer<typeof UpsertFiscalOperationProfileInputSchema>;

async function upsertFiscalOperationProfileRoute(request: NextRequest) {
	const { orgId } = await requireOrgSession();
	const payload = await request.json();
	const input = UpsertFiscalOperationProfileInputSchema.parse(payload);
	const result = await upsertFiscalOperationProfile({
		id: input.id ?? undefined,
		organizacaoId: orgId,
		nome: input.nome,
		descricao: input.descricao ?? null,
		tipoDocumento: input.tipoDocumento,
		finalidade: input.finalidade,
		presencaConsumidor: input.presencaConsumidor,
		consumidorFinal: input.consumidorFinal,
		cfopPadrao: input.cfopPadrao,
		naturezaOperacao: input.naturezaOperacao,
		seriePadraoId: input.seriePadraoId ?? null,
		ativo: input.ativo,
	});
	return NextResponse.json({
		data: result,
		message: "Perfil de operação fiscal salvo com sucesso.",
	});
}
export type TUpsertFiscalOperationProfileOutput = Awaited<ReturnType<typeof upsertFiscalOperationProfile>>;

export const GET = appApiHandler({ GET: getFiscalOperationProfilesRoute });
export const PUT = appApiHandler({ PUT: upsertFiscalOperationProfileRoute });
