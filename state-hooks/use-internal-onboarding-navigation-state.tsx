import { getJourneyDefinition, getStageIndex, type TOnboardingStageId } from "@/lib/onboarding/journeys";
import type { TOnboardingProductEnum } from "@/schemas/enums";
import { useCallback, useState } from "react";

/**
 * Navegação da jornada no cliente: etapa atual e adiamentos. A persistência (PUT progress) é
 * responsabilidade do orquestrador, que chama `onChange` a cada transição. Nunca decide se uma
 * etapa está concluída; isso vem da prontidão.
 */
export function useInternalOnboardingNavigationState({
	produto,
	initialStage,
	initialDeferred,
}: {
	produto: TOnboardingProductEnum;
	initialStage: TOnboardingStageId;
	initialDeferred: string[];
}) {
	const [stage, setStageState] = useState<TOnboardingStageId>(initialStage);
	const [deferred, setDeferred] = useState<Set<string>>(() => new Set(initialDeferred));
	const definition = getJourneyDefinition(produto);
	const stages = definition.etapas;
	const index = getStageIndex(produto, stage);

	const setStage = useCallback((next: TOnboardingStageId) => setStageState(next), []);

	const next = useCallback((): TOnboardingStageId | null => {
		const current = getStageIndex(produto, stage);
		const target = stages[Math.min(current + 1, stages.length - 1)];
		if (!target || target.id === stage) return null;
		setStageState(target.id);
		return target.id;
	}, [produto, stage, stages]);

	const back = useCallback((): TOnboardingStageId | null => {
		const current = getStageIndex(produto, stage);
		const target = stages[Math.max(current - 1, 0)];
		if (!target || target.id === stage) return null;
		setStageState(target.id);
		return target.id;
	}, [produto, stage, stages]);

	const defer = useCallback((): { deferred: TOnboardingStageId; next: TOnboardingStageId | null } => {
		const current = stage;
		setDeferred((prev) => new Set(prev).add(current));
		const currentIndex = getStageIndex(produto, current);
		const target = stages[Math.min(currentIndex + 1, stages.length - 1)];
		const nextId = target && target.id !== current ? target.id : null;
		if (nextId) setStageState(nextId);
		return { deferred: current, next: nextId };
	}, [produto, stage, stages]);

	const resume = useCallback((stageId: TOnboardingStageId) => {
		setDeferred((prev) => {
			const copy = new Set(prev);
			copy.delete(stageId);
			return copy;
		});
	}, []);

	return {
		stage,
		stageIndex: index,
		stages,
		definition,
		deferred,
		isDeferred: (stageId: string) => deferred.has(stageId),
		isFirst: index <= 0,
		isLast: stage === definition.etapaFinal,
		setStage,
		next,
		back,
		defer,
		resume,
	};
}

export type TUseInternalOnboardingNavigationState = ReturnType<typeof useInternalOnboardingNavigationState>;
