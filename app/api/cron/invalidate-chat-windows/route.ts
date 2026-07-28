import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { db } from "@/services/drizzle";
import { chats } from "@/services/drizzle/schema";
import { and, isNotNull, lt } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Zera as janelas de 24h vencidas.
 *
 * A UI já sabe calcular "expirada" a partir do timestamp — este cron existe para que o
 * UPDATE dispare um evento de realtime e a inbox reflita a mudança sem refetch. Sem ele,
 * uma conversa fica exibindo "janela aberta" até o próximo evento do chat.
 */
async function invalidateChatWindows() {
	const now = new Date();
	const updated = await db
		.update(chats)
		.set({ whatsappJanelaDataExpiracao: null })
		.where(and(isNotNull(chats.whatsappJanelaDataExpiracao), lt(chats.whatsappJanelaDataExpiracao, now)))
		.returning({ id: chats.id });

	console.log(`[INFO] [INVALIDATE_CHAT_WINDOWS] ${updated.length} janela(s) expirada(s) zerada(s).`);

	return { data: { janelasInvalidadas: updated.length }, message: "Janelas de atendimento invalidadas com sucesso." };
}
export type TInvalidateChatWindowsOutput = Awaited<ReturnType<typeof invalidateChatWindows>>;

async function invalidateChatWindowsRoute(req: NextRequest) {
	assertCronAuthorized(req);
	const result = await invalidateChatWindows();
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: invalidateChatWindowsRoute });
