import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import { buildOrganizationSlugBase } from "./slug";

export async function isOrganizationSlugTaken({ slug, excludeOrgId }: { slug: string; excludeOrgId?: string | null }) {
	const existing = await db.query.organizations.findFirst({
		where: excludeOrgId ? and(eq(organizations.slug, slug), ne(organizations.id, excludeOrgId)) : eq(organizations.slug, slug),
		columns: { id: true },
	});
	return Boolean(existing);
}

export async function getUniqueOrganizationSlug({ base, excludeOrgId }: { base: string; excludeOrgId?: string | null }) {
	const baseSlug = buildOrganizationSlugBase(base);
	let candidate = baseSlug;
	let suffix = 1;

	while (true) {
		const taken = await isOrganizationSlugTaken({ slug: candidate, excludeOrgId });
		if (!taken) return candidate;
		suffix += 1;
		const suffixPart = `-${suffix}`;
		candidate = `${baseSlug.slice(0, 48 - suffixPart.length)}${suffixPart}`;
	}
}

/** Resolve o endereço público (/shop/{slug}) para o id da organização. Null quando não existe. */
export async function getOrganizationIdBySlug(slug: string) {
	const normalized = slug.trim().toLowerCase();
	if (!normalized) return null;
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.slug, normalized),
		columns: { id: true },
	});
	return organization?.id ?? null;
}
