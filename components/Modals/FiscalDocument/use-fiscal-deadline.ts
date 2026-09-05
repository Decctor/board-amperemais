"use client";

import { formatRemainingTime } from "@/components/Fiscal/fiscal-problem-presentation";
import { useEffect, useMemo, useState } from "react";

// Abaixo disso o cancelamento vira destaque (botao cheio, ciencia obrigatoria no modal).
export const FISCAL_DEADLINE_URGENT_MS = 5 * 60_000;

/**
 * Relogio compartilhado pelos contadores de prazo. So marca quando ha prazo a acompanhar.
 */
export function useNow(intervalMs: number | null) {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		if (!intervalMs) return;
		setNow(new Date());
		const id = window.setInterval(() => setNow(new Date()), intervalMs);
		return () => window.clearInterval(id);
	}, [intervalMs]);
	return now;
}

export type TFiscalDeadlineState = {
	prazoLimite: Date | null;
	remainingMs: number | null;
	// "12 min restantes" — null quando nao ha prazo ou ja passou.
	label: string | null;
	expired: boolean;
	urgent: boolean;
};

/**
 * Contador vivo de uma janela legal (cancelamento, inutilizacao). Aceita a data como string
 * porque `acoes` chega serializada por JSON.
 */
export function useFiscalDeadline(prazoLimite: Date | string | null | undefined, intervalMs = 30_000): TFiscalDeadlineState {
	const deadline = useMemo(() => (prazoLimite ? new Date(prazoLimite) : null), [prazoLimite]);
	const now = useNow(deadline ? intervalMs : null);
	return useMemo(() => {
		if (!deadline || Number.isNaN(deadline.getTime())) {
			return { prazoLimite: null, remainingMs: null, label: null, expired: false, urgent: false };
		}
		const remainingMs = deadline.getTime() - now.getTime();
		return {
			prazoLimite: deadline,
			remainingMs,
			label: formatRemainingTime(deadline, now),
			expired: remainingMs <= 0,
			urgent: remainingMs > 0 && remainingMs < FISCAL_DEADLINE_URGENT_MS,
		};
	}, [deadline, now]);
}
