import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getDesktopAgentInstallerUrl } from "@/lib/files-storage/desktop-agent";
import { db } from "@/services/drizzle";
import { agentVersions } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Gestão das versões distribuíveis do agente desktop. Superusuário apenas: o
// instalador é artefato da plataforma, não de uma organização — o admin de uma
// loja não decide qual versão as outras lojas baixam.
//
// Nada aqui CRIA versão: quem insere é o CI do repo recompra-local-agent, que
// sobe o binário para o Storage e registra a linha com publicada = false. Esta
// rota só lista e promove.

async function getAgentVersions() {
	const versions = await db.query.agentVersions.findMany({
		columns: {
			id: true,
			versao: true,
			sha256: true,
			tamanhoBytes: true,
			storagePath: true,
			notas: true,
			publicada: true,
			dataPublicacao: true,
			dataInsercao: true,
		},
		with: {
			publicadaPor: { columns: { id: true, nome: true } },
		},
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
	});

	return {
		data: {
			versoes: versions.map((version) => ({
				...version,
				downloadUrl: getDesktopAgentInstallerUrl(version.storagePath),
			})),
		},
		message: "Versões do agente listadas com sucesso.",
	};
}
export type TGetAgentVersionsOutput = Awaited<ReturnType<typeof getAgentVersions>>;

async function getAgentVersionsRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const result = await getAgentVersions();
	return NextResponse.json(result);
}

const PublishAgentVersionInputSchema = z.object({
	id: z.string({
		required_error: "ID da versão não informado.",
		invalid_type_error: "Tipo não válido para o ID da versão.",
	}),
});
export type TPublishAgentVersionInput = z.infer<typeof PublishAgentVersionInputSchema>;

type TPublishAgentVersionParams = {
	input: TPublishAgentVersionInput;
	usuarioId: string;
};
async function publishAgentVersion({ input, usuarioId }: TPublishAgentVersionParams) {
	const version = await db.query.agentVersions.findFirst({
		where: eq(agentVersions.id, input.id),
	});
	if (!version) throw new createHttpError.NotFound("Versão não encontrada.");
	if (version.publicada) throw new createHttpError.Conflict("Esta versão já é a publicada.");

	// Despublicar ANTES de publicar não é estilo: o índice único parcial
	// (publicada = true) rejeitaria a segunda linha verdadeira. A transação é o
	// que impede a janela em que nenhuma versão está publicada ficar visível.
	await db.transaction(async (tx) => {
		await tx.update(agentVersions).set({ publicada: false }).where(eq(agentVersions.publicada, true));
		await tx
			.update(agentVersions)
			.set({ publicada: true, publicadaPorId: usuarioId, dataPublicacao: new Date() })
			.where(eq(agentVersions.id, version.id));
	});

	return { data: { id: version.id, versao: version.versao }, message: `Versão ${version.versao} publicada com sucesso.` };
}
export type TPublishAgentVersionOutput = Awaited<ReturnType<typeof publishAgentVersion>>;

async function publishAgentVersionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const input = PublishAgentVersionInputSchema.parse(await request.json());
	const result = await publishAgentVersion({ input, usuarioId: session.user.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAgentVersionsRoute });
export const PATCH = appApiHandler({ PATCH: publishAgentVersionRoute });
