"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-picker.tsx (commit 19d8578).
 *
 * Mesmo JSX dos dois painéis do original, sem `useBuilderUi`/`useBuilderCampaign` e sem
 * o AnimatePresence do framer-motion — numa captura estática a transição só atrapalha,
 * e o painel a mostrar chega por prop. `TriggerCard` é importado do original: não tem
 * hook nenhum, forkar só faria a peça divergir do produto.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */
import TriggerCard from "@/app/dashboard/growth/campaigns/_module/builder/components/trigger-card";
import { getCategoryById, type TBuilderCategoryId } from "@/app/dashboard/growth/campaigns/_module/builder/helpers/categories";
import { TRIGGER_META } from "@/app/dashboard/growth/campaigns/_module/builder/helpers/triggers";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { STATIC_BUILDER_CAMPAIGN } from "../../_fixtures/campaign-builder";
import { triggerInlineConfigByType } from "./trigger-inline-config";

const noop = () => {};

type TriggerPickerProps = {
	selectedCategory: TBuilderCategoryId;
	/** "grid" mostra a grade de gatilhos; "inlineConfig" mostra o gatilho escolhido e sua configuração. */
	panel: "grid" | "inlineConfig";
};

export default function TriggerPicker({ selectedCategory, panel }: TriggerPickerProps) {
	const { state } = STATIC_BUILDER_CAMPAIGN;
	const category = getCategoryById(selectedCategory);

	const triggers = category ? category.triggers.map((triggerKey) => TRIGGER_META[triggerKey]) : [];

	if (!category) return null;

	const selectedTriggerMeta = TRIGGER_META[state.campaign.gatilhoTipo] ?? null;
	const InlineConfig = selectedTriggerMeta ? triggerInlineConfigByType[selectedTriggerMeta.value] : null;

	return (
		<div className="relative w-full overflow-hidden">
			{panel === "grid" ? (
				<div className="flex w-full flex-col gap-3">
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
								selected={state.campaign.gatilhoTipo === trigger.value && panel === "grid"}
								onClick={noop}
							/>
						))}
					</div>
				</div>
			) : (
				<div className="flex w-full flex-col gap-4">
					<div className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
						<div className="flex items-center gap-3 min-w-0">
							{selectedTriggerMeta ? (
								<>
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-foreground-foreground">
										<selectedTriggerMeta.icon className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gatilho selecionado</p>
										<h4 className="truncate text-sm font-semibold tracking-tight">{selectedTriggerMeta.label}</h4>
									</div>
								</>
							) : null}
						</div>
						<Button type="button" variant="ghost" size="sm" onClick={noop} className="flex shrink-0 items-center gap-1.5">
							<ArrowLeft className="h-3.5 w-3.5" />
							TROCAR GATILHO
						</Button>
					</div>
					{InlineConfig ? <InlineConfig /> : null}
				</div>
			)}
		</div>
	);
}
