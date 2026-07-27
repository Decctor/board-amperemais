import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getDesktopAgentInstallerUrl } from "@/lib/files-storage/desktop-agent";
import { db } from "@/services/drizzle";
import { agentVersions } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// A versão publicada do agente, para o botão de download da aba DISPOSITIVOS.
//
// Separada de ../route.ts porque o portão é outro: aquela é do superusuário
// (quem PROMOVE uma versão), esta é de qualquer membro da organização (quem
// INSTALA o agente na loja). Misturar as duas numa rota só faria a checagem de
// permissão depender do modo, que é como se esquece uma.

async function getCurrentAgentVersion() {
	const version = await db.query.agentVersions.findFirst({
		where: eq(agentVersions.publicada, true),
		columns: {
			id: true,
			versao: true,
			sha256: true,
			tamanhoBytes: true,
			storagePath: true,
			notas: true,
			dataPublicacao: true,
		},
	});

	// Nenhuma versão publicada é estado legítimo (antes do primeiro release), e
	// não erro: a aba some o botão em vez de mostrar falha.
	if (!version) return { data: { versao: null }, message: "Nenhuma versão do agente publicada." };

	return {
		data: {
			versao: {
				...version,
				downloadUrl: getDesktopAgentInstallerUrl(version.storagePath),
			},
		},
		message: "Versão publicada do agente obtida com sucesso.",
	};
}
export type TGetCurrentAgentVersionOutput = Awaited<ReturnType<typeof getCurrentAgentVersion>>;

async function getCurrentAgentVersionRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const result = await getCurrentAgentVersion();
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getCurrentAgentVersionRoute });
