import { sanitizeAuthRedirectTo } from "@/lib/authentication/redirect";
import type { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/**
 * Threads a post-OAuth return target through the provider round-trip. The "connect" button in
 * the onboarding flow passes `?redirectTo=/onboarding`; we stash it in a short-lived httpOnly
 * cookie (sibling of the provider's state cookie) and read it back in the callback so the user
 * lands back on the onboarding stage instead of the default settings page.
 */
export function persistOAuthRedirect(cookieStore: CookieStore, cookieName: string, redirectTo: string | null | undefined) {
	if (!redirectTo || !redirectTo.startsWith("/")) return;
	cookieStore.set(cookieName, redirectTo, {
		httpOnly: true,
		path: "/",
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 60 * 15,
	});
}

/** Reads, clears and sanitizes the redirect cookie. Returns `fallback` when absent. */
export function consumeOAuthRedirect(cookieStore: CookieStore, cookieName: string, fallback: string): string {
	const stored = cookieStore.get(cookieName)?.value ?? null;
	cookieStore.delete(cookieName);
	if (!stored) return fallback;
	return sanitizeAuthRedirectTo(stored);
}
