import { appApiHandler } from "@/lib/app-api";
import { requireOrgSession } from "@/lib/authentication/erp-session";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { resolveShowcaseChannelRows } from "@/lib/products/sales-channels";
import { channelProductFilter, ensureSalesChannels, loadChannelState } from "@/lib/products/sales-channels-store";
import { SalesChannelCatalogModeEnum, SalesChannelTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { productChannelSettings, products, salesChannels } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// A vitrine é a curadoria de um canal INTERNO: o iFood tem um canal por loja (refExterno) e uma
// tela própria de vínculo, então não entra por aqui — a identidade dele não cabe em um parâmetro.
const InternalSalesChannelEnum = SalesChannelTypeEnum.exclude(["IFOOD"]);
type TInternalSalesChannel = z.infer<typeof InternalSalesChannelEnum>;

const GetSalesChannelShowcaseInputSchema = z.object({
	channel: InternalSalesChannelEnum,
});
export type TGetSalesChannelShowcaseInput = z.infer<typeof GetSalesChannelShowcaseInputSchema>;

const ShowcaseProductInputSchema = z.object({
	produtoId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo não válido para ID do produto.",
		})
		.min(1, { message: "ID do produto não informado." }),
	// Nulo = herda o preço base do produto. Só vale para produto sem variantes (mesma regra do
	// PUT /api/products/channel-settings): com variantes, o preço do canal é por variante.
	precoVenda: z
		.number({
			invalid_type_error: "Tipo não válido para preço na loja.",
		})
		.nonnegative({ message: "O preço na loja não pode ser negativo." })
		.optional()
		.nullable(),
});

const UpdateSalesChannelShowcaseInputSchema = z
	.object({
		channel: InternalSalesChannelEnum,
		catalogoModo: SalesChannelCatalogModeEnum,
		ordemGrupos: z.array(
			z.string({ invalid_type_error: "Tipo não válido para grupo da vitrine." }).trim().min(1, { message: "Grupo da vitrine sem nome." }),
		),
		produtos: z.array(ShowcaseProductInputSchema),
	})
	.superRefine((data, ctx) => {
		if (new Set(data.produtos.map((produto) => produto.produtoId)).size !== data.produtos.length) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["produtos"], message: "Há produtos repetidos na vitrine." });
		}
		if (new Set(data.ordemGrupos).size !== data.ordemGrupos.length) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ordemGrupos"], message: "Há grupos repetidos na ordem da vitrine." });
		}
	});
export type TUpdateSalesChannelShowcaseInput = z.infer<typeof UpdateSalesChannelShowcaseInputSchema>;

async function findInternalChannel({ orgId, channel }: { orgId: string; channel: TInternalSalesChannel }) {
	// `ensureSalesChannels` primeiro: numa organização que nunca teve o canal materializado, é ele
	// que traduz o bloco legado do jsonb da loja — sem isso a vitrine nasceria vazia.
	const channels = await ensureSalesChannels({ orgId });
	const row = channels.find((item) => item.canal === channel && !item.integracaoId && !item.refExterno);
	if (!row) throw new createHttpError.NotFound("Canal de venda não encontrado.");
	return row;
}

async function getSalesChannelShowcase({ orgId, input }: { orgId: string; input: TGetSalesChannelShowcaseInput }) {
	const channel = await findInternalChannel({ orgId, channel: input.channel });
	const state = await loadChannelState({ orgId, canal: input.channel });
	if (!state) throw new createHttpError.NotFound("Canal de venda não encontrado.");

	const conditions = [eq(products.organizacaoId, orgId), eq(products.ativo, true), eq(products.vendavel, true)];
	const filter = channelProductFilter(state);
	if (filter.includeIds) conditions.push(inArray(products.id, filter.includeIds));
	if (filter.excludeIds) conditions.push(notInArray(products.id, filter.excludeIds));

	// Sem os portões de preço e estoque de propósito: a loja esconde o que está sem preço ou sem
	// saldo, mas quem monta a vitrine precisa ver o que configurou — senão o produto some da tela
	// sem explicação e a única saída é reconfigurá-lo às cegas.
	const showcaseProducts =
		filter.includeIds?.length === 0
			? []
			: await db.query.products.findMany({
					where: and(...conditions),
					columns: {
						id: true,
						nome: true,
						codigo: true,
						grupo: true,
						imagemCapaUrl: true,
						precoVenda: true,
						rastreamentoEstoqueAtivo: true,
						quantidade: true,
					},
					// Todas as variantes, não só as ativas: quem tem variante precifica por variante, e
					// essa regra não muda porque a variante está desligada hoje.
					with: { variantes: { columns: { id: true } } },
					orderBy: (fields, { asc }) => asc(fields.nome),
				});

	const items = showcaseProducts.map((product) => ({
		id: product.id,
		nome: product.nome,
		codigo: product.codigo,
		grupo: product.grupo,
		imagemCapaUrl: product.imagemCapaUrl,
		precoVenda: product.precoVenda,
		precoVendaCanal: state.productOverrides.get(product.id)?.precoVenda ?? null,
		temVariantes: product.variantes.length > 0,
		rastreamentoEstoqueAtivo: product.rastreamentoEstoqueAtivo,
		quantidade: product.quantidade,
	}));

	// Poda na leitura: um grupo renomeado no cadastro deixa a entrada órfã na ordem. Corrigir isso
	// a cada edição de produto exigiria varrer os canais; aqui basta ignorar o que não existe mais.
	const presentGroups = new Set(items.map((item) => item.grupo).filter((grupo) => grupo.trim().length > 0));
	const ordemGrupos = channel.ordemGrupos.filter((grupo, index, list) => presentGroups.has(grupo) && list.indexOf(grupo) === index);

	return {
		data: {
			channel: { id: channel.id, canal: channel.canal, catalogoModo: channel.catalogoModo, ordemGrupos },
			products: items,
		},
		message: "Vitrine do canal carregada com sucesso.",
	};
}
export type TGetSalesChannelShowcaseOutput = Awaited<ReturnType<typeof getSalesChannelShowcase>>;

