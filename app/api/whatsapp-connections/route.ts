import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { removeMessageTemplatePhoneMetadata } from "@/lib/db-utils";
import { db } from "@/services/drizzle";
import { whatsappConnectionPhones, whatsappConnections } from "@/services/drizzle/schema/whatsapp-connections";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

async function getWhatsappConnection({ session }: { session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para conectar o WhatsApp.");

	const whatsappConnectionsResults = await db.query.whatsappConnections.findMany({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: {
			telefones: true,
		},
	});
	return {
		data: whatsappConnectionsResults ?? null,
		message: "Conexão do WhatsApp encontrada com sucesso.",
	};
}

export type TGetWhatsappConnectionsOutput = Awaited<ReturnType<typeof getWhatsappConnection>>;

async function getWhatsappConnectionRoute(_req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const result = await getWhatsappConnection({ session });
	return NextResponse.json(result, { status: 200 });
}

async function deleteWhatsappConnection({ input, session }: { input: string; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;

	if (!userOrgId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para deletar a conexão do WhatsApp.");
	const deletedWhatsappConnectionId = await db.transaction(async (tx) => {
		const connection = await tx
			.select({ id: whatsappConnections.id })
			.from(whatsappConnections)
			.where(and(eq(whatsappConnections.id, input), eq(whatsappConnections.organizacaoId, userOrgId)))
			.limit(1);
		if (!connection[0]) throw new createHttpError.NotFound("Conexão do WhatsApp não encontrada.");

		const phones = await tx
			.select({ id: whatsappConnectionPhones.id })
			.from(whatsappConnectionPhones)
			.where(eq(whatsappConnectionPhones.conexaoId, connection[0].id));

		const deletedWhatsappConnection = await tx
			.delete(whatsappConnections)
			.where(and(eq(whatsappConnections.id, connection[0].id), eq(whatsappConnections.organizacaoId, userOrgId)))
			.returning({ id: whatsappConnections.id });
		const deletedId = deletedWhatsappConnection[0]?.id;
		if (!deletedId) throw new createHttpError.NotFound("Conexão do WhatsApp não encontrada.");

		await removeMessageTemplatePhoneMetadata({
			trx: tx,
			organizationId: userOrgId,
			phoneIds: phones.map((phone) => phone.id),
		});
		return deletedId;
	});
	return {
		data: {
			deletedId: deletedWhatsappConnectionId,
		},
		message: "Conexão do WhatsApp deletada com sucesso.",
	};
}
export type TDeleteWhatsappConnectionOutput = Awaited<ReturnType<typeof deleteWhatsappConnection>>;
async function deleteWhatsappConnectionRoute(req: NextRequest) {
	console.log("REQ:", req);
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	console.log("PARAMS:", req.nextUrl.searchParams);
	const input = z
		.string({
			required_error: "ID da conexão do WhatsApp não informado.",
			invalid_type_error: "Tipo inválido para ID da conexão do WhatsApp.",
		})
		.parse(req.nextUrl.searchParams.get("id"));
	if (!input) throw new createHttpError.BadRequest("ID da conexão do WhatsApp não informado.");
	const result = await deleteWhatsappConnection({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({
	GET: getWhatsappConnectionRoute,
});

export const DELETE = appApiHandler({
	DELETE: deleteWhatsappConnectionRoute,
});
