"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TFiscalDocumentEnvironmentEnum } from "@/schemas/enums";
import type { TUseInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
import { FlaskConical, ShieldCheck, type LucideIcon } from "lucide-react";

// Ambiente de emissao da organizacao. Nao e um Switch booleano de proposito: as duas opcoes tem
// consequencias distintas e irreversiveis (numeracao de serie consumida, documento com ou sem
// valor fiscal), entao ambas ficam visiveis e rotuladas em vez de escondidas atras de um estado.
const FISCAL_ENVIRONMENT_OPTIONS = [
	{
		value: "HOMOLOGACAO",
		label: "HOMOLOGAÇÃO",
		description: "Testes sem valor fiscal.",
		icon: FlaskConical,
		selectedClassName: "border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40",
		iconClassName: "text-amber-600 dark:text-amber-500",
		labelClassName: "text-amber-900 dark:text-amber-200",
	},
	{
		value: "PRODUCAO",
		label: "PRODUÇÃO",
		description: "Documentos valem contra a SEFAZ.",
		icon: ShieldCheck,
		selectedClassName: "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40",
		iconClassName: "text-emerald-600 dark:text-emerald-500",
		labelClassName: "text-emerald-900 dark:text-emerald-200",
	},
] as const satisfies ReadonlyArray<{
	value: TFiscalDocumentEnvironmentEnum;
	label: string;
	description: string;
	icon: LucideIcon;
	selectedClassName: string;
	iconClassName: string;
	labelClassName: string;
}>;

type FiscalEnvironmentSwitcherProps = {
	fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
	updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
	disabled: boolean;
};

export function FiscalEnvironmentSwitcher({ fiscalConfig, updateFiscalConfig, disabled }: FiscalEnvironmentSwitcherProps) {
	const ambiente = fiscalConfig.ambiente;

	return (
		<div className="space-y-3 rounded-lg border p-4">
			<div>
				<Label>AMBIENTE DE EMISSÃO</Label>
				<p className="text-sm text-muted-foreground">Define contra qual ambiente da SEFAZ os documentos são enviados.</p>
			</div>
			<div role="radiogroup" aria-label="Ambiente de emissão" className="grid gap-2 sm:grid-cols-2">
				{FISCAL_ENVIRONMENT_OPTIONS.map((option) => {
					const isSelected = ambiente === option.value;
					const Icon = option.icon;
					return (
						<button
							key={option.value}
							type="button"
							role="radio"
							aria-checked={isSelected}
							disabled={disabled}
							onClick={() => updateFiscalConfig({ ambiente: option.value })}
							className={cn(
								"flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								"disabled:cursor-not-allowed disabled:opacity-60",
								isSelected ? option.selectedClassName : "border-transparent bg-muted/40 hover:bg-muted",
							)}
						>
							<Icon className={cn("h-5 min-h-5 w-5 min-w-5", isSelected ? option.iconClassName : "text-muted-foreground")} />
							<div className="min-w-0">
								<p className={cn("text-sm font-bold tracking-tight", isSelected ? option.labelClassName : "text-muted-foreground")}>{option.label}</p>
								<p className="text-xs text-muted-foreground">{option.description}</p>
							</div>
						</button>
					);
				})}
			</div>
			{ambiente === "PRODUCAO" ? (
				<p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
					Documentos emitidos terão valor fiscal e consumirão a numeração da série de produção.
				</p>
			) : (
				<p className="text-xs font-medium text-amber-700 dark:text-amber-500">
					Documentos emitidos não têm valor fiscal e usam a série de homologação. Ideal para validar a configuração antes de virar a chave.
				</p>
			)}
		</div>
	);
}
