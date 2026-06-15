/**
 * SANDBOX ONLY — Modal de conexão iFood via app centralizado de teste.
 * Remover este arquivo e voltar a usar IfoodIntegrationMenu em SettingsIntegration.tsx.
 */
"use client";

import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { getErrorMessage } from "@/lib/errors";
import type { TConnectIfoodSandboxOutput } from "@/app/api/integrations/ifood/sandbox/route";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type IfoodSandboxIntegrationMenuProps = {
	closeMenu: () => void;
};

export function IfoodSandboxIntegrationMenu({ closeMenu }: IfoodSandboxIntegrationMenuProps) {
	const connectMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/integrations/ifood/sandbox", {
				method: "POST",
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Não foi possível conectar o iFood sandbox.");
			return data as TConnectIfoodSandboxOutput;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			window.location.reload();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ResponsiveMenuV2
			menuTitle="CONFIGURAR IFOOD (SANDBOX)"
			menuDescription="Conecta com o app centralizado de teste do iFood. Não é necessário autorizar no Portal do Parceiro."
			menuActionButtonText="CONECTAR LOJA TESTE"
			menuCancelButtonText="FECHAR"
			closeMenu={closeMenu}
			actionFunction={() => connectMutation.mutate()}
			actionIsLoading={connectMutation.isPending}
			stateIsLoading={false}
		>
			<p className="text-sm text-muted-foreground">
				Requer <code className="text-xs">IFOOD_SANDBOX_ENABLED=true</code> e as credenciais do aplicativo centralizado de teste no servidor.
			</p>
		</ResponsiveMenuV2>
	);
}
