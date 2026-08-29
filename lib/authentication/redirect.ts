const DEFAULT_AUTH_REDIRECT = "/dashboard";

// `/oauth/authorize` permite voltar ao consentimento OAuth (conector MCP) depois do login —
// a query string sobrevive porque o retorno preserva `url.search`.
const AUTH_REDIRECT_ALLOWLIST = [
	"/dashboard",
	"/onboarding",
	"/partner-dashboard",
	"/partner-dashboard/onboarding",
	"/admin-dashboard",
	"/oauth/authorize",
];

export function sanitizeAuthRedirectTo(value: FormDataEntryValue | string | null | undefined) {
	if (typeof value !== "string") return DEFAULT_AUTH_REDIRECT;
	if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_AUTH_REDIRECT;

	try {
		const url = new URL(value, process.env.NEXT_PUBLIC_URL);
		const path = `${url.pathname}${url.search}${url.hash}`;
		const allowed = AUTH_REDIRECT_ALLOWLIST.some((allowedPath) => url.pathname === allowedPath || url.pathname.startsWith(`${allowedPath}/`));
		return allowed ? path : DEFAULT_AUTH_REDIRECT;
	} catch {
		return DEFAULT_AUTH_REDIRECT;
	}
}