async function updateSalesChannelShowcase({ orgId, input }: { orgId: string; input: TUpdateSalesChannelShowcaseInput }) {
	const channel = await findInternalChannel({ orgId, channel: input.channel });
	const listed = new Map(input.produtos.map((produto) => [produto.produtoId, produto.precoVenda ?? null]));
	const listedIds = [...listed.keys()];
	const eligibility = and(eq(products.ativo, true), eq(products.vendavel, true));

	// Uma consulta cobre escopo e elegibilidade: os produtos enviados (para validar) e os elegíveis
	// (para saber quem precisa de linha de exclusão no modo TODOS).
	const candidates = await db.query.products.findMany({
		where: and(eq(products.organizacaoId, orgId), listedIds.length ? or(inArray(products.id, listedIds), eligibility) : eligibility),
		columns: { id: true, ativo: true, vendavel: true },
		with: { variantes: { columns: { id: true } } },
	});
	const candidateById = new Map(candidates.map((product) => [product.id, product]));

	for (const produtoId of listedIds) {
		const product = candidateById.get(produtoId);
		if (!product) throw new createHttpError.BadRequest("Um ou mais produtos da vitrine não pertencem à organização.");
		if (!product.ativo || !product.vendavel) {
			throw new createHttpError.BadRequest("Um produto inativo ou não vendável não pode entrar na vitrine.");
		}
		if (product.variantes.length && listed.get(produtoId) != null) {
			throw new createHttpError.BadRequest("Defina o preço por canal em cada variante deste produto.");
		}
	}

	const existingRows = await db.query.productChannelSettings.findMany({
		where: and(eq(productChannelSettings.canalVendaId, channel.id), isNull(productChannelSettings.produtoVarianteId)),
		columns: { id: true, produtoId: true, disponivel: true, precoVenda: true },
	});
	const existingByProduct = new Map(existingRows.map((row) => [row.produtoId, row]));

	// Só produtos elegíveis ou enviados entram no diff: a linha de um produto inativo fica intacta
	// para que a marca dele no canal volte a valer quando o produto for reativado.
	const touchedIds = new Set([...candidates.filter((product) => product.ativo && product.vendavel).map((product) => product.id), ...listedIds]);

	const { rowIdsToDelete, nodesToUpsert } = resolveShowcaseChannelRows({
		catalogoModo: input.catalogoModo,
		listed,
		touchedIds,
		existing: existingByProduct,
	});
	const rowsToUpsert = nodesToUpsert.map((node) => ({
		organizacaoId: orgId,
		canalVendaId: channel.id,
		produtoId: node.produtoId,
		produtoVarianteId: null,
		disponivel: node.disponivel,
		precoVenda: node.precoVenda,
	}));

	await db.transaction(async (tx) => {
		await tx
			.update(salesChannels)
			.set({ catalogoModo: input.catalogoModo, ordemGrupos: input.ordemGrupos, dataAtualizacao: new Date() })
			.where(eq(salesChannels.id, channel.id));

		if (rowIdsToDelete.length) await tx.delete(productChannelSettings).where(inArray(productChannelSettings.id, rowIdsToDelete));
		if (rowsToUpsert.length) {
			await tx
				.insert(productChannelSettings)
				.values(rowsToUpsert)
				.onConflictDoUpdate({
					target: [productChannelSettings.canalVendaId, productChannelSettings.produtoId, productChannelSettings.produtoVarianteId],
					set: { disponivel: sql`excluded.disponivel`, precoVenda: sql`excluded.preco_venda`, dataAtualizacao: new Date() },
				});
		}
	});

	// Sem `schedulePushForProduct`: o push existe para refletir preço/disponibilidade no iFood, e
	// esta rota só edita canais internos — nada aqui sai da plataforma.
	return {
		data: {
			channel: { id: channel.id, canal: channel.canal, catalogoModo: input.catalogoModo, ordemGrupos: input.ordemGrupos },
		},
		message: "Vitrine atualizada com sucesso.",
	};
}
export type TUpdateSalesChannelShowcaseOutput = Awaited<ReturnType<typeof updateSalesChannelShowcase>>;

async function getSalesChannelShowcaseRoute(request: NextRequest) {
	const session = requireOrgSession(await getCurrentSessionUncached());
	const orgId = session.membership!.organizacao.id;

	const input = GetSalesChannelShowcaseInputSchema.parse({ channel: request.nextUrl.searchParams.get("channel") });
	const result = await getSalesChannelShowcase({ orgId, input });
	return NextResponse.json(result);
}

async function updateSalesChannelShowcaseRoute(request: NextRequest) {
	const session = requireOrgSession(await getCurrentSessionUncached());
	const orgId = session.membership!.organizacao.id;

	const input = UpdateSalesChannelShowcaseInputSchema.parse(await request.json());
	const result = await updateSalesChannelShowcase({ orgId, input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getSalesChannelShowcaseRoute });
export const PUT = appApiHandler({ PUT: updateSalesChannelShowcaseRoute });
