import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { renderBrandAssetPng, renderBrandAssetSvg } from "@/lib/brand/render";
import { BRAND_TEMPLATES } from "@/lib/brand/templates";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetBrandAssetsInputSchema = z.object({
	template: z
		.string({ invalid_type_error: "Tipo inválido para template." })
		.optional()
		.nullable()
		.transform((v) => v || null),
	variant: z
		.string({ invalid_type_error: "Tipo inválido para variante." })
		.optional()
		.nullable()
		.transform((v) => v || null),
	format: z
		.string({ invalid_type_error: "Tipo inválido para formato." })
		.optional()
		.nullable()
		.transform((v) => (v === "svg" ? "svg" : "png")),
	download: z
		.string({ invalid_type_error: "Tipo inválido para download." })
		.optional()
		.nullable()
		.transform((v) => v === "true"),
});
export type TGetBrandAssetsInput = z.infer<typeof GetBrandAssetsInputSchema>;

async function getBrandAssetTemplates() {
	const templates = Object.entries(BRAND_TEMPLATES).map(([name, template]) => ({
		name,
		description: template.description,
		width: template.width,
		height: template.height,
		variants: [...template.variants],
	}));
	return { data: { templates }, message: "Templates de assets da marca listados com sucesso." };
}
export type TGetBrandAssetsOutput = Awaited<ReturnType<typeof getBrandAssetTemplates>>;

async function renderBrandAsset({ input }: { input: { template: string; variant: string; format: "png" | "svg" } }) {
	const template = BRAND_TEMPLATES[input.template];
	if (!template) throw new createHttpError.NotFound(`Template não encontrado: ${input.template}.`);
	if (!template.variants.includes(input.variant)) {
		throw new createHttpError.BadRequest(`Variante inválida: ${input.variant}. Disponíveis: ${template.variants.join(", ")}.`);
	}

	const element = await template.render(input.variant);
	const renderOptions = { element, width: template.width, height: template.height };
	const fileBaseName = `${input.template}-${input.variant}`;

	if (input.format === "svg") {
		const svg = await renderBrandAssetSvg(renderOptions);
		return { body: new TextEncoder().encode(svg), contentType: "image/svg+xml", fileName: `${fileBaseName}.svg` };
	}

	const png = await renderBrandAssetPng(renderOptions);
	return { body: new Uint8Array(png), contentType: "image/png", fileName: `${fileBaseName}.png` };
}

async function getBrandAssetsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetBrandAssetsInputSchema.parse({
		template: searchParams.get("template"),
		variant: searchParams.get("variant"),
		format: searchParams.get("format"),
		download: searchParams.get("download"),
	});

	// Modo listagem: sem template, retorna os metadados dos templates disponíveis
	if (!input.template) {
		const result = await getBrandAssetTemplates();
		return NextResponse.json(result);
	}

	if (!input.variant) throw new createHttpError.BadRequest("Informe a variante do template.");

	const asset = await renderBrandAsset({ input: { template: input.template, variant: input.variant, format: input.format } });
	return new NextResponse(asset.body, {
		headers: {
			"Content-Type": asset.contentType,
			"Content-Disposition": `${input.download ? "attachment" : "inline"}; filename="${asset.fileName}"`,
			"Cache-Control": "private, max-age=300",
		},
	});
}

export const GET = appApiHandler({ GET: getBrandAssetsRoute });
