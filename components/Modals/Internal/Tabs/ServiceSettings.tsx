import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateServiceSettings } from "@/lib/mutations/tabs";
import { useServiceSettings } from "@/lib/queries/tabs";
import { cn } from "@/lib/utils";
import { SERVICE_SETTINGS_PRESETS, type TServiceSettingsConfiguration, type TServiceSettingsPreset } from "@/schemas/service-settings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, NotebookTabs, Store, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

// A UI oferece presets; persistimos as POLITICAS resultantes (modos nao sao entidades).
const PRESET_OPTIONS: { preset: TServiceSettingsPreset; title: string; description: string; icon: ReactNode }[] = [
	{ preset: "BALCAO", title: "Balcão", description: "Sem mesas nem comandas — venda avulsa pelo fluxo normal.", icon: <Store className="w-4 h-4" /> },
	{
		preset: "SOMENTE_MESAS",
		title: "Somente mesas",
		description: "Operador escolhe a mesa; a conta é aberta/reusada automaticamente.",
		icon: <LayoutGrid className="w-4 h-4" />,
	},
	{
		preset: "SOMENTE_COMANDAS",
		title: "Somente comandas",
		description: "Operador informa o código da comanda física; sem mesas.",
		icon: <NotebookTabs className="w-4 h-4" />,
	},
	{
		preset: "MESAS_E_COMANDAS",
		title: "Mesas + comandas",
		description: "Várias comandas por mesa, cada uma com código próprio.",
		icon: <UtensilsCrossed className="w-4 h-4" />,
	},
];

function inferPreset(configuration: TServiceSettingsConfiguration | undefined): TServiceSettingsPreset | null {
	if (!configuration) return null;
	for (const option of PRESET_OPTIONS) {
		if (JSON.stringify(SERVICE_SETTINGS_PRESETS[option.preset]) === JSON.stringify(configuration)) return option.preset;
	}
	return null;
}

type ServiceSettingsProps = {
	closeModal: () => void;
};

export function ServiceSettings({ closeModal }: ServiceSettingsProps) {
	const queryClient = useQueryClient();
	const { data: configuration, isLoading, isError, error, queryKey } = useServiceSettings();
	const [selectedPreset, setSelectedPreset] = useState<TServiceSettingsPreset | null>(null);

	const activePreset = selectedPreset ?? inferPreset(configuration);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-service-settings"],
		mutationFn: updateServiceSettings,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey });
			closeModal();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	return (
		<ResponsiveMenu
			menuTitle="MODO DE ATENDIMENTO"
			menuDescription="Escolha como sua operação trabalha com mesas e comandas."
			menuActionButtonText="SALVAR"
			menuActionButtonDisabled={!selectedPreset}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				if (!selectedPreset) return;
				mutate({ configuracoes: SERVICE_SETTINGS_PRESETS[selectedPreset] });
			}}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<div className="flex flex-col gap-2 p-1">
				{PRESET_OPTIONS.map((option) => (
					<button
						key={option.preset}
						type="button"
						onClick={() => setSelectedPreset(option.preset)}
						className={cn(
							"flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
							activePreset === option.preset ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
						)}
					>
						<div className="mt-0.5">{option.icon}</div>
						<div className="flex flex-col">
							<span className="text-sm font-bold tracking-tight">{option.title}</span>
							<span className="text-xs text-muted-foreground">{option.description}</span>
						</div>
					</button>
				))}
			</div>
		</ResponsiveMenu>
	);
}
