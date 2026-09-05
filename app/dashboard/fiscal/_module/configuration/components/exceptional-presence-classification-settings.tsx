"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TUseInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

type ExceptionalPresenceClassificationSettingsProps = {
	fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
	updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
	disabled: boolean;
};

export function ExceptionalPresenceClassificationSettings({
	fiscalConfig,
	updateFiscalConfig,
	disabled,
}: ExceptionalPresenceClassificationSettingsProps) {
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [acknowledged, setAcknowledged] = useState(false);
	const enabled = fiscalConfig.emissaoManual.classificacaoPresencialExcepcional.habilitada;

	const setEnabled = (habilitada: boolean) => {
		updateFiscalConfig({
			emissaoManual: {
				classificacaoPresencialExcepcional: { habilitada },
			},
		});
	};

	const closeConfirmation = () => {
		setConfirmationOpen(false);
		setAcknowledged(false);
	};

	return (
		<>
			<div className="flex items-start justify-between gap-4 rounded-lg border border-amber-300/70 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
						<Label>CLASSIFICAÇÃO PRESENCIAL EXCEPCIONAL</Label>
					</div>
					<p className="max-w-3xl text-sm text-muted-foreground">
						Permite que um usuário autorizado declare manualmente uma venda com entrega como operação presencial. Use somente em situações excepcionais, com
						orientação contábil e justificativa registrada.
					</p>
					<p className="text-xs font-medium text-amber-800 dark:text-amber-300">
						A autorização da SEFAZ não confirma que essa classificação representa corretamente a operação.
					</p>
				</div>
				<Switch
					checked={enabled}
					disabled={disabled}
					onCheckedChange={(checked) => {
						if (!checked) {
							setEnabled(false);
							return;
						}
						setConfirmationOpen(true);
					}}
				/>
			</div>

			{confirmationOpen ? (
				<ResponsiveMenu
					menuTitle="HABILITAR CLASSIFICAÇÃO EXCEPCIONAL"
					menuDescription="Esta opção altera uma informação fiscal material e deve permanecer restrita a casos orientados pela contabilidade."
					menuActionButtonText="HABILITAR RECURSO"
					menuActionButtonVariant="destructive"
					menuActionButtonDisabled={!acknowledged}
					menuCancelButtonText="VOLTAR"
					actionFunction={() => {
						setEnabled(true);
						closeConfirmation();
					}}
					actionIsLoading={false}
					stateIsLoading={false}
					closeMenu={closeConfirmation}
				>
					<div className="space-y-4">
						<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
							<p className="font-semibold text-destructive">Evite este recurso sempre que for possível identificar o destinatário.</p>
							<p className="mt-1 text-muted-foreground">
								Cada uso exigirá confirmação e justificativa. A venda continuará registrada como entrega, e a declaração, o usuário e a data ficarão no
								histórico do documento fiscal.
							</p>
						</div>
						<div className="flex items-start gap-3 rounded-lg border p-3">
							<Checkbox id="acknowledge-exceptional-presence" checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} />
							<Label htmlFor="acknowledge-exceptional-presence" className="cursor-pointer text-sm font-normal leading-5">
								Entendo que essa opção não corrige a natureza da operação e que seu uso deve seguir orientação contábil específica.
							</Label>
						</div>
					</div>
				</ResponsiveMenu>
			) : null}
		</>
	);
}
