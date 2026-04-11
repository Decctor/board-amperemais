"use client";

import ViewAIHint from "@/components/Modals/AiHints/ViewAIHint";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getErrorMessage } from "@/lib/errors";
import { generateHints } from "@/lib/mutations/ai-hints";
import { useAllActiveHints, useCheckAiHintsUsage } from "@/lib/queries/ai-hints";
import { cn } from "@/lib/utils";
import type { TAIHint } from "@/schemas/ai-hints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lightbulb, RefreshCw, Sparkles, WandSparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AIHintCard } from "./AIHintCard";

const DISMISS_KEY = "ai-hints-dismissed-at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const GENERATION_STEPS = [
	"Analisando campanhas...",
	"Buscando oportunidades...",
	"Cruzando sinais de compra...",
	"Escrevendo uma recomendação...",
	"Preparando a dica para revisão...",
];

function getDismissedAt(): number | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(DISMISS_KEY);
	if (!stored) return null;
	const timestamp = Number.parseInt(stored, 10);
	return Number.isNaN(timestamp) ? null : timestamp;
}

function setDismissedAt(timestamp: number) {
	if (typeof window === "undefined") return;
	localStorage.setItem(DISMISS_KEY, timestamp.toString());
}

function clearDismissedAt() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(DISMISS_KEY);
}

function GeneratingHintText({ isGenerating }: { isGenerating: boolean }) {
	const [stepIndex, setStepIndex] = useState(0);

	useEffect(() => {
		if (!isGenerating) {
			setStepIndex(0);
			return;
		}

		const interval = window.setInterval(() => {
			setStepIndex((currentStepIndex) => (currentStepIndex + 1) % GENERATION_STEPS.length);
		}, 2500);

		return () => window.clearInterval(interval);
	}, [isGenerating]);

	if (!isGenerating) return null;

	return (
		<div className="mt-3 flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-2 text-[11px] font-medium text-brand animate-pulse">
			<RefreshCw className="h-3.5 w-3.5 animate-spin" />
			<span>{GENERATION_STEPS[stepIndex]}</span>
		</div>
	);
}

