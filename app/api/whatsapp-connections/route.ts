import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function getWhatsappConnection({ session }: { session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para conectar o WhatsApp.");

	const whatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: {
			telefones: true,
		},
	});
	if (!whatsappConnection) throw new createHttpError.NotFound("Conexão do WhatsApp não encontrada.");
	return {
		data: whatsappConnection,
		message: "Conexão do WhatsApp encontrada com sucesso.",
	};
}

export type TGetWhatsappConnectionOutput = Awaited<ReturnType<typeof getWhatsappConnection>>;

async function getWhatsappConnectionRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const result = await getWhatsappConnection({ session: session.user });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({
	GET: getWhatsappConnectionRoute,
});
