import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { findFiscalOperationProfileById, listFiscalOperationProfiles, upsertFiscalOperationProfile } from "@/lib/fiscal/settings";
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

const GetFiscalOperationProfilesInputSchema = z.object({
	id: z
		.string({
			required_error: "ID do perfil de operação fiscal nao informado.",
			invalid_type_error: "Tipo nao valido para o ID do perfil de operação fiscal.",
		})
		.optional()
		.nullable(),
});
export type TGetFiscalOperationProfilesInput = z.infer<typeof GetFiscalOperationProfilesInputSchema>;

async function getFiscalOperationProfiles({ input }: { input: TGetFiscalOperationProfilesInput }) {
	const { session, orgId } = await requireOrgSession();
	const userHasFiscalConfigurePermission = session.membership?.permissoes.fiscal.configurar;
	if (!userHasFiscalConfigurePermission)
		throw new createHttpError.Forbidden("Oops, você não possui permissão para configurar perfis de operação fiscal.");

	if (input.id) {
		const profile = await findFiscalOperationProfileById({ fiscalOperationProfileId: input.id, organizationId: orgId });
		if (!profile) throw new createHttpError.NotFound("Perfil de operação fiscal nao encontrado.");

		return {
			data: {
				default: null,
				byId: profile,
			},
			message: "Perfil de operação fiscal encontrado com sucesso.",
		};
	}

	return {
		data: {
			default: await listFiscalOperationProfiles(orgId),
		},
		message: "Perfis de operação fiscal encontrados com sucesso.",
	};
}
export type TGetFiscalOperationProfilesOutput = Awaited<ReturnType<typeof getFiscalOperationProfiles>>;
export type TGetFiscalOperationProfilesOutputDefault = NonNullable<TGetFiscalOperationProfilesOutput["data"]["default"]>;
export type TGetFiscalOperationProfilesOutputById = NonNullable<TGetFiscalOperationProfilesOutput["data"]["byId"]>;
async function getFiscalOperationProfilesRoute(request: NextRequest) {
	const params = request.nextUrl.searchParams;

	const input = GetFiscalOperationProfilesInputSchema.parse({
		id: params.get("id") ?? undefined,
	});
	const result = await getFiscalOperationProfiles({ input });
	return NextResponse.json(result);
}

const UpdateFiscalOperationProfileInputSchema = z.object({
	operationProfileId: z.string({
		required_error: "ID da operacao fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da operacao fiscal.",
	}),
	operationProfile: FiscalOperationProfileSchema.omit({
		organizacaoId: true,
		dataInsercao: true,
	}),
});

export type TUpdateFiscalOperationProfileInput = z.infer<typeof UpdateFiscalOperationProfileInputSchema>;

async function updateFiscalOperationProfile({
	sessionMembership,
	input,
}: {
	sessionMembership: NonNullable<TAuthUserSession["membership"]>;
	input: TUpdateFiscalOperationProfileInput;
}) {
	const result = await upsertFiscalOperationProfile({
		id: input.operationProfileId,
		organizacaoId: sessionMembership.organizacao.id,
		...input.operationProfile,
	});
	return {
		data: {
			updatedId: result.id,
		},
		message: "Perfil de operação fiscal atualizado com sucesso.",
	};
}
export type TUpdateFiscalOperationProfileOutput = Awaited<ReturnType<typeof updateFiscalOperationProfile>>;

async function updateFiscalOperationProfileRoute(request: NextRequest) {
	const { session } = await requireOrgSession();
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const userHasFiscalConfigurePermission = sessionMembership.permissoes.fiscal.configurar;
	if (!userHasFiscalConfigurePermission)
		throw new createHttpError.Forbidden("Oops, você não possui permissão para configurar perfis de operação fiscal.");

	const payload = await request.json();
	const input = UpdateFiscalOperationProfileInputSchema.parse(payload);
	const result = await updateFiscalOperationProfile({ sessionMembership, input });

	return NextResponse.json(result);
}

const CreateFiscalOperationProfileInputSchema = z.object({
	operationProfile: FiscalOperationProfileSchema.omit({
		organizacaoId: true,
		dataInsercao: true,
	}),
});
export type TCreateFiscalOperationProfileInput = z.infer<typeof CreateFiscalOperationProfileInputSchema>;

async function createFiscalOperationProfile({
	sessionMembership,
	input,
}: {
	sessionMembership: NonNullable<TAuthUserSession["membership"]>;
	input: TCreateFiscalOperationProfileInput;
}) {
	const result = await upsertFiscalOperationProfile({
		organizacaoId: sessionMembership.organizacao.id,
		...input.operationProfile,
	});
	return {
		data: {
			insertedId: result.id,
		},
		message: "Perfil de operação fiscal salvo com sucesso.",
	};
}
export type TCreateFiscalOperationProfileOutput = Awaited<ReturnType<typeof createFiscalOperationProfile>>;
async function createFiscalOperationProfileRoute(request: NextRequest) {
	const { session } = await requireOrgSession();
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const userHasFiscalConfigurePermission = sessionMembership.permissoes.fiscal.configurar;
	if (!userHasFiscalConfigurePermission)
		throw new createHttpError.Forbidden("Oops, você não possui permissão para configurar perfis de operação fiscal.");

	const payload = await request.json();
	const input = CreateFiscalOperationProfileInputSchema.parse(payload);
	const result = await createFiscalOperationProfile({ sessionMembership, input });
	return NextResponse.json(result);
}
export const GET = appApiHandler({ GET: getFiscalOperationProfilesRoute });
export const POST = appApiHandler({ POST: createFiscalOperationProfileRoute });
export const PUT = appApiHandler({ PUT: updateFiscalOperationProfileRoute });
