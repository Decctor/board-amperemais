import { db } from "@/services/drizzle";
import { platformPartners } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

export function normalizeIndicadorCodigo(codigo: string) {
	return codigo.trim().toUpperCase();
}

export async function getActivePlatformPartnerByCode(codigo: string) {
	const normalizedCode = normalizeIndicadorCodigo(codigo);
	if (!normalizedCode) return null;

	const partner = await db.query.platformPartners.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.codigo, normalizedCode), eq(fields.status, "ATIVO")),
	});

	return partner ?? null;
}

export async function getPlatformPartnerByCode(codigo: string) {
	const normalizedCode = normalizeIndicadorCodigo(codigo);
	if (!normalizedCode) return null;

	const partner = await db.query.platformPartners.findFirst({
		where: eq(platformPartners.codigo, normalizedCode),
	});

	return partner ?? null;
}
