import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { handleSimpleChildRowsProcessing } from "@/lib/db-utils";
import { CampaignSchema, CampaignSegmentationSchema } from "@/schemas/campaigns";
import { db } from "@/services/drizzle";
import { campaignSegmentations, campaigns } from "@/services/drizzle/schema/campaigns";
import { and, eq, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreateCampaignInputSchema = z.object({
	campaign: CampaignSchema.omit({ dataInsercao: true, autorId: true }),
	segmentations: z.array(CampaignSegmentationSchema.omit({ campanhaId: true })),
});
export type TCreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;

async function createCampaign({ input, session }: { input: TCreateCampaignInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	// Doing some validations before starting the process
	if (
		input.campaign.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO" &&
		(!input.campaign.gatilhoTempoPermanenciaMedida || !input.campaign.gatilhoTempoPermanenciaValor)
	) {
		throw new createHttpError.BadRequest("Define um tempo de permanência para a segmentação.");
	}

	// Validate cashback generation settings
	if (input.campaign.cashbackGeracaoAtivo) {
		if (!input.campaign.cashbackGeracaoTipo) {
			throw new createHttpError.BadRequest("Selecione o tipo de geração de cashback (FIXO ou PERCENTUAL).");
		}
		if (!input.campaign.cashbackGeracaoValor || input.campaign.cashbackGeracaoValor <= 0) {
			throw new createHttpError.BadRequest("Informe um valor válido para o cashback.");
		}
		// Validate PERCENTUAL is only used with sale-value triggers
		if (input.campaign.cashbackGeracaoTipo === "PERCENTUAL") {
			const validTriggersForPercentual = ["NOVA-COMPRA", "PRIMEIRA-COMPRA"];
			if (!validTriggersForPercentual.includes(input.campaign.gatilhoTipo)) {
				throw new createHttpError.BadRequest("Cashback percentual só pode ser usado com gatilhos NOVA-COMPRA ou PRIMEIRA-COMPRA.");
			}
		}
	}

	const insertedCampaignResponse = await db
		.insert(campaigns)
		.values({ ...input.campaign, organizacaoId: userOrgId, autorId: session.user.id })
		.returning({ id: campaigns.id });

	const insertedCampaignId = insertedCampaignResponse[0]?.id;
	if (!insertedCampaignId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar campanha.");
	await db
		.insert(campaignSegmentations)
		.values(input.segmentations.map((segmentation) => ({ ...segmentation, campanhaId: insertedCampaignId, organizacaoId: userOrgId })));

	return {
		data: {
			insertedId: insertedCampaignId,
		},
		message: "Campanha criada com sucesso.",
	};
}
export type TCreateCampaignOutput = Awaited<ReturnType<typeof createCampaign>>;

const createCampaignRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const input = await request.json();
	const parsedInput = CreateCampaignInputSchema.parse(input);
	const result = await createCampaign({ input: parsedInput, session: session });
	return NextResponse.json(result, { status: 201 });
};

export const POST = appApiHandler({
	POST: createCampaignRoute,
});

const GetCampaignsInputSchema = z.object({
	// By ID params
	id: z
		.string({
			required_error: "ID da campanha não informado.",
			invalid_type_error: "Tipo não válido para o ID da campanha.",
		})
		.optional()
		.nullable(),
	// General params
	search: z
		.string({
			required_error: "Busca não informada.",
			invalid_type_error: "Tipo não válido para a busca.",
		})
		.optional()
		.nullable(),
	activeOnly: z
		.string({
			invalid_type_error: "Tipo não válido para o ativo da campanha.",
		})
		.optional()
		.nullable()
		.transform((v) => v === "true"),
});
export type TGetCampaignsInput = z.infer<typeof GetCampaignsInputSchema>;

async function getCampaigns({ input, session }: { input: TGetCampaignsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if ("id" in input && input.id) {
		const campaignId = input.id;
		if (!campaignId) throw new createHttpError.BadRequest("ID da campanha não informado.");

		const campaign = await db.query.campaigns.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, campaignId), eq(fields.organizacaoId, userOrgId)),
			with: {
				segmentacoes: true,
			},
		});
		if (!campaign) throw new createHttpError.NotFound("Campanha não encontrada.");

		return {
			data: {
				byId: campaign,
				default: null,
			},
			message: "Campanha encontrada com sucesso.",
		};
	}

	const conditions = [eq(campaigns.organizacaoId, userOrgId)];
	if (input.search && input.search.trim().length > 0) {
		const searchCondition = or(
			sql`(to_tsvector('portuguese', ${campaigns.titulo}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${campaigns.titulo} ILIKE '%' || ${input.search} || '%')`,
			sql`(to_tsvector('portuguese', ${campaigns.descricao}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${campaigns.descricao} ILIKE '%' || ${input.search} || '%')`,
		);
		if (searchCondition) {
			conditions.push(searchCondition);
		}
	}
	if (input.activeOnly && input.activeOnly) {
		conditions.push(eq(campaigns.ativo, true));
	}

	const campaignsResult = await db.query.campaigns.findMany({
		where: and(...conditions),
		with: {
			segmentacoes: true,
		},
	});

	return {
		data: {
			byId: null,
			default: campaignsResult,
		},
		message: "Campanhas encontradas com sucesso.",
	};
}
export type TGetCampaignsOutput = Awaited<ReturnType<typeof getCampaigns>>;
export type TGetCampaignsOutputDefault = Exclude<TGetCampaignsOutput["data"]["default"], undefined | null>;
export type TGetCampaignsOutputById = Exclude<TGetCampaignsOutput["data"]["byId"], undefined | null>;

const getCampaignsRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetCampaignsInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		search: searchParams.get("search") ?? undefined,
		activeOnly: searchParams.get("activeOnly") ?? undefined,
	});
	const result = await getCampaigns({ input, session: session });
	return NextResponse.json(result, { status: 200 });
};
export const GET = appApiHandler({
	GET: getCampaignsRoute,
});

const UpdateCampaignInputSchema = z.object({
	campaignId: z.string({
		required_error: "ID da campanha não informado.",
		invalid_type_error: "Tipo não válido para o ID da campanha.",
	}),
	campaign: CampaignSchema.omit({ dataInsercao: true, autorId: true }),
	segmentations: z.array(
		CampaignSegmentationSchema.omit({ campanhaId: true }).extend({
			id: z
				.string({
					required_error: "ID da segmentação da campanha não informado.",
					invalid_type_error: "Tipo não válido para o ID da segmentação da campanha.",
				})
				.optional(),
			deletar: z
				.boolean({
					required_error: "Deletar segmentação da campanha não informado.",
					invalid_type_error: "Tipo não válido para deletar segmentação da campanha.",
				})
				.optional(),
		}),
	),
});
export type TUpdateCampaignInput = z.infer<typeof UpdateCampaignInputSchema>;

async function updateCampaign({ input, session }: { input: TUpdateCampaignInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const campaignId = input.campaignId;

	// Validate cashback generation settings
	if (input.campaign.cashbackGeracaoAtivo) {
		if (!input.campaign.cashbackGeracaoTipo) {
			throw new createHttpError.BadRequest("Selecione o tipo de geração de cashback (FIXO ou PERCENTUAL).");
		}
		if (!input.campaign.cashbackGeracaoValor || input.campaign.cashbackGeracaoValor <= 0) {
			throw new createHttpError.BadRequest("Informe um valor válido para o cashback.");
		}
		// Validate PERCENTUAL is only used with sale-value triggers
		if (input.campaign.cashbackGeracaoTipo === "PERCENTUAL") {
			const validTriggersForPercentual = ["NOVA-COMPRA", "PRIMEIRA-COMPRA"];
			if (!validTriggersForPercentual.includes(input.campaign.gatilhoTipo)) {
				throw new createHttpError.BadRequest("Cashback percentual só pode ser usado com gatilhos NOVA-COMPRA ou PRIMEIRA-COMPRA.");
			}
		}
	}

	return await db.transaction(async (trx) => {
		console.log("[INFO] [UPDATE-CAMPAIGN] Starting to update campaign...", {
			campaignId,
			campaign: input.campaign,
			segmentations: input.segmentations,
		});
		const updatedCampaignResponse = await trx
			.update(campaigns)
			.set({ ...input.campaign, organizacaoId: userOrgId })
			.where(and(eq(campaigns.id, campaignId), eq(campaigns.organizacaoId, userOrgId)))
			.returning({ id: campaigns.id });

		const updatedCampaignId = updatedCampaignResponse[0]?.id;
		if (!updatedCampaignId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar campanha.");

		console.log("[INFO] [UPDATE-CAMPAIGN] Campaign updated successfully, starting to process segmentations...");
		await handleSimpleChildRowsProcessing({
			trx: trx,
			table: campaignSegmentations,
			entities: input.segmentations,
			fatherEntityKey: "campanhaId",
			fatherEntityId: updatedCampaignId,
			organizacaoId: userOrgId,
		});

		return {
			data: {
				updatedId: updatedCampaignId,
			},
			message: "Campanha atualizada com sucesso.",
		};
	});
}
export type TUpdateCampaignOutput = Awaited<ReturnType<typeof updateCampaign>>;

const updateCampaignRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const input = await request.json();
	const parsedInput = UpdateCampaignInputSchema.parse(input);
	const result = await updateCampaign({ input: parsedInput, session: session });
	return NextResponse.json(result, { status: 200 });
};
export const PUT = appApiHandler({
	PUT: updateCampaignRoute,
});
