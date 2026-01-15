import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { UtilsRFMSchema } from "@/schemas/utils";
import { db } from "@/services/drizzle";
import { utils } from "@/services/drizzle/schema";
import type { TRFMConfig } from "@/utils/rfm";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

async function getRFMConfig({ sessionUser }: { sessionUser: TAuthUserSession["user"] }) {
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const sessionUserOrgId = sessionUser.organizacaoId;
	if (!sessionUserOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const configReturned = await db.query.utils.findFirst({
		where: and(eq(utils.identificador, "CONFIG_RFM"), eq(utils.organizacaoId, sessionUserOrgId)),
	});

	const organizationRFMConfig = configReturned && configReturned.valor.identificador === "CONFIG_RFM" ? configReturned.valor : null;
	return {
		data: organizationRFMConfig,
		message: organizationRFMConfig ? "Configuração RFM encontrada com sucesso." : "Configuração RFM não encontrada.",
	};
}
export type TGetRFMConfigOutput = Awaited<ReturnType<typeof getRFMConfig>>;

const getRFMConfigRoute: NextApiHandler<TGetRFMConfigOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const result = await getRFMConfig({ sessionUser: sessionUser.user });
	return res.status(200).json(result);
};

export const UpdateRFMConfigInputSchema = z.object({
	rfmConfig: UtilsRFMSchema.shape.valor,
});
export type TUpdateRFMConfigInput = z.infer<typeof UpdateRFMConfigInputSchema>;

async function updateRFMConfig({ sessionUser, input }: { sessionUser: TAuthUserSession["user"]; input: TUpdateRFMConfigInput }) {
	const sessionUserOrgId = sessionUser.organizacaoId;
	if (!sessionUserOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const organizationRFMConfig = await db.query.utils.findFirst({
		where: and(eq(utils.identificador, "CONFIG_RFM"), eq(utils.organizacaoId, sessionUserOrgId)),
	});

	if (!organizationRFMConfig) throw new createHttpError.NotFound("Configuração RFM não encontrada.");

	const updateRFMConfigResponse = await db
		.update(utils)
		.set({
			identificador: "CONFIG_RFM",
			valor: input.rfmConfig,
		})
		.where(and(eq(utils.id, organizationRFMConfig.id), eq(utils.organizacaoId, sessionUserOrgId)))
		.returning({
			id: utils.id,
		});

	const updatedRFMConfigId = updateRFMConfigResponse[0]?.id;
	if (!updatedRFMConfigId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar configuração.");

	return {
		data: {
			updatedId: updatedRFMConfigId,
		},
		message: "Configuração RFM atualizada com sucesso.",
	};
}
export type TUpdateRFMConfigOutput = Awaited<ReturnType<typeof updateRFMConfig>>;

const updateRFMConfigRoute: NextApiHandler<TUpdateRFMConfigOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = UpdateRFMConfigInputSchema.parse(req.body);
	const result = await updateRFMConfig({ sessionUser: sessionUser.user, input });
	return res.status(200).json(result);
};

const CreateRFMConfigInputSchema = z.object({
	rfmConfig: UtilsRFMSchema.shape.valor,
});
export type TCreateRFMConfigInput = z.infer<typeof CreateRFMConfigInputSchema>;

async function createRFMConfig({ sessionUser, input }: { sessionUser: TAuthUserSession["user"]; input: TCreateRFMConfigInput }) {
	const sessionUserOrgId = sessionUser.organizacaoId;
	if (!sessionUserOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const existingOrganizationRFMConfig = await db.query.utils.findFirst({
		where: and(eq(utils.identificador, "CONFIG_RFM"), eq(utils.organizacaoId, sessionUserOrgId)),
	});
	if (existingOrganizationRFMConfig) throw new createHttpError.Conflict("Já existe uma configuração RFM para esta organização.");

	const createdRFMConfig = await db
		.insert(utils)
		.values({
			identificador: "CONFIG_RFM",
			valor: input.rfmConfig,
			organizacaoId: sessionUserOrgId,
		})
		.returning({
			id: utils.id,
		});

	const createdRFMConfigId = createdRFMConfig[0]?.id;

	if (!createdRFMConfigId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar configuração.");

	return {
		data: {
			createdId: createdRFMConfigId,
		},
		message: "Configuração RFM criada com sucesso.",
	};
}
export type TCreateRFMConfigOutput = Awaited<ReturnType<typeof createRFMConfig>>;

const createRFMConfigRoute: NextApiHandler<TCreateRFMConfigOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = CreateRFMConfigInputSchema.parse(req.body);
	const result = await createRFMConfig({ sessionUser: sessionUser.user, input });
	return res.status(200).json(result);
};
export default apiHandler({
	GET: getRFMConfigRoute,
	PUT: updateRFMConfigRoute,
	POST: createRFMConfigRoute,
});
