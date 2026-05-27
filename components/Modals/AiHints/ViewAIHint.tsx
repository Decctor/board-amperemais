"use client";

import CampaignCreationSuggestionBlock from "@/components/AIHints/Blocks/CampaignCreationSuggestionBlock";
import CampaignUpdateSuggestionBlock from "@/components/AIHints/Blocks/CampaignUpdateSuggestionBlock";
import ResponsiveMenuViewOnly from "@/components/Utils/ResponsiveMenuViewOnly";
import { getErrorMessage } from "@/lib/errors";
import { useAIHintById } from "@/lib/queries/ai-hints";
import { TAIHint } from "@/schemas/ai-hints";
import { useQueryClient } from "@tanstack/react-query";

type ViewAIHintProps = {
	hintId: string;
	hintType: TAIHint["tipo"];
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

const HINT_TYPE_TITLES: Record<string, string> = {
	"campaign-creation-suggestion": "SUGESTÃO DE CAMPANHA",
	"campaign-updates-suggestion": "SUGESTÃO DE ATUALIZAÇÃO DE CAMPANHA",
};

const HINT_TYPE_DESCRIPTIONS: Record<string, string> = {
	"campaign-creation-suggestion": "Análise detalhada e configuração sugerida para uma nova campanha de marketing.",
	"campaign-updates-suggestion": "Análise detalhada com as alterações sugeridas para uma campanha existente.",
};

export default function ViewAIHint({ hintId, hintType, closeMenu, callbacks }: ViewAIHintProps) {
	const queryClient = useQueryClient();
	const title = HINT_TYPE_TITLES[hintType];
	const description = HINT_TYPE_DESCRIPTIONS[hintType];

	const { data: hintData, isLoading, error, queryKey } = useAIHintById({ id: hintId });

	const handleOnMutate = async () => {
		await queryClient.cancelQueries({ queryKey });
		if (callbacks?.onMutate) callbacks.onMutate();
		return;
	};

	const handleOnSettled = async () => {
		await queryClient.invalidateQueries({ queryKey });
		if (callbacks?.onSettled) callbacks.onSettled();
	};
	return (
		<ResponsiveMenuViewOnly
			menuTitle={title}
			menuDescription={description}
			menuCancelButtonText="Fechar"
			closeMenu={closeMenu}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			dialogContentClassName="px-4"
			drawerVariant="lg"
		>
			{hintData?.conteudo.tipo === "campaign-creation-suggestion" && (
				<CampaignCreationSuggestionBlock
					hint={hintData}
					callbacks={{
						onMutate: handleOnMutate,
						onSettled: handleOnSettled,
					}}
				/>
			)}
			{/* Diff de alterações (antes → depois) em CampaignUpdateSuggestionBlock; valores idênticos mostram só uma coluna */}
			{hintData?.conteudo.tipo === "campaign-updates-suggestion" && (
				<CampaignUpdateSuggestionBlock
					hint={hintData}
					callbacks={{
						onMutate: handleOnMutate,
						onSettled: handleOnSettled,
					}}
				/>
			)}
		</ResponsiveMenuViewOnly>
	);
}
