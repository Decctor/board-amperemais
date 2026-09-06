import { captureServerEvent } from "@/lib/analytics/posthog-server";
export async function captureOnboardingEvent(organizationId: string, event: string, properties: Record<string, unknown> = {}) {
 try { await captureServerEvent({ distinctId: organizationId, event, properties: { organization_id: organizationId, ...properties } }); }
 catch { console.error("[ONBOARDING_ANALYTICS] Falha ao registrar evento", event); }
}
