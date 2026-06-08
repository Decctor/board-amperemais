import { appApiHandler } from "@/lib/app-api";
import { CommunityMaterialClaimMetadataSchema } from "@/schemas/community-pipeline";
import { db } from "@/services/drizzle";
import { communityMaterialClaims, communityMaterials } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ClaimCommunityMaterialInputSchema = z.object({
	slug: z
		.string({
			required_error: "Slug do material nao informado.",
			invalid_type_error: "Tipo nao valido para o slug do material.",
		})
		.min(1, "Slug do material nao informado."),
	claimKey: z
		.string({
			required_error: "Email nao informado.",
			invalid_type_error: "Tipo nao valido para o email.",
		})
		.email("Email invalido."),
	claimKeyType: z.enum(["EMAIL"]).default("EMAIL"),
	metadata: CommunityMaterialClaimMetadataSchema,
});
export type TClaimCommunityMaterialInput = z.infer<typeof ClaimCommunityMaterialInputSchema>;

async function claimCommunityMaterial({ input, request }: { input: TClaimCommunityMaterialInput; request: NextRequest }) {
	const claimKey = input.claimKey.trim().toLowerCase();
	const material = await db.query.communityMaterials.findFirst({
		where: and(eq(communityMaterials.slug, input.slug), eq(communityMaterials.status, "PUBLICADO")),
		with: {
			asset: true,
		},
	});

	if (!material) throw new createHttpError.NotFound("Material nao encontrado.");
	if (!material.asset?.storageUrl) throw new createHttpError.NotFound("Arquivo indisponivel para download.");

	const existingClaim = await db.query.communityMaterialClaims.findFirst({
		where: and(
			eq(communityMaterialClaims.materialId, material.id),
			eq(communityMaterialClaims.claimKeyType, input.claimKeyType),
			eq(communityMaterialClaims.claimKey, claimKey),
		),
		columns: { metadata: true },
	});

	const metadata = {
		...input.metadata,
		form: {
			...input.metadata.form,
			email: input.metadata.form?.email ?? claimKey,
		},
		request: {
			...input.metadata.request,
			userAgent: request.headers.get("user-agent") ?? input.metadata.request?.userAgent,
		},
		access: {
			...input.metadata.access,
			claimCount: (existingClaim?.metadata?.access?.claimCount ?? 0) + 1,
		},
	};

	const claimed = await db
		.insert(communityMaterialClaims)
		.values({
			materialId: material.id,
			claimKey,
			claimKeyType: input.claimKeyType,
			metadata,
		})
		.onConflictDoUpdate({
			target: [communityMaterialClaims.materialId, communityMaterialClaims.claimKeyType, communityMaterialClaims.claimKey],
			set: {
				metadata,
				dataAtualizacao: new Date(),
			},
		})
		.returning({ id: communityMaterialClaims.id });

	const claimId = claimed[0]?.id;
	if (!claimId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao liberar o material.");

	return {
		data: {
			materialId: material.id,
			claimId,
			downloadUrl: material.asset.storageUrl,
		},
		message: "Material liberado com sucesso.",
	};
}
export type TClaimCommunityMaterialOutput = Awaited<ReturnType<typeof claimCommunityMaterial>>;

async function claimCommunityMaterialRoute(request: NextRequest) {
	const payload = await request.json();
	const input = ClaimCommunityMaterialInputSchema.parse(payload);
	const result = await claimCommunityMaterial({ input, request });
	return NextResponse.json(result, { status: 201 });
}

export const POST = appApiHandler({ POST: claimCommunityMaterialRoute });
