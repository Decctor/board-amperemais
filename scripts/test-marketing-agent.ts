import "dotenv/config";
import { createCampaignSuggestionHint, createCampaignUpdateSuggestionHint } from "@/lib/ai-hints/service";
import { runMarketingAgent } from "@/lib/ai-agent/marketing";

const ORGANIZATION_ID: string = "27817d9a-cb04-4704-a1f4-15b81a3610d3";

type TParsedArgs = {
	brief: string;
	campaignId?: string;
	debug: boolean;
};

function parseArgs(argv: string[]): TParsedArgs {
	const args = new Map<string, string>();
	for (let index = 0; index < argv.length; index += 1) {
		const part = argv[index];
		if (!part.startsWith("--")) continue;
		const key = part.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith("--")) {
			args.set(key, "true");
			continue;
		}
		args.set(key, next);
		index += 1;
	}

	const brief = args.get("brief");
	if (!brief) {
		throw new Error('Uso: npx tsx scripts/test-marketing-agent.ts --brief "texto" [--campaignId <id>] [--debug]');
	}

	return {
		brief,
		campaignId: args.get("campaignId"),
		debug: args.get("debug") === "true",
	};
}

async function main() {
	if (ORGANIZATION_ID === "SET_YOUR_ORG_ID_HERE") {
		throw new Error("Defina o ORGANIZATION_ID fixo em scripts/test-marketing-agent.ts antes de rodar o teste.");
	}

	const input = parseArgs(process.argv.slice(2));
	const result = await runMarketingAgent({
		organizacaoId: ORGANIZATION_ID,
		brief: input.brief,
		campaignId: input.campaignId,
		persistSuggestion: false,
		debug: input.debug,
	});

	if (result.suggestion?.tipo === "campaign-creation-suggestion") {
		result.hint = await createCampaignSuggestionHint({
			organizacaoId: ORGANIZATION_ID,
			suggestion: result.suggestion.payload,
			resumoExecutivo: result.message,
			criterios: result.insights,
			modeloUtilizado: result.metadata.model,
			tokensUtilizados: result.metadata.tokensUsed,
		});
	}

	if (result.suggestion?.tipo === "campaign-updates-suggestion") {
		result.hint = await createCampaignUpdateSuggestionHint({
			organizacaoId: ORGANIZATION_ID,
			suggestion: result.suggestion.payload,
			resumoExecutivo: result.message,
			criterios: result.insights,
			modeloUtilizado: result.metadata.model,
			tokensUtilizados: result.metadata.tokensUsed,
		});
	}

	console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
	console.error("[TEST_MARKETING_AGENT_ERROR]", error);
	process.exit(1);
});
