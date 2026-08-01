import { BadgePercent, CalendarClock, ListChecks, Package, Users } from "lucide-react";
import type { ComponentType } from "react";

export const COUPON_STAGE_IDS = ["benefit", "rules", "audience", "validity", "review"] as const;
export type TCouponStageId = (typeof COUPON_STAGE_IDS)[number];

export type TCouponStageMeta = {
	id: TCouponStageId;
	label: string;
	description: string;
	icon: ComponentType<{ className?: string }>;
};

export const COUPON_STAGES: Record<TCouponStageId, TCouponStageMeta> = {
	benefit: {
		id: "benefit",
		label: "BENEFÍCIO",
		description: "O que o cliente ganha.",
		icon: BadgePercent,
	},
	rules: {
		id: "rules",
		label: "REGRAS",
		description: "Onde vale e como é validado.",
		icon: Package,
	},
	audience: {
		id: "audience",
		label: "QUEM PODE USAR",
		description: "Para quais clientes o cupom serve.",
		icon: Users,
	},
	validity: {
		id: "validity",
		label: "VALIDADE E RESGATE",
		description: "Prazo, limites e onde resgatar.",
		icon: CalendarClock,
	},
	review: {
		id: "review",
		label: "REVISÃO",
		description: "Confira tudo e ative.",
		icon: ListChecks,
	},
};

export const STAGE_ORDER: TCouponStageId[] = [...COUPON_STAGE_IDS];

export function nextStage(current: TCouponStageId): TCouponStageId | null {
	const idx = STAGE_ORDER.indexOf(current);
	if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
	return STAGE_ORDER[idx + 1];
}

export function prevStage(current: TCouponStageId): TCouponStageId | null {
	const idx = STAGE_ORDER.indexOf(current);
	if (idx <= 0) return null;
	return STAGE_ORDER[idx - 1];
}

export function isStageId(value: unknown): value is TCouponStageId {
	return typeof value === "string" && (COUPON_STAGE_IDS as readonly string[]).includes(value);
}
