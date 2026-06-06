const DEFAULT_AUTH_REDIRECT = "/dashboard";

const AUTH_REDIRECT_ALLOWLIST = ["/dashboard", "/onboarding", "/partner-dashboard", "/partner-dashboard/onboarding", "/admin-dashboard"];

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