export function AIHintsBubble() {
	const { data: hints, isLoading, isError } = useAllActiveHints();
	const { data: usage, isLoading: usageIsLoading, isError: usageIsError } = useCheckAiHintsUsage();
	const queryClient = useQueryClient();

	const [isOpen, setIsOpen] = useState(false);
	const [isDismissed, setIsDismissed] = useState(true);
	const [openedHintIndex, setOpenedHintIndex] = useState<number | null>(null);
	const [viewingHint, setViewingHint] = useState<TAIHint | null>(null);

	useEffect(() => {
		const dismissedAt = getDismissedAt();
		if (!dismissedAt) {
			setIsDismissed(false);
			return;
		}

		const now = Date.now();
		if (now - dismissedAt >= DISMISS_DURATION_MS) {
			clearDismissedAt();
			setIsDismissed(false);
		} else {
			setIsDismissed(true);
		}
	}, []);

	useEffect(() => {
		if (hints && hints.length > 0 && openedHintIndex === null) {
			setOpenedHintIndex(0);
		}
	}, [hints, openedHintIndex]);

	const { mutate: handleGenerateHints, isPending: generateIsLoading } = useMutation({
		mutationKey: ["generate-ai-hints"],
		mutationFn: generateHints,
		onSuccess: async (data) => {
			if (data.data.generatedHints > 0) {
				toast.success(data.message);
			} else {
				toast.error("A IA não conseguiu gerar uma dica acionável nesta tentativa.");
			}
			await queryClient.invalidateQueries({ queryKey: ["ai-hints"] });
			await queryClient.invalidateQueries({ queryKey: ["ai-hints-usage"] });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const handleDismiss = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setDismissedAt(Date.now());
		setIsDismissed(true);
		setIsOpen(false);
	};

	const handleHintClick = (index: number) => {
		setOpenedHintIndex((prev) => (prev === index ? null : index));
	};

	/** PopoverContent is z-[101]; hint detail Drawer/Dialog is z-[100]. Close popover so the detail is not covered (mobile + desktop). */
	const openHintDetails = (hint: TAIHint) => {
		setIsOpen(false);
		setViewingHint(hint);
	};

	if (isDismissed || isLoading || isError) {
		return null;
	}

	const activeHints = hints ?? [];
	const hintsCount = activeHints.length;
	const showEmptyState = hintsCount === 0;
	const usedHints = usage?.usedHints ?? 0;
	const availableHints = Math.max(usage?.availableHints ?? 0, 0);
	const totalHints = usedHints + availableHints;
	const usagePercentage = totalHints > 0 ? Math.min((usedHints / totalHints) * 100, 100) : 0;
	const canGenerateHints = !usageIsLoading && !usageIsError && availableHints > 0 && !generateIsLoading;

	return (
		<div className="fixed bottom-6 right-24 z-50 font-sans">
			{viewingHint && (
				<ViewAIHint hintId={viewingHint.id} hintType={viewingHint.tipo} closeMenu={() => setViewingHint(null)} />
			)}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						size="icon"
						className={cn(
							"rounded-full h-14 w-14 shadow-2xl transition-all duration-300 relative border-2 border-white/20",
							isOpen ? "bg-card text-foreground hover:bg-card/90" : "bg-brand text-brand-foreground hover:bg-brand/90",
						)}
					>
						{isOpen ? (
							<ChevronDown className="h-6 w-6" />
						) : (
							<>
								<Lightbulb className="h-6 w-6" />
								{hintsCount > 0 && (
									<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm">
										{hintsCount}
									</span>
								)}
							</>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="end"
					side="top"
					className="w-[380px] max-h-[calc(100dvh-120px)] p-0 border-0 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 flex flex-col"
					sideOffset={16}
				>
					<div className="p-5 pb-3 shrink-0 border-b border-border/50">
						<div className="flex items-start justify-between">
							<div>
								<h3 className="text-lg font-bold text-foreground flex items-center gap-2">
									<Sparkles className="w-5 h-5 text-brand" />
									DICAS DA IA
									{hintsCount > 0 && <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{hintsCount}</span>}
								</h3>
								<p className="text-xs text-muted-foreground mt-1">Insights personalizados para seu negócio</p>
							</div>
							<div className="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 rounded-full hover:bg-secondary text-muted-foreground"
									onClick={() => setIsOpen(false)}
								>
									<ChevronDown className="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-secondary text-muted-foreground" onClick={handleDismiss}>
									<X className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-1 px-2 py-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
						{generateIsLoading ? (
							<div className="flex flex-col items-center justify-center py-10 px-5 text-center">
								<div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
									<div className="absolute inset-0 rounded-full border border-brand/20 animate-ping" />
									<WandSparkles className="h-6 w-6" />
								</div>
								<p className="text-sm font-semibold text-foreground">Gerando uma nova dica</p>
								<p className="mt-1 text-xs text-muted-foreground">Isso pode levar alguns instantes enquanto a IA analisa seus dados.</p>
								<GeneratingHintText isGenerating={generateIsLoading} />
							</div>
						) : showEmptyState ? (
							<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
								<Lightbulb className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground mb-4">Nenhuma dica disponível no momento.</p>
							</div>
						) : (
							activeHints.map((hint, index) => (
								<AIHintCard
									key={hint.id}
									hint={hint}
									isOpened={index === openedHintIndex}
									onClick={() => handleHintClick(index)}
									onViewDetails={openHintDetails}
								/>
							))
						)}
					</div>

					<div className="border-t border-border/50 bg-secondary/40 px-4 py-3">
						<AnimatePresence mode="popLayout">
							{!generateIsLoading && (
								<motion.div
									key="ai-hints-footer-actions"
									layout
									initial={{ opacity: 0, y: 14, scale: 0.98 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: 20, scale: 0.96 }}
									transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
								>
									<div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm">
										{!usageIsLoading && !usageIsError && (
											<Button
												size="sm"
												variant="brand"
												disabled={!canGenerateHints}
												onClick={() => handleGenerateHints()}
												className="w-full rounded-full flex items-center gap-1.5"
											>
												<WandSparkles className="mr-1.5 h-3.5 w-3.5" />
												Gerar dica com IA
											</Button>
										)}
										<div className="mt-2 flex items-start justify-between gap-3">
											<div className="min-w-0">
												{usageIsLoading ? (
													<p className="mt-1 h-3 w-40 animate-pulse rounded-full bg-secondary" />
												) : usageIsError ? (
													<p className="mt-1 text-[11px] text-destructive">Não foi possível consultar seu limite.</p>
												) : (
													<p className="mt-1 text-[11px] text-muted-foreground">
														{usedHints}/{totalHints} dicas utilizadas no período. {availableHints} disponíveis.
													</p>
												)}
											</div>
											{!usageIsLoading && !usageIsError && (
												<span
													className={cn(
														"rounded-full px-2 py-0.5 text-[10px] font-bold",
														availableHints > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
													)}
												>
													{availableHints > 0 ? `${availableHints} livres` : "limite atingido"}
												</span>
											)}
										</div>

										{!usageIsLoading && !usageIsError && (
											<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
												<div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${usagePercentage}%` }} />
											</div>
										)}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
						<p className="mt-2 text-center text-[10px] text-muted-foreground">Dicas geradas por IA com base nos dados do seu negócio</p>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
