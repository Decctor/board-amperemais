// Client-safe slug helpers (no DB imports) — the uniqueness checks live in ./slug-server.ts.

// 3 a 48 caracteres, minúsculas/números/hífens, sem hífen nas pontas.
export const ORGANIZATION_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

export const ORGANIZATION_SLUG_INVALID_MESSAGE = "Endereço da loja inválido: use de 3 a 48 caracteres, apenas letras minúsculas, números e hífens.";

// Segmentos que não podem virar endereço de loja para não colidir com rotas/usos futuros da plataforma.
const RESERVED_ORGANIZATION_SLUGS = new Set(["admin", "api", "app", "dashboard", "onboarding", "shop", "www"]);

export function slugifyOrganizationName(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48)
		.replace(/-+$/g, "");
}

export function isValidOrganizationSlug(slug: string) {
	return ORGANIZATION_SLUG_REGEX.test(slug) && !RESERVED_ORGANIZATION_SLUGS.has(slug);
}

/** Base determinística para geração automática: nomes curtos/reservados caem no prefixo "loja". */
export function buildOrganizationSlugBase(value: string) {
	const normalized = slugifyOrganizationName(value);
	if (isValidOrganizationSlug(normalized)) return normalized;
	return slugifyOrganizationName(`loja-${normalized}`) || "loja";
}
