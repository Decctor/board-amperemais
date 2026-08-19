import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { useAccessPrincipalById } from "@/lib/queries/access";
import { useQueryClient } from "@tanstack/react-query";
import { Info, KeyRound, Printer, ShieldCheck } from "lucide-react";
import { useCallback } from "react";
import DeviceCredentialsBlock from "./Blocks/DeviceCredentialsBlock";
import DeviceIdentityBlock from "./Blocks/DeviceIdentityBlock";
import DevicePermissionsBlock from "./Blocks/DevicePermissionsBlock";
import DevicePrintersBlock from "./Blocks/DevicePrintersBlock";

type ControlAccessPrincipalProps = {
	principalId: string;
	canManage: boolean;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

// Abas em vez de um scroll único: os quatro assuntos do dispositivo não se leem juntos, e só a
// aba aberta fica montada — o custo de render deixa de crescer com o número de impressoras.
export function ControlAccessPrincipal({ principalId, canManage, closeModal, callbacks }: ControlAccessPrincipalProps) {
	const queryClient = useQueryClient();
	const { data: principal, queryKey, isLoading, error } = useAccessPrincipalById({ principalId });

	const refetchPrincipal = useCallback(async () => await queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey]);

	const isRevoked = principal?.status === "REVOGADO" || !!principal?.dataRevogacao;
	const readOnly = !canManage || isRevoked;
	const hasPrinters = principal?.tipo === "AGENTE_DESKTOP";

	return (
		<ResponsiveMenu
			menuTitle="DISPOSITIVO"
			menuDescription="Cada alteração vale na hora, sem precisar salvar no fim."
			dialogVariant="md"
			drawerVariant="lg"
			mode="read-only"
			menuCancelButtonText="FECHAR"
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			{principal ? (
				<Tabs defaultValue="geral" className="w-full gap-4">
					<TabsList variant="page">
						<TabsTrigger value="geral">
							<Info className="h-4 w-4 min-h-4 min-w-4" />
							Geral
						</TabsTrigger>
						<TabsTrigger value="credenciais">
							<KeyRound className="h-4 w-4 min-h-4 min-w-4" />
							Credenciais
						</TabsTrigger>
						<TabsTrigger value="permissoes">
							<ShieldCheck className="h-4 w-4 min-h-4 min-w-4" />
							Permissões
						</TabsTrigger>
						{hasPrinters ? (
							<TabsTrigger value="impressoras">
								<Printer className="h-4 w-4 min-h-4 min-w-4" />
								Impressoras
							</TabsTrigger>
						) : null}
					</TabsList>

					<TabsContent value="geral">
						<DeviceIdentityBlock principal={principal} readOnly={readOnly} onChanged={refetchPrincipal} callbacks={callbacks} />
					</TabsContent>

					<TabsContent value="credenciais">
						<DeviceCredentialsBlock
							principalId={principalId}
							credenciais={principal.credenciais}
							readOnly={readOnly}
							onChanged={refetchPrincipal}
						/>
					</TabsContent>

					<TabsContent value="permissoes">
						<DevicePermissionsBlock
							principalId={principalId}
							grants={principal.grants}
							escoposPermitidos={principal.cliente.escoposPermitidos}
							readOnly={readOnly}
							onChanged={refetchPrincipal}
						/>
					</TabsContent>

					{hasPrinters ? (
						<TabsContent value="impressoras">
							<DevicePrintersBlock principalId={principalId} readOnly={readOnly} />
						</TabsContent>
					) : null}
				</Tabs>
			) : null}
		</ResponsiveMenu>
	);
}

export default ControlAccessPrincipal;
