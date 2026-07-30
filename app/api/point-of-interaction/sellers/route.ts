import { resolvePoiActorContext } from "@/lib/access/poi-actor";
import { appApiHandler } from "@/lib/app-api";
import { db } from "@/services/drizzle";
import { sellers } from "@/services/drizzle/schema";
import { and, asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetPoiSellersInputSchema = z.object({
	// Opcional para dispositivos autenticados (a organização deriva do principal); obrigatório no modo legado.
	orgId: z.string({ invalid_type_error: "Tipo não válido para o ID da organização." }).optional().nullable(),
});
export type TGetPoiSellersInput = z.infer<typeof GetPoiSellersInputSchema>;

// Lista mínima de vendedores para o select "QUEM TE ATENDEU" do autocadastro
// (docs/dev-planning/client-authorship-plan.md §5). A rota é alcançável em modo legado
// anônimo, então o payload expõe apenas o necessário para o select — nunca telefone,
// email ou senha de operador.
async function getPoiSellers({ input }: { input: { orgId: string } }) {
	const activeSellers = await db
		.select({ id: sellers.id, nome: sellers.nome, avatarUrl: sellers.avatarUrl })
		.from(sellers)
		.where(and(eq(sellers.organizacaoId, input.orgId), eq(sellers.ativo, true)))
		.orderBy(asc(sellers.nome));

	return {
		data: { sellers: activeSellers },
		message: "Vendedores encontrados com sucesso.",
	};
}
export type TGetPoiSellersOutput = Awaited<ReturnType<typeof getPoiSellers>>;

async function getPoiSellersRoute(request: NextRequest) {
	const input = GetPoiSellersInputSchema.parse({
		orgId: request.nextUrl.searchParams.get("orgId") ?? undefined,
	});
	const resolution = await resolvePoiActorContext({ request, requiredScope: "poi:sellers:read", payloadOrgId: input.orgId });
	const result = await getPoiSellers({ input: { orgId: resolution.organizationId } });
	// Lista muda raramente; o cache curto absorve o tráfego de kiosks sem esconder alterações por muito tempo.
	return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}

export const GET = appApiHandler({ GET: getPoiSellersRoute });
