"use client";
import { useCallback, useState } from "react";
import type { TErpChannel } from "@/lib/onboarding/erp-channels";
export function useInternalOnboardingErpState(initialChannel: TErpChannel | null) {
 const [state, setState] = useState({ canal: initialChannel, simulacaoEtapa: 0, produtoId: null as string | null, modal: null as "produto" | "mesa" | "loja" | "atendimento" | null });
 const updateState = useCallback((patch: Partial<typeof state>) => setState((current) => ({ ...current, ...patch })), []);
 return { state, updateState };
}
