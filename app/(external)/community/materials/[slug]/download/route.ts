import { db } from "@/services/drizzle";
import { communityMaterials } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const DownloadCommunityMaterialInputSchema = z.object({
	slug: z
		.string({
			required_error: "Slug do material nao informado.",
			invalid_type_error: "Tipo nao valido para o slug do material.",
		})
		.min(1, "Slug do material nao informado."),
});
export type TDownloadCommunityMaterialInput = z.infer<typeof DownloadCommunityMaterialInputSchema>;

async function getCommunityMaterialDownloadUrl({ input }: { input: TDownloadCommunityMaterialInput }) {
	const material = await db.query.communityMaterials.findFirst({
		where: and(eq(communityMaterials.slug, input.slug), eq(communityMaterials.status, "PUBLICADO")),
		with: {
			asset: true,
		},
	});

	if (!material) throw new createHttpError.NotFound("Material nao encontrado.");
	if (!material.asset?.storageUrl) throw new createHttpError.NotFound("Arquivo indisponivel para download.");

	return {
		data: {
			materialId: material.id,
			downloadUrl: material.asset.storageUrl,
		},
		message: "Download do material obtido com sucesso.",
	};
}
export type TDownloadCommunityMaterialOutput = Awaited<ReturnType<typeof getCommunityMaterialDownloadUrl>>;

export async function GET(_request: NextRequest, ctx: RouteContext<"/community/materials/[slug]/download">) {
	try {
		const params = await ctx.params;
		const input = DownloadCommunityMaterialInputSchema.parse({
			slug: params.slug,
		});
		const result = await getCommunityMaterialDownloadUrl({ input });

		return NextResponse.redirect(result.data.downloadUrl);
	} catch (error) {
		console.error("[COMMUNITY_MATERIAL_DOWNLOAD] Failed to resolve download URL.", error);
		return new NextResponse("Material indisponivel para download.", { status: 404 });
	}
}
