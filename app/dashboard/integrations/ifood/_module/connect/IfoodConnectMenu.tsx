"use client";

import type { TCreateIfoodAuthorizationOutput } from "@/app/api/integrations/ifood/auth/route";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { useMutation } from "@tanstack/react-query";
import { LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type IfoodConnectMenuProps = {
	/** Reconexão explícita (D9): id da linha de `integrations` a reativar com as credenciais novas. */
	reconnectIntegrationId?: string | null;
	closeMenu: () => void;
};

/**
 * Fluxo de autorização distribuída do iFood: gera o userCode, o usuário autoriza o aplicativo no
 * Portal do Parceiro e cola o código de autorização para concluir. Reusa as rotas
 * `/api/integrations/ifood/auth` e `/api/integrations/ifood/auth/complete`.
 */
export function IfoodConnectMenu({ reconnectIntegrationId, closeMenu }: IfoodConnectMenuProps) {
	const [authorization, setAuthorization] = useState<TCreateIfoodAuthorizationOutput | null>(null);
	const [authorizationCode, setAuthorizationCode] = useState("");

	const createAuthorizationMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/integrations/ifood/auth", { method: "POST" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Não foi possível gerar o código de autorização do iFood.");
			return data as TCreateIfoodAuthorizationOutput;
		},
		onSuccess: (data) => {
			setAuthorization(data);
			toast.success("Código de autorização do iFood gerado com sucesso.");
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const completeAuthorizationMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/integrations/ifood/auth/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ authorizationCode, reconnectIntegrationId: reconnectIntegrationId ?? null }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Não foi possível conectar o iFood.");
			return data;
		},
		onSuccess: () => {
			toast.success("Integração iFood conectada com sucesso.");
			window.location.reload();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ResponsiveMenuV2
			menuTitle="CONECTAR IFOOD"
			menuDescription="Gere o código, autorize o aplicativo no portal do iFood e cole o código de autorização para concluir."
			menuActionButtonText={authorization ? "FINALIZAR CONEXÃO" : "GERAR CÓDIGO"}
			menuCancelButtonText="FECHAR"
			closeMenu={closeMenu}
			actionFunction={() => {
				if (!authorization) return createAuthorizationMutation.mutate();
				return completeAuthorizationMutation.mutate();
			}}
			actionIsLoading={createAuthorizationMutation.isPending || completeAuthorizationMutation.isPending}
			stateIsLoading={false}
		>
			<div className="flex flex-col gap-4">
				{authorization ? (
					<div className="rounded-lg border bg-muted/30 p-4">
						<p className="text-xs font-semibold text-muted-foreground">CÓDIGO IFOOD</p>
						<p className="mt-1 text-2xl font-bold tracking-wide">{authorization.userCode}</p>
						{authorization.verificationUrlComplete || authorization.verificationUrl ? (
							<Button
								type="button"
								size="sm"
								className="mt-3"
								onClick={() => window.open(authorization.verificationUrlComplete ?? authorization.verificationUrl ?? "", "_blank")}
							>
								<LinkIcon className="h-4 w-4" />
								ABRIR PORTAL IFOOD
							</Button>
						) : null}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Clique em gerar código para iniciar a autorização distribuída do iFood.</p>
				)}

				{authorization ? (
					<TextInput
						label="CÓDIGO DE AUTORIZAÇÃO"
						value={authorizationCode}
						placeholder="Cole aqui o código recebido no portal do iFood..."
						handleChange={setAuthorizationCode}
					/>
				) : null}
			</div>
		</ResponsiveMenuV2>
	);
}
