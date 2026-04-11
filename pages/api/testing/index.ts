import { runMarketingAgent } from "@/lib/ai-agent/marketing";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const organizationId = "4a4e8578-63f0-4119-9695-a2cc068de8d6";
	const agentResult = await runMarketingAgent({
		brief: "Eu quero criar uma nova campanha de marketing (ou otimizar uma existente) para recuperação de clientes.",
		organizacaoId: organizationId,
		debug: false,
		persistSuggestion: false,
		requireActionableSuggestion: false,
	});

	return res.status(200).json(agentResult);
}
