export type SocialProfilePlatform = "instagram" | "linkedin" | "twitter";

const SOCIAL_PROFILE_HOSTS: Record<SocialProfilePlatform, string[]> = {
	instagram: ["instagram.com", "www.instagram.com"],
	linkedin: ["linkedin.com", "www.linkedin.com"],
	twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
};

const SOCIAL_PROFILE_PREFIXES: Record<SocialProfilePlatform, string> = {
	instagram: "https://instagram.com/",
	linkedin: "https://linkedin.com/",
	twitter: "https://x.com/",
};

function parseUrl(value: string) {
	try {
		return new URL(value);
	} catch {
		try {
			return new URL(`https://${value}`);
		} catch {
			return null;
		}
	}
}

function removeLeadingAt(value: string) {
	return value.replace(/^@+/, "");
}

function cleanPath(value: string) {
	const valueWithoutQuery = value.split(/[?#]/)[0] ?? "";

	return valueWithoutQuery.split("/").filter(Boolean).join("/");
}

export function normalizeWebsiteUrl(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) return null;

	const parsed = parseUrl(trimmed);
	if (!parsed) return trimmed;

	parsed.hash = "";
	return parsed.toString().replace(/\/$/, "");
}

export function normalizeSocialProfile(value: string | null | undefined, platform: SocialProfilePlatform) {
	const trimmed = value?.trim();
	if (!trimmed) return null;

	const parsed = parseUrl(trimmed);
	if (parsed && SOCIAL_PROFILE_HOSTS[platform].includes(parsed.hostname.toLowerCase())) {
		const path = cleanPath(parsed.pathname);
		if (!path) return null;

		if (platform === "instagram" || platform === "twitter") return removeLeadingAt(path.split("/")[0] ?? "") || null;
		return path;
	}

	const profile = cleanPath(removeLeadingAt(trimmed));
	if (!profile) return null;

	if (platform === "instagram" || platform === "twitter") return profile.split("/")[0] || null;
	return profile;
}

export function buildSocialProfileUrl(value: string | null | undefined, platform: SocialProfilePlatform) {
	const profile = normalizeSocialProfile(value, platform);
	if (!profile) return null;

	return `${SOCIAL_PROFILE_PREFIXES[platform]}${profile}`;
}
