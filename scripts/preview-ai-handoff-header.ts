import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderHandoffHeaderPng } from "@/lib/ai/agent/handoff-notification/render";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
	const orgIdArgument = process.argv.find((argument) => argument.startsWith("--orgId="));
	const orgId = orgIdArgument?.slice("--orgId=".length);
	const organization = orgId
		? await db.query.organizations.findFirst({ where: eq(organizations.id, orgId), columns: { nome: true, logoUrl: true } })
		: null;
	const outputPath = path.join(process.cwd(), "exports", "brand", "ai-handoff-template-header.png");
	const png = await renderHandoffHeaderPng({
		organizationName: organization?.nome ?? "Famoso Pão",
		organizationLogoUrl: organization?.logoUrl,
		clientName: "Lucas Fernandes",
		clientPhone: "+55 34 99662-6855",
		reason: "A política de pagamento não está documentada e precisa ser confirmada pela equipe.",
	});

	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(outputPath, png);
	console.log(outputPath);
}

void main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await connection.end();
	});
