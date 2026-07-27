import { resolvePoiActorContext } from "@/lib/access/poi-actor";
import { appApiHandler } from "@/lib/app-api";
import { db } from "@/services/drizzle";
import { cashbackPrograms, organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// Espelha o que o POI web carrega server-side em app/(external)/point-of-interaction/[orgId]/page.tsx:
// identidade visual da organização + programa de cashback (com prêmios ativos). É o bootstrap do
// aplicativo após a ativação.
async function getPoiConfiguration({ organizacaoId }: { organizacaoId: string }) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: {
			id: true,
			nome: true,
			cnpj: true,
			logoUrl: true,
			telefone: true,
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
			poiConfirmacaoValorObrigatoria: true,
		},
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: eq(cashbackPrograms.organizacaoId, organizacaoId),
		with: {
			recompensas: {
				where: (fields, { eq: whereEq }) => whereEq(fields.ativo, true),
			},
		},
	});
	if (!cashbackProgram) throw new createHttpError.NotFound("Programa de cashback não configurado para esta organização.");

	return {
		data: {
			organization,
			cashbackProgram,
		},
		message: "Configuração carregada com sucesso.",
	};
}
export type TGetPoiConfigurationOutput = Awaited<ReturnType<typeof getPoiConfiguration>>;

// Exclusivo para dispositivos autenticados: o POI web recebe a mesma configuração server-side,
// portanto não há modo legado nesta rota.
async function getPoiConfigurationRoute(request: NextRequest) {
	const resolution = await resolvePoiActorContext({ request, requiredScope: "poi:configuration:read" });
	const result = await getPoiConfiguration({ organizacaoId: resolution.organizationId });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getPoiConfigurationRoute });
