import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { triggerSmbAppContactsSync } from "@/lib/whatsapp/smb-contacts-sync";
import { db } from "@/services/drizzle";
import { whatsappConnectionPhones } from "@/services/drizzle/schema/whatsapp-connections";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SyncWhatsappContactsInputSchema = z.object({
	phoneId: z.string({
		required_error: "ID do telefone não informado.",
		invalid_type_error: "Tipo inválido para ID do telefone.",
	}),
});
export type TSyncWhatsappContactsInput = z.infer<typeof SyncWhatsappContactsInputSchema>;

async function syncWhatsappContacts({ input, organizationId }: { input: TSyncWhatsappContactsInput; organizationId: string }) {
	const phone = await db.query.whatsappConnectionPhones.findFirst({
		where: eq(whatsappConnectionPhones.id, input.phoneId),
		with: {
			conexao: {
				columns: {
					organizacaoId: true,
					tipoConexao: true,
					token: true,
				},
			},
		},
	});

	if (!phone?.conexao || phone.conexao.organizacaoId !== organizationId) {
		throw new createHttpError.NotFound("Telefone do WhatsApp não encontrado.");
	}
	if (phone.conexao.tipoConexao !== "META_CLOUD_API") {
		throw new createHttpError.BadRequest("A sincronização de contatos está disponível apenas para conexões com a API oficial.");
	}
	if (!phone.whatsappTelefoneId || !phone.conexao.token) {
		throw new createHttpError.BadRequest("O telefone não possui as credenciais necessárias para sincronizar contatos.");
	}

	const result = await triggerSmbAppContactsSync({
		phoneNumberId: phone.whatsappTelefoneId,
		accessToken: phone.conexao.token,
	});
	if (!result.requested) {
		throw new createHttpError.BadRequest("Este número não está conectado em modo de coexistência com o WhatsApp Business.");
	}

	return {
		data: result,
		message: "Sincronização de contatos solicitada com sucesso.",
	};
}
export type TSyncWhatsappContactsOutput = Awaited<ReturnType<typeof syncWhatsappContacts>>;

async function syncWhatsappContactsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const input = SyncWhatsappContactsInputSchema.parse({
		phoneId: request.nextUrl.searchParams.get("phoneId"),
	});
	const result = await syncWhatsappContacts({ input, organizationId });
	return NextResponse.json(result, { status: 202 });
}

export const POST = appApiHandler({ POST: syncWhatsappContactsRoute });
