import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { PartnerSchema } from "@/schemas/partners";
import { db } from "@/services/drizzle";
import { partners, sales } from "@/services/drizzle/schema";
import { and, count, eq, gte, inArray, lte, max, min, or, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreatePartnerInputSchema = z.object({
	partner: PartnerSchema.omit({ dataInsercao: true }),
});
export type TCreatePartnerInput = z.infer<typeof CreatePartnerInputSchema>;

async function createPartner({ input, session }: { input: TCreatePartnerInput; session: TAuthUserSession["user"] }) {
	const insertedPartner = await db.insert(partners).values(input.partner).returning({ id: partners.id });
	const insertedPartnerId = insertedPartner[0]?.id;
	if (!insertedPartnerId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar parceiro.");
	return {
		data: {
			insertedId: insertedPartnerId,
		},
		message: "Parceiro criado com sucesso.",
	};
}
export type TCreatePartnerOutput = Awaited<ReturnType<typeof createPartner>>;

const createPartnerRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	// if (!session.user.permissoes.parceiros.criar) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");
	const payload = await request.json();
	const input = CreatePartnerInputSchema.parse(payload);
	const result = await createPartner({ input, session: session.user });
	return NextResponse.json(result, { status: 201 });
};

export const POST = appApiHandler({
	POST: createPartnerRoute,
});

const GetPartnersInputSchema = z.object({
	// By ID params
	id: z.string({ invalid_type_error: "Tipo não válido para ID do parceiro." }).optional().nullable(),
	// General params
	search: z.string({ invalid_type_error: "Tipo não válido para busca." }).optional().nullable(),
	statsPeriodAfter: z
		.string({ invalid_type_error: "Tipo não válido para data de inserção do parceiro." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsPeriodBefore: z
		.string({ invalid_type_error: "Tipo não válido para data de inserção do parceiro." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
});

export type TGetPartnersInput = z.infer<typeof GetPartnersInputSchema>;

async function getPartners({ input, session }: { input: TGetPartnersInput; session: TAuthUserSession["user"] }) {
	if ("id" in input && input.id) {
		const sellerId = input.id;
		if (!sellerId) throw new createHttpError.BadRequest("ID do parceiro não informado.");
		const partner = await db.query.partners.findFirst({ where: (fields, { eq }) => eq(fields.id, sellerId) });
		if (!partner) throw new createHttpError.NotFound("Parceiro não encontrado.");
		return {
			data: {
				byId: partner,
				default: undefined,
			},
		};
	}

	const conditions = [];
	if (input.search) {
		conditions.push(
			or(
				sql`(to_tsvector('portuguese', ${partners.nome}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${partners.nome} ILIKE '%' || ${input.search} || '%')`,
				sql`(to_tsvector('portuguese', ${partners.identificador}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${partners.identificador} ILIKE '%' || ${input.search} || '%')`,
				sql`(to_tsvector('portuguese', ${partners.cpfCnpj}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${partners.cpfCnpj} ILIKE '%' || ${input.search} || '%')`,
				sql`(to_tsvector('portuguese', ${partners.telefone}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${partners.telefone} ILIKE '%' || ${input.search} || '%')`,
				sql`(to_tsvector('portuguese', ${partners.email}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${partners.email} ILIKE '%' || ${input.search} || '%')`,
			),
		);
	}

	const partnersResult = await db.query.partners.findMany({
		where: and(...conditions),
	});
	const partnerIds = partnersResult.map((partner) => partner.id);

	const statsByPartner = await db
		.select({
			partnerId: partners.id,
			partnerName: partners.nome,
			totalSalesValue: sum(sales.valorTotal),
			totalSalesQty: count(sales.id),
			firstSaleDate: min(sales.dataVenda), // ← Adicione isto
			lastSaleDate: max(sales.dataVenda), // ← Adicione isto
		})
		.from(partners)
		.leftJoin(sales, eq(partners.id, sales.parceiroId))
		.where(
			and(
				input.statsPeriodAfter ? gte(sales.dataVenda, input.statsPeriodAfter) : undefined,
				input.statsPeriodBefore ? lte(sales.dataVenda, input.statsPeriodBefore) : undefined,
				inArray(partners.id, partnerIds),
			),
		)
		.groupBy(partners.id);

	const partnersWithStats = partnersResult.map((partner) => {
		const stats = statsByPartner.find((s) => s.partnerId === partner.id);
		return {
			...partner,
			estatisticas: {
				vendasValorTotal: stats?.totalSalesValue ? Number(stats.totalSalesValue) : 0,
				vendasQtdeTotal: stats?.totalSalesQty ? Number(stats.totalSalesQty) : 0,
				dataPrimeiraVenda: stats?.firstSaleDate ? stats.firstSaleDate : null,
				dataUltimaVenda: stats?.lastSaleDate ? stats.lastSaleDate : null,
			},
		};
	});

	return {
		data: {
			default: partnersWithStats,
			byId: undefined,
		},
	};
}
export type TGetPartnersOutput = Awaited<ReturnType<typeof getPartners>>;
export type TGetPartnersOutputDefault = Exclude<TGetPartnersOutput["data"]["default"], undefined>;
export type TGetPartnersOutputById = Exclude<TGetPartnersOutput["data"]["byId"], undefined>;

const getPartnersRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	// if (!session.user.permissoes.parceiros.criar) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");
	const searchParams = await request.nextUrl.searchParams;
	const input = GetPartnersInputSchema.parse({
		search: searchParams.get("search") ?? undefined,
		id: searchParams.get("id") ?? undefined,
		statsPeriodAfter: searchParams.get("statsPeriodAfter") ?? undefined,
		statsPeriodBefore: searchParams.get("statsPeriodBefore") ?? undefined,
	});
	const result = await getPartners({ input, session: session.user });
	return NextResponse.json(result);
};
export const GET = appApiHandler({
	GET: getPartnersRoute,
});

const UpdatePartnerInputSchema = z.object({
	partnerId: z.string({ invalid_type_error: "Tipo não válido para ID do parceiro." }),
	partner: PartnerSchema.partial(),
});
export type TUpdatePartnerInput = z.infer<typeof UpdatePartnerInputSchema>;

type UpdatePartnerParams = {
	input: TUpdatePartnerInput;
	session: TAuthUserSession["user"];
};
async function updatePartner({ input, session }: UpdatePartnerParams) {
	const partner = await db.update(partners).set(input.partner).where(eq(partners.id, input.partnerId));
	return {
		data: {
			updatedId: input.partnerId,
		},
		message: "Parceiro atualizado com sucesso.",
	};
}
export type TUpdatePartnerOutput = Awaited<ReturnType<typeof updatePartner>>;

const updatePartnerRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	// if (!session.user.permissoes.parceiros.criar) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");
	const payload = await request.json();
	const input = UpdatePartnerInputSchema.parse(payload);
	const result = await updatePartner({ input, session: session.user });
	return NextResponse.json(result);
};
export const PUT = appApiHandler({
	PUT: updatePartnerRoute,
});
