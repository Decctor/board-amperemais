"use client";

import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
/**
 * SANDBOX ONLY — Modal de conexão iFood via app centralizado de teste.
 * Remover este arquivo e voltar a usar IfoodIntegrationMenu em SettingsIntegration.tsx.
 */

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
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) closeMenu();
			}}
		>
			<ResponsiveMenu.Content drawerClassName="max-h-[70dvh]">
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>CONFIGURAR IFOOD (SANDBOX)</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>
						Conecta com o app centralizado de teste do iFood. Não é necessário autorizar no Portal do Parceiro.
					</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody stateKey="content" className="overflow-x-hidden overflow-y-auto">
					<p className="text-sm text-muted-foreground">
						Requer <code className="text-xs">IFOOD_SANDBOX_ENABLED=true</code> e as credenciais do aplicativo centralizado de teste no servidor.
					</p>
				</ResponsiveMenuAnimatedBody>
				<ResponsiveMenu.Footer>
					<ResponsiveMenu.Close variant="outline">FECHAR</ResponsiveMenu.Close>
					<LoadingButton loading={connectMutation.isPending} onClick={() => connectMutation.mutate()}>
						CONECTAR LOJA TESTE
					</LoadingButton>
				</ResponsiveMenu.Footer>
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
	);
}
