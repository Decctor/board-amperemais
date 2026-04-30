"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { getCategoryById } from "../_helpers/categories";
import { TRIGGER_META } from "../_helpers/triggers";
import { useBuilderCampaign, useBuilderUi } from "./builder-provider";
import TriggerCard from "./trigger-card";
import { triggerInlineConfigByType } from "./trigger-inline-config";

const SLIDE_DURATION = 0.28;

export default function TriggerPicker() {
	const { selectedCategory, transientPanel, pickTrigger, resetTrigger } = useBuilderUi();
	const { state } = useBuilderCampaign();
	const category = useMemo(() => getCategoryById(selectedCategory), [selectedCategory]);

	const triggers = useMemo(() => {
		if (!category) return [];
		return category.triggers.map((triggerKey) => TRIGGER_META[triggerKey]);
	}, [category]);

	if (!category) return null;

	const selectedTriggerMeta = TRIGGER_META[state.campaign.gatilhoTipo] ?? null;
	const InlineConfig = selectedTriggerMeta ? triggerInlineConfigByType[selectedTriggerMeta.value] : null;

	return (
		<div className="relative w-full overflow-hidden">
			<AnimatePresence mode="wait" initial={false}>
				{transientPanel === "grid" ? (
					<motion.div
						key="grid"
						initial={{ x: -32, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: -32, opacity: 0 }}
						transition={{ duration: SLIDE_DURATION, ease: "easeOut" }}
						className="flex w-full flex-col gap-3"
					>
						<div className="flex flex-col">
							<h3 className="text-sm font-semibold tracking-tight">{category.label.toUpperCase()} — escolha o gatilho</h3>
							<p className="text-xs text-muted-foreground">{category.description}</p>
						</div>
						<div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
							{triggers.map((trigger) => (
								<TriggerCard
									key={trigger.value}
									icon={trigger.icon}
									label={trigger.label}
									description={trigger.description}
									selected={state.campaign.gatilhoTipo === trigger.value && transientPanel === "grid"}
									onClick={() => pickTrigger(trigger.value)}
								/>
							))}
						</div>
					</motion.div>
				) : (
					<motion.div
						key="config"
						initial={{ x: 32, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: 32, opacity: 0 }}
						transition={{ duration: SLIDE_DURATION, ease: "easeOut" }}
						className="flex w-full flex-col gap-4"
					>
						<div className="flex w-full items-center justify-between gap-2 rounded-lg border border-primary/10 bg-card px-3 py-2.5">
							<div className="flex items-center gap-3 min-w-0">
								{selectedTriggerMeta ? (
									<>
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
											<selectedTriggerMeta.icon className="h-4 w-4" />
										</div>
										<div className="min-w-0">
											<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gatilho selecionado</p>
											<h4 className="truncate text-sm font-semibold tracking-tight">{selectedTriggerMeta.label}</h4>
										</div>
									</>
								) : null}
							</div>
							<Button type="button" variant="ghost" size="sm" onClick={resetTrigger} className="flex shrink-0 items-center gap-1.5">
								<ArrowLeft className="h-3.5 w-3.5" />
								TROCAR GATILHO
							</Button>
						</div>
						{InlineConfig ? <InlineConfig /> : null}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
