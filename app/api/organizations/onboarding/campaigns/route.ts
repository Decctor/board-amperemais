import {
	OnboardingCampaignPresets,
	OnboardingCampaignPresetsByKey,
	type TOnboardingCampaignPresetKey,
} from "@/config/onboarding-campaign-presets";
import { seedOnboardingMessageTemplates, type TOnboardingMessageTemplateKey } from "@/config/onboarding-message-templates";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { campaignSegmentations, campaigns } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Seeds the campaigns chosen in the onboarding campaigns stage. Each preset is parameterized by
// whether cashback is active, and the per-org message templates the campaigns reference are seeded
// here (the COM_CASHBACK or SEM_CASHBACK variant) — fixing the historical gap where campaigns
// pointed at template UUIDs that were never created. Idempotent: re-running replaces the set of
// onboarding-managed campaigns (identified by their preset titles) with the new selection.
const SeedOnboardingCampaignsInputSchema = z.object({
	cashbackAtivo: z.boolean({ invalid_type_error: "Tipo inválido para cashback ativo." }),
	selectedKeys: z.array(z.string({ invalid_type_error: "Tipo inválido para a chave da campanha." })),
});
export type TSeedOnboardingCampaignsInput = z.infer<typeof SeedOnboardingCampaignsInputSchema>;

async function seedOnboardingCampaigns({ input, session }: { input: TSeedOnboardingCampaignsInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para configurar campanhas.");

	const variant = input.cashbackAtivo ? "COM_CASHBACK" : "SEM_CASHBACK";

	// Resolve the selected presets, honoring the cashback availability rule.
	const selectedPresets = input.selectedKeys
		.map((key) => OnboardingCampaignPresetsByKey.get(key as TOnboardingCampaignPresetKey))
		.filter((preset): preset is NonNullable<typeof preset> => !!preset && (input.cashbackAtivo || !preset.requiresCashback));

	// Titles of every preset (constant across the cashback flag) — the set of onboarding-managed campaigns.
	const managedTitles = OnboardingCampaignPresets.map((preset) => preset.buildCampaignFields(true).titulo);

	// First connected WhatsApp phone, so seeded campaigns are wired to send right away.
	const connection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, organizacaoId),
		with: { telefones: { columns: { id: true }, limit: 1 } },
	});
	const whatsappConexaoTelefoneId = connection?.telefones[0]?.id ?? null;

	const created = await db.transaction(async (tx) => {
		// Seed the message templates referenced by the selected presets (upsert → key→id map).
		const templateKeys = Array.from(new Set(selectedPresets.map((preset) => preset.templateKey))) as TOnboardingMessageTemplateKey[];
		const templateIdByKey = await seedOnboardingMessageTemplates({
			tx,
			organizationId: organizacaoId,
			autorId: session.user.id,
			variant,
			keys: templateKeys,
		});

		// Replace previously seeded onboarding campaigns with the new selection.
		const existing = await tx
			.select({ id: campaigns.id })
			.from(campaigns)
			.where(and(eq(campaigns.organizacaoId, organizacaoId), inArray(campaigns.titulo, managedTitles)));
		if (existing.length > 0) {
			const existingIds = existing.map((row) => row.id);
			await tx.delete(campaignSegmentations).where(inArray(campaignSegmentations.campanhaId, existingIds));
			await tx.delete(campaigns).where(inArray(campaigns.id, existingIds));
		}

		const createdIds: string[] = [];
		for (const preset of selectedPresets) {
			const whatsappTemplateId = templateIdByKey.get(preset.templateKey);
			if (!whatsappTemplateId) continue;

			const inserted = await tx
				.insert(campaigns)
				.values({
					...preset.buildCampaignFields(input.cashbackAtivo),
					organizacaoId,
					autorId: session.user.id,
					whatsappTemplateId,
					whatsappConexaoTelefoneId,
				})
				.returning({ id: campaigns.id });
			const campaignId = inserted[0]?.id;
			if (!campaignId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar campanha.");

			if (preset.segmentacoes.length > 0) {
				await tx.insert(campaignSegmentations).values(
					preset.segmentacoes.map((segmentacao) => ({
						campanhaId: campaignId,
						organizacaoId,
						segmentacao,
					})),
				);
			}
			createdIds.push(campaignId);
		}
		return createdIds;
	});

	return { data: { campaignIds: created }, message: "Campanhas configuradas com sucesso." };
}
export type TSeedOnboardingCampaignsOutput = Awaited<ReturnType<typeof seedOnboardingCampaigns>>;

async function seedOnboardingCampaignsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = SeedOnboardingCampaignsInputSchema.parse(await request.json());
	const result = await seedOnboardingCampaigns({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: seedOnboardingCampaignsRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
