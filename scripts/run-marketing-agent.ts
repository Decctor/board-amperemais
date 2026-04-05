import "dotenv/config";
import { runMarketingAgent } from "@/lib/ai-agent/marketing";

type TParsedArgs = {
	organizacaoId: string;
	brief: string;
	campaignId?: string;
	persistSuggestion: boolean;
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

	const organizacaoId = args.get("orgId");
	const brief = args.get("brief");
	if (!organizacaoId || !brief) {
		throw new Error("Uso: npx tsx scripts/run-marketing-agent.ts --orgId <id> --brief \"texto\" [--campaignId <id>] [--persistSuggestion] [--debug]");
	}

	return {
		organizacaoId,
		brief,
		campaignId: args.get("campaignId"),
		persistSuggestion: args.get("persistSuggestion") === "true",
		debug: args.get("debug") === "true",
	};
}

async function main() {
	const input = parseArgs(process.argv.slice(2));
	const result = await runMarketingAgent({
		organizacaoId: input.organizacaoId,
		brief: input.brief,
		campaignId: input.campaignId,
		persistSuggestion: input.persistSuggestion,
		debug: input.debug,
	});

	console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
	console.error("[RUN_MARKETING_AGENT_ERROR]", error);
	process.exit(1);
});
