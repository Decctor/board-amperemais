import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getFiscalSettings as getFiscalSettingsData, updateFiscalSettings as updateFiscalSettingsData } from "@/lib/fiscal/settings";
import { OrganizationFiscalConfigSchema } from "@/schemas/fiscal";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

async function requireOrgSession() {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.user.admin && !session.membership?.permissoes.fiscal.configurar) {
		throw new createHttpError.Forbidden("Acesso restrito aos responsáveis pela organização.");
	}
	return { session, orgId };
}

async function getFiscalSettings() {
	const { orgId } = await requireOrgSession();
	return {
		data: await getFiscalSettingsData(orgId),
		message: "Configuração fiscal carregada com sucesso.",
	};
}
export type TGetFiscalSettingsOutput = Awaited<ReturnType<typeof getFiscalSettings>>;

async function getFiscalSettingsRoute() {
	const result = await getFiscalSettings();
	return NextResponse.json(result);
}

const UpdateFiscalSettingsInputSchema = z.object({
	fiscalProvedor: z.enum(["MANUAL", "NUVEM_FISCAL"]),
	fiscalEmissaoAutomatica: z.boolean(),
	fiscalConfiguracao: OrganizationFiscalConfigSchema,
});
export type TUpdateFiscalSettingsInput = z.infer<typeof UpdateFiscalSettingsInputSchema>;

async function updateFiscalSettings({ input }: { input: TUpdateFiscalSettingsInput }) {
	const { orgId } = await requireOrgSession();

	const updated = await updateFiscalSettingsData({
		organizacaoId: orgId,
		fiscalProvedor: input.fiscalProvedor,
		fiscalEmissaoAutomatica: input.fiscalEmissaoAutomatica,
		fiscalConfiguracao: input.fiscalConfiguracao,
	});

	return {
		data: { updatedId: updated.id },
		message: "Configuração fiscal atualizada com sucesso.",
	};
}
export type TUpdateFiscalSettingsOutput = Awaited<ReturnType<typeof updateFiscalSettings>>;

async function updateFiscalSettingsRoute(request: NextRequest) {
	const payload = await request.json();
	const input = UpdateFiscalSettingsInputSchema.parse(payload);
	const result = await updateFiscalSettings({ input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFiscalSettingsRoute });
export const PUT = appApiHandler({ PUT: updateFiscalSettingsRoute });
