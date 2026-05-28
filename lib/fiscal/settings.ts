import { OrganizationFiscalConfigSchema, type TOrganizationFiscalConfig } from "@/schemas/fiscal";
import { db } from "@/services/drizzle";
import { fiscalOperationProfiles, fiscalSeries, organizations } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { ManualFiscalProvider } from "./providers/manual";
import { NuvemFiscalProvider } from "./providers/nuvem-fiscal";
import type { IFiscalProvider } from "./types";

function resolveFiscalProvider(fiscalProvedor: "MANUAL" | "NUVEM_FISCAL" | null | undefined): IFiscalProvider {
	return fiscalProvedor === "NUVEM_FISCAL" ? new NuvemFiscalProvider() : new ManualFiscalProvider();
}

export async function getFiscalSettings(organizacaoId: string) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, operators) => operators.eq(fields.id, organizacaoId),
		columns: {
			id: true,
			nome: true,
			cnpj: true,
			fiscalProvedor: true,
			fiscalEmissaoAutomatica: true,
			fiscalConfiguracao: true,
		},
	});
	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");
	return organization;
}

export async function updateFiscalSettings({
	organizacaoId,
	fiscalProvedor,
	fiscalEmissaoAutomatica,
	fiscalConfiguracao,
}: {
	organizacaoId: string;
	fiscalProvedor: "MANUAL" | "NUVEM_FISCAL";
	fiscalEmissaoAutomatica: boolean;
	fiscalConfiguracao: TOrganizationFiscalConfig;
}) {
	const parsedConfig = OrganizationFiscalConfigSchema.parse(fiscalConfiguracao);
	if (fiscalEmissaoAutomatica) {
		if (fiscalProvedor !== "NUVEM_FISCAL") {
			throw new createHttpError.BadRequest("Emissao fiscal automatica exige provedor Nuvem Fiscal.");
		}
		if (!parsedConfig.nuvemFiscal?.nfce?.csc || !parsedConfig.nuvemFiscal?.nfce?.idCsc) {
			throw new createHttpError.BadRequest("CSC e ID CSC da NFC-e devem estar configurados para emissao automatica.");
		}
		if (!parsedConfig.nuvemFiscal?.certificado?.storagePath) {
			throw new createHttpError.BadRequest("Certificado digital deve estar configurado para emissao automatica.");
		}

		const operation = await findDefaultOperationProfileForType({
			organizacaoId,
			tipoDocumento: "NFCE",
			profileId: parsedConfig.operacaoPadraoPorTipo?.NFCE ?? null,
		});
		if (!operation) throw new createHttpError.BadRequest("Perfil de operacao NFC-e deve estar configurado para emissao automatica.");

		const series =
			operation.seriePadrao ??
			(await findActiveFiscalSeries({
				organizacaoId,
				tipoDocumento: "NFCE",
				ambiente: parsedConfig.ambiente,
			}));
		if (!series) throw new createHttpError.BadRequest("Serie NFC-e ativa deve estar configurada para emissao automatica.");
	}

	const [updated] = await db
		.update(organizations)
		.set({
			fiscalProvedor,
			fiscalEmissaoAutomatica,
			fiscalConfiguracao: parsedConfig,
		})
		.where(eq(organizations.id, organizacaoId))
		.returning({ id: organizations.id });

	if (!updated?.id) throw new createHttpError.InternalServerError("Erro ao salvar configuracao fiscal.");
	return updated;
}

export async function loadFiscalOrganization(organizacaoId: string) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, operators) => operators.eq(fields.id, organizacaoId),
	});
	return organization ?? null;
}

export async function syncFiscalCompany(organizacaoId: string) {
	const organization = await loadFiscalOrganization(organizacaoId);
	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");

	const provider = resolveFiscalProvider(organization.fiscalProvedor);
	return provider.sincronizarEmpresa(organization);
}

export async function syncFiscalCompanyCertificate({
	organizacaoId,
	storagePath,
	password,
}: {
	organizacaoId: string;
	storagePath: string;
	password: string;
}) {
	const organization = await loadFiscalOrganization(organizacaoId);
	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");
	if (!organization.fiscalConfiguracao) throw new createHttpError.BadRequest("Configuracao fiscal nao encontrada.");

	const provider = resolveFiscalProvider(organization.fiscalProvedor);
	const result = await provider.sincronizarCertificadoEmpresa(organization, { storagePath, password });
	const fiscalConfiguracao = OrganizationFiscalConfigSchema.parse({
		...organization.fiscalConfiguracao,
		nuvemFiscal: {
			...organization.fiscalConfiguracao.nuvemFiscal,
			certificado: {
				...organization.fiscalConfiguracao.nuvemFiscal.certificado,
				...result.certificado,
			},
		},
	});

	await db.update(organizations).set({ fiscalConfiguracao }).where(eq(organizations.id, organizacaoId));

	return result;
}

