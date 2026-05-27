import { buildSalesReportPayload, type TReportOrganization } from "@/lib/reports/payload";
import reportImageRenderer from "@/lib/reports/render-report-image";
import type { TReportFrequency } from "@/lib/reports/types";
import { db } from "@/services/drizzle";
import fs from "node:fs/promises";
import path from "node:path";

const { renderReportPng, renderReportSvg } = reportImageRenderer;

function getArgValue(flag: string) {
	const index = process.argv.indexOf(flag);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
}

async function main() {
	const orgId = getArgValue("--orgId");
	const frequency = getArgValue("--frequency") as TReportFrequency | null;
	const referenceDateInput = getArgValue("--referenceDate");

	if (!orgId) throw new Error("Informe --orgId <id>.");
	if (!frequency || !["daily", "weekly", "monthly"].includes(frequency)) {
		throw new Error("Informe --frequency daily|weekly|monthly.");
	}

	const referenceDate = referenceDateInput ? new Date(referenceDateInput) : undefined;
	if (referenceDateInput && Number.isNaN(referenceDate?.getTime())) {
		throw new Error("Informe uma data válida em --referenceDate.");
	}

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: {
			id: true,
			nome: true,
			logoUrl: true,
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
		},
	});

	if (!organization) {
		throw new Error(`Organização não encontrada: ${orgId}`);
	}

	const payload = await buildSalesReportPayload({
		frequency,
		organization: organization as TReportOrganization,
		referenceDate,
	});

	const [svg, png] = await Promise.all([renderReportSvg({ payload }), renderReportPng({ payload })]);
	const outputDir = path.join(process.cwd(), ".tmp", "report-previews");
	await fs.mkdir(outputDir, { recursive: true });

	const fileBaseName = `${organization.id}-${frequency}-${payload.period.storageKey}`;
	const svgPath = path.join(outputDir, `${fileBaseName}.svg`);
	const pngPath = path.join(outputDir, `${fileBaseName}.png`);

	await fs.writeFile(svgPath, svg, "utf8");
	await fs.writeFile(pngPath, png);

	console.log("Preview gerado com sucesso:");
	console.log(`SVG: ${svgPath}`);
	console.log(`PNG: ${pngPath}`);
}

void main().catch((error) => {
	console.error("[PREVIEW_REPORT_IMAGE] Failed:", error);
	process.exit(1);
});
