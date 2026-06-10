/**
 * Shared onboarding stage vocabulary. Imported by both the server page (resume
 * logic) and the client state hook so the two never drift.
 *
 * The stage is persisted in a cookie (readable server-side for resume after
 * OAuth round-trips) rather than a DB column. Only stage 1 is "inferrable":
 * once the org exists, stage 1 is done and we resume at stage 2 by default.
 */
export const ONBOARDING_STAGE_COOKIE = "onboarding_stage";

export const ONBOARDING_STAGES = [
	"organization-general-info",
	"cashback-config",
	"whatsapp-connection",
	"campaigns-config",
	"data-source",
	"conclusion",
] as const;

export type TOnboardingStage = (typeof ONBOARDING_STAGES)[number];

/** Stage the user resumes at when the org already exists but no valid cookie is present. */
export const DEFAULT_RESUME_STAGE: TOnboardingStage = "cashback-config";

export function isOnboardingStage(value: unknown): value is TOnboardingStage {
	return typeof value === "string" && (ONBOARDING_STAGES as readonly string[]).includes(value);
}

/**
 * Resolve the stage to resume at for an org that exists but hasn't concluded.
 * Stage 1 is inferred done (org exists), so a stored stage 1 falls back to the default.
 */
export function resolveResumeStage(stored: unknown): TOnboardingStage {
	if (isOnboardingStage(stored) && stored !== "organization-general-info") return stored;
	return DEFAULT_RESUME_STAGE;
}
