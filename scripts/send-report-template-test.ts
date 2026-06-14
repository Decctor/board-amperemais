import "dotenv/config";
import { runRecurrentSalesReportForRecipient } from "@/lib/reports/run-recurrent-sales-report";
import type { TReportFrequency } from "@/lib/reports/types";

const VALID_FREQUENCIES: TReportFrequency[] = ["daily", "weekly", "biweekly", "monthly"];

type TParsedArgs = {
	organizationId: string;
	phone: string;
	frequency: TReportFrequency;
	name?: string;
	referenceDate?: Date;
	force: boolean;
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

	const organizationId = args.get("orgId");
	const phone = args.get("phone");
	const frequency = args.get("frequency") as TReportFrequency | undefined;
	if (!organizationId || !phone || !frequency || !VALID_FREQUENCIES.includes(frequency)) {
		throw new Error(
			"Uso: npm run report:test-send -- --orgId <id> --phone <telefone> --frequency daily|weekly|biweekly|monthly [--name Nome] [--referenceDate YYYY-MM-DD] [--force]",
		);
	}

	const referenceDateInput = args.get("referenceDate");
	const referenceDate = referenceDateInput ? new Date(referenceDateInput) : undefined;
	if (referenceDateInput && Number.isNaN(referenceDate?.getTime())) {
		throw new Error("Informe uma data válida em --referenceDate.");
	}

	return {
		organizationId,
		phone,
		frequency,
		name: args.get("name") ?? undefined,
		referenceDate,
		force: args.get("force") === "true",
	};
}

async function main() {
	const input = parseArgs(process.argv.slice(2));
	const result = await runRecurrentSalesReportForRecipient({
		frequency: input.frequency,
		organizationId: input.organizationId,
		recipientPhone: input.phone,
		recipientName: input.name,
		referenceDate: input.referenceDate,
		forceSendEmptyReport: input.force,
	});

	console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
	console.error("[SEND_REPORT_TEMPLATE_TEST_ERROR]", error);
	process.exit(1);
});