export async function findActiveFiscalSeries({
	organizacaoId,
	tipoDocumento,
	ambiente,
}: {
	organizacaoId: string;
	tipoDocumento: typeof fiscalSeries.$inferSelect.tipoDocumento;
	ambiente: typeof fiscalSeries.$inferSelect.ambiente;
}) {
	return db.query.fiscalSeries.findFirst({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, organizacaoId),
				operators.eq(fields.tipoDocumento, tipoDocumento),
				operators.eq(fields.ambiente, ambiente),
				operators.eq(fields.ativo, true),
			),
		orderBy: (fields, operators) => operators.asc(fields.serie),
	});
}

export async function listFiscalSeries(organizacaoId: string) {
	return db.query.fiscalSeries.findMany({
		where: (fields, operators) => operators.eq(fields.organizacaoId, organizacaoId),
		orderBy: (fields, operators) => [operators.asc(fields.tipoDocumento), operators.asc(fields.ambiente), operators.asc(fields.serie)],
	});
}

type FindFiscalSeriesByIdParams = {
	seriesId: string;
	organizationId: string;
};
export async function findFiscalSeriesById({ seriesId, organizationId }: FindFiscalSeriesByIdParams) {
	return db.query.fiscalSeries.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.id, seriesId), operators.eq(fields.organizacaoId, organizationId)),
	});
}

export async function upsertFiscalSeries(input: typeof fiscalSeries.$inferInsert) {
	if (input.id) {
		const [updated] = await db
			.update(fiscalSeries)
			.set(input)
			.where(and(eq(fiscalSeries.id, input.id), eq(fiscalSeries.organizacaoId, input.organizacaoId)))
			.returning();
		return updated;
	}
	const [created] = await db.insert(fiscalSeries).values(input).returning();
	return created;
}

export async function consumeFiscalSeriesNumber(seriesId: string) {
	const [updated] = await db
		.update(fiscalSeries)
		.set({
			proximoNumero: sql`${fiscalSeries.proximoNumero} + 1`,
		})
		.where(eq(fiscalSeries.id, seriesId))
		.returning();
	return updated ?? null;
}

export async function reserveFiscalSeriesNumber(seriesId: string) {
	const [updated] = await db
		.update(fiscalSeries)
		.set({
			proximoNumero: sql`${fiscalSeries.proximoNumero} + 1`,
		})
		.where(eq(fiscalSeries.id, seriesId))
		.returning({ nextNumber: fiscalSeries.proximoNumero });

	if (!updated?.nextNumber) throw new createHttpError.InternalServerError("Erro ao reservar numero da serie fiscal.");
	return updated.nextNumber - 1;
}

export async function listFiscalOperationProfiles(organizacaoId: string) {
	return db.query.fiscalOperationProfiles.findMany({
		where: (fields, operators) => operators.eq(fields.organizacaoId, organizacaoId),
		with: {
			seriePadrao: true,
		},
		orderBy: (fields, operators) => operators.asc(fields.nome),
	});
}

type FindFiscalOperationProfileByIdParams = {
	fiscalOperationProfileId: string;
	organizationId: string;
};

export async function findFiscalOperationProfileById({ fiscalOperationProfileId, organizationId }: FindFiscalOperationProfileByIdParams) {
	return db.query.fiscalOperationProfiles.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.id, fiscalOperationProfileId), operators.eq(fields.organizacaoId, organizationId)),
		with: {
			seriePadrao: true,
		},
	});
}

export async function findDefaultOperationProfileForType({
	organizacaoId,
	tipoDocumento,
	profileId,
}: {
	organizacaoId: string;
	tipoDocumento: typeof fiscalOperationProfiles.$inferSelect.tipoDocumento;
	profileId?: string | null;
}) {
	if (profileId) return findFiscalOperationProfileById({ fiscalOperationProfileId: profileId, organizationId: organizacaoId });

	return db.query.fiscalOperationProfiles.findFirst({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, organizacaoId),
				operators.eq(fields.tipoDocumento, tipoDocumento),
				operators.eq(fields.ativo, true),
			),
		with: {
			seriePadrao: true,
		},
		orderBy: (fields, operators) => operators.asc(fields.nome),
	});
}

export async function upsertFiscalOperationProfile(input: typeof fiscalOperationProfiles.$inferInsert) {
	if (input.id) {
		const [updated] = await db
			.update(fiscalOperationProfiles)
			.set(input)
			.where(and(eq(fiscalOperationProfiles.id, input.id), eq(fiscalOperationProfiles.organizacaoId, input.organizacaoId)))
			.returning();
		return updated;
	}
	const [created] = await db.insert(fiscalOperationProfiles).values(input).returning();
	return created;
}
