import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { DEFAULT_REPLENISHMENT_SETTINGS, getReplenishmentSettings } from "@/lib/replenishment/settings";
import { ProductReplenishmentSettingsSchema, ReplenishmentSettingsSchema } from "@/schemas/replenishment";
import { db } from "@/services/drizzle";
import { productReplenishmentSettings, products, replenishmentSettings } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const GetReplenishmentSettingsInputSchema = z.object({
	productIds: z
		.string({ invalid_type_error: "Tipo não válido para produtos." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : [])),
});
export type TGetReplenishmentSettingsInput = z.infer<typeof GetReplenishmentSettingsInputSchema>;

async function getSettings({ input, session }: { input: TGetReplenishmentSettingsInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.compras.visualizar)
		throw new createHttpError.Unauthorized("Você não possui permissão para acessar esse recurso.");

	const organizacao = await getReplenishmentSettings({ organizationId });
	const produtos =
		input.productIds.length > 0
			? await db
					.select()
					.from(productReplenishmentSettings)
					.where(and(eq(productReplenishmentSettings.organizacaoId, organizationId), inArray(productReplenishmentSettings.produtoId, input.productIds)))
			: [];

	return { data: { organizacao, produtos }, message: "Política de reposição obtida com sucesso." };
}
export type TGetReplenishmentSettingsOutput = Awaited<ReturnType<typeof getSettings>>;

async function getSettingsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetReplenishmentSettingsInputSchema.parse({ productIds: request.nextUrl.searchParams.get("productIds") });
	return NextResponse.json(await getSettings({ input, session }));
}

// Um único endpoint grava a política da loja e os overrides por produto: na tela as duas coisas são
// editadas no mesmo fluxo (ajusto o prazo padrão e, na mesma passada, marco três itens como
// sobressalentes), e separar em duas requisições deixaria a metade do ajuste salva se uma falhasse.
const UpdateReplenishmentSettingsInputSchema = z.object({
	organizacao: ReplenishmentSettingsSchema.optional().nullable(),
	produtos: z.array(ProductReplenishmentSettingsSchema).optional().nullable(),
});
export type TUpdateReplenishmentSettingsInput = z.infer<typeof UpdateReplenishmentSettingsInputSchema>;

async function updateSettings({ input, session }: { input: TUpdateReplenishmentSettingsInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.compras.editar)
		throw new createHttpError.Unauthorized("Você não possui permissão para editar a política de reposição.");

	const produtosInput = input.produtos ?? [];
	if (produtosInput.length > 0) {
		// Todo produto referenciado precisa ser da própria organização: o ID vem do cliente e sem
		// esta checagem um payload forjado gravaria política no catálogo de outra loja.
		const owned = await db
			.select({ id: products.id })
			.from(products)
			.where(
				and(
					eq(products.organizacaoId, organizationId),
					inArray(
						products.id,
						produtosInput.map((produto) => produto.produtoId),
					),
				),
			);
		if (owned.length !== new Set(produtosInput.map((produto) => produto.produtoId)).size) {
			throw new createHttpError.BadRequest("Um ou mais produtos informados não pertencem à sua organização.");
		}
	}

	await db.transaction(async (tx) => {
		if (input.organizacao) {
			await tx
				.insert(replenishmentSettings)
				.values({ organizacaoId: organizationId, ...input.organizacao, autorId: session.user.id, dataAtualizacao: new Date() })
				.onConflictDoUpdate({
					target: replenishmentSettings.organizacaoId,
					set: { ...input.organizacao, autorId: session.user.id, dataAtualizacao: new Date() },
				});
		}

		for (const produto of produtosInput) {
			await tx
				.insert(productReplenishmentSettings)
				.values({ organizacaoId: organizationId, ...produto, autorId: session.user.id, dataAtualizacao: new Date() })
				.onConflictDoUpdate({
					target: productReplenishmentSettings.produtoId,
					set: { ...produto, autorId: session.user.id, dataAtualizacao: new Date() },
				});
		}
	});

	return { data: { organizacao: input.organizacao ?? DEFAULT_REPLENISHMENT_SETTINGS }, message: "Política de reposição salva com sucesso." };
}
export type TUpdateReplenishmentSettingsOutput = Awaited<ReturnType<typeof updateSettings>>;

async function updateSettingsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = UpdateReplenishmentSettingsInputSchema.parse(await request.json());
	return NextResponse.json(await updateSettings({ input, session }));
}

export const GET = appApiHandler({ GET: getSettingsRoute });
export const PUT = appApiHandler({ PUT: updateSettingsRoute });
