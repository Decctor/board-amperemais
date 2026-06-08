import { appApiHandler } from "@/lib/app-api";
import { createSimplifiedSearchCondition } from "@/lib/search";
import { db } from "@/services/drizzle";
import { communityMaterials } from "@/services/drizzle/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetPublicCommunityMaterialsInputSchema = z.object({
	id: z
		.string({
			required_error: "ID do material nao informado.",
			invalid_type_error: "Tipo nao valido para o ID do material.",
		})
		.optional(),
	slug: z
		.string({
			invalid_type_error: "Tipo nao valido para o slug do material.",
		})
		.optional(),
	search: z
		.string({
			required_error: "Busca nao informada.",
			invalid_type_error: "Tipo nao valido para busca.",
		})
		.optional(),
	tipo: z
		.string({
			invalid_type_error: "Tipo nao valido para tipo de material.",
		})
		.optional()
		.transform((v) => (v ? v.split(",") : [])),
});
export type TGetPublicCommunityMaterialsInput = z.infer<typeof GetPublicCommunityMaterialsInputSchema>;

function removeProtectedAssetFields<TMaterial extends { asset?: Record<string, unknown> | null }>(material: TMaterial) {
	if (!material.asset) return material;
	const { storageUrl: _storageUrl, ...asset } = material.asset;
	return { ...material, asset };
}

async function getPublicCommunityMaterials({ input }: { input: TGetPublicCommunityMaterialsInput }) {
	if (input.id || input.slug) {
		const communityMaterial = await db.query.communityMaterials.findFirst({
			where: and(input.slug ? eq(communityMaterials.slug, input.slug) : eq(communityMaterials.id, input.id ?? ""), eq(communityMaterials.status, "PUBLICADO")),
			with: {
				asset: true,
				autor: {
					columns: { id: true, nome: true, avatarUrl: true },
				},
			},
		});

		if (!communityMaterial) throw new createHttpError.NotFound("Material nao encontrado.");
		return { data: { byId: removeProtectedAssetFields(communityMaterial), default: null }, message: "Material obtido com sucesso." };
	}

	const conditions = [eq(communityMaterials.status, "PUBLICADO")];
	if (input.search && input.search.trim().length > 0) {
		conditions.push(createSimplifiedSearchCondition(communityMaterials.titulo, input.search));
	}
	if (input.tipo && input.tipo.length > 0) {
		conditions.push(
			inArray(communityMaterials.tipo, input.tipo as ("EBOOK" | "PLAYBOOK" | "PLANILHA" | "TEMPLATE" | "GUIA" | "CHECKLIST" | "INFOGRAFICO" | "DOCUMENTO")[]),
		);
	}

	const communityMaterialsList = await db.query.communityMaterials.findMany({
		where: and(...conditions),
		orderBy: [asc(communityMaterials.ordem), asc(communityMaterials.dataInsercao)],
		with: {
			asset: true,
			autor: {
				columns: { id: true, nome: true, avatarUrl: true },
			},
		},
	});

	return {
		data: {
			byId: null,
			default: communityMaterialsList.map(removeProtectedAssetFields),
		},
		message: "Materiais obtidos com sucesso.",
	};
}
export type TGetPublicCommunityMaterialsOutput = Awaited<ReturnType<typeof getPublicCommunityMaterials>>;
export type TGetPublicCommunityMaterialsOutputById = NonNullable<TGetPublicCommunityMaterialsOutput["data"]["byId"]>;
export type TGetPublicCommunityMaterialsOutputDefault = NonNullable<TGetPublicCommunityMaterialsOutput["data"]["default"]>;

async function getPublicCommunityMaterialsRoute(request: NextRequest) {
	const input = GetPublicCommunityMaterialsInputSchema.parse({
		id: request.nextUrl.searchParams.get("id") ?? undefined,
		slug: request.nextUrl.searchParams.get("slug") ?? undefined,
		search: request.nextUrl.searchParams.get("search") ?? undefined,
		tipo: request.nextUrl.searchParams.get("tipo") ?? undefined,
	});
	const result = await getPublicCommunityMaterials({ input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getPublicCommunityMaterialsRoute });
