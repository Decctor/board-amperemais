import type { TAIHintSubject } from "@/schemas/ai-hints";

export async function generateHintsForSubject({
	assunto,
}: {
	organizacaoId: string;
	assunto: TAIHintSubject;
	contextoAdicional?: string;
}) {
	return {
		hints: [],
		tokensUsados: 0,
		limiteAtingido: assunto === "campaigns",
	};
}
