import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { whatsappConnections } from "@/services/drizzle/schema/whatsapp-connections";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

async function getWhatsappConnection({ session }: { session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para conectar o WhatsApp.");

	const whatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: {
			telefones: true,
		},
	});
	return {
		data: whatsappConnection ?? null,
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

async function deleteWhatsappConnection({ input, session }: { input: string; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;

	if (!userOrgId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para deletar a conexão do WhatsApp.");
	const deletedWhatsappConnection = await db
		.delete(whatsappConnections)
		.where(and(eq(whatsappConnections.id, input), eq(whatsappConnections.organizacaoId, userOrgId)))
		.returning({
			id: whatsappConnections.id,
		});
	const deletedWhatsappConnectionId = deletedWhatsappConnection[0]?.id;
	if (!deletedWhatsappConnectionId) throw new createHttpError.NotFound("Conexão do WhatsApp não encontrada.");
	return {
		data: {
			deletedId: deletedWhatsappConnectionId,
		},
		message: "Conexão do WhatsApp deletada com sucesso.",
	};
}
export type TDeleteWhatsappConnectionOutput = Awaited<ReturnType<typeof deleteWhatsappConnection>>;
async function deleteWhatsappConnectionRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const input = z
		.string({
			required_error: "ID da conexão do WhatsApp não informado.",
			invalid_type_error: "Tipo inválido para ID da conexão do WhatsApp.",
		})
		.parse(req.nextUrl.searchParams.get("id"));
	if (!input) throw new createHttpError.BadRequest("ID da conexão do WhatsApp não informado.");
	const result = await deleteWhatsappConnection({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({
	GET: getWhatsappConnectionRoute,
	DELETE: deleteWhatsappConnectionRoute,
});
