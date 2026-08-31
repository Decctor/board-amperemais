import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type TIfoodHomologationAuditEntry = {
	timestamp: string;
	type: string;
	[key: string]: unknown;
};

/** Append-only local evidence enabled by the homologation polling script. */
export async function appendIfoodHomologationAudit(entry: Omit<TIfoodHomologationAuditEntry, "timestamp">) {
	// This audit is local homologation evidence. Production runtimes must never attempt filesystem writes.
	if (process.env.NODE_ENV === "production") return;

	const auditFile = process.env.IFOOD_HOMOLOGATION_AUDIT_FILE;
	if (!auditFile) return;

	try {
		await mkdir(path.dirname(auditFile), { recursive: true });
		await appendFile(auditFile, `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`, "utf8");
	} catch (error) {
		// Evidence collection must never interrupt polling or prevent an ACK.
		console.error("[IFOOD_HOMOLOGATION_AUDIT] Falha ao gravar evidencia local.", {
			auditFile,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
