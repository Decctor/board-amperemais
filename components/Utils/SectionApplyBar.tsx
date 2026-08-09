"use client";

import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type SectionApplyBarProps = {
	isDirty: boolean;
	isPending: boolean;
	disabled?: boolean;
	/** Motivo do bloqueio, mostrado no lugar do aviso padrão quando `disabled`. */
	disabledReason?: string | null;
	/** Texto do aviso quando há alterações pendentes. */
	message?: string;
	/** Rótulo do botão de aplicar. */
	applyButtonText?: string;
	onApply: () => void;
	onDiscard: () => void;
};

/**
 * Barra de alterações não salvas de uma seção editável. Some quando não há o que aplicar.
 *
 * Flutua acima do conteúdo em vez de encostar nele: o rascunho pertence à seção inteira, não à
 * última linha editada, e uma barra grudada no fluxo se lê como rodapé daquele bloco. A superfície
 * segue o mesmo idioma dos docks do app (`AdminDock`/`CommunityDock`): recuada das bordas, elevada,
 * com desfoque atrás.
 *
 * `sticky` e não `fixed` de propósito — a mesma página pode ter duas seções editáveis (variantes e
 * adicionais no cadastro de produto) e duas barras fixas se empilhariam uma sobre a outra.
 */
export default function SectionApplyBar({
	isDirty,
	isPending,
	disabled = false,
	disabledReason,
	message = "Alterações não salvas nesta seção",
	applyButtonText = "APLICAR ALTERAÇÕES",
	onApply,
	onDiscard,
}: SectionApplyBarProps) {
	const shouldReduceMotion = useReducedMotion();
	const bloqueado = disabled && !!disabledReason;

	// A barra surge fora do ponto onde o usuário está olhando, então precisa de transição. Com
	// movimento reduzido, só o fade.
	const oculto = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 };
	const visivel = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

	return (
		<AnimatePresence>
			{isDirty ? (
				<motion.div
					// O container ocupa a largura toda para centralizar a barra, mas não intercepta
					// cliques no conteúdo que passa por baixo dela.
					className="pointer-events-none sticky bottom-4 z-30 mt-4 flex w-full justify-center"
					initial={oculto}
					animate={visivel}
					exit={oculto}
					transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
				>
					{/* Em telas estreitas o aviso e os botões não cabem lado a lado — o texto colapsa em uma
					    palavra por linha. Abaixo de sm a barra empilha: aviso em cima, botões em linha
					    ocupando a largura toda. */}
					<div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-background/90 px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1 ring-border/70 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-3">
						<p className={bloqueado ? "min-w-0 text-xs font-medium text-destructive sm:flex-1" : "min-w-0 text-xs text-muted-foreground sm:flex-1"}>
							{bloqueado ? disabledReason : message}
						</p>
						<div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
							<Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={isPending}>
								DESCARTAR
							</Button>
							<LoadingButton type="button" className="grow sm:grow-0" loading={isPending} disabled={disabled} onClick={onApply}>
								{applyButtonText}
							</LoadingButton>
						</div>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
