import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgentKnowledge } from "@/services/drizzle/schema";
import { and, asc, eq } from "drizzle-orm";

type TDb = DB | DBTransaction;

export type TKnowledgeBlock = { id: string; titulo: string; conteudo: string };

/** Blocos ativos, na ordem definida pela organização. */
export async function getActiveKnowledgeBlocks(db: TDb, agenteId: string): Promise<TKnowledgeBlock[]> {
	return db.query.aiAgentKnowledge.findMany({
		where: and(eq(aiAgentKnowledge.agenteId, agenteId), eq(aiAgentKnowledge.ativo, true)),
		orderBy: [asc(aiAgentKnowledge.ordem), asc(aiAgentKnowledge.dataInsercao)],
		columns: { id: true, titulo: true, conteudo: true },
	});
}

/** Formata os blocos para a última camada do system prompt. */
export function formatKnowledgeContext(blocks: TKnowledgeBlock[]): string {
	if (blocks.length === 0) return "";
	return blocks.map((block) => `### ${block.titulo}\n${block.conteudo.trim()}`).join("\n\n");
}
