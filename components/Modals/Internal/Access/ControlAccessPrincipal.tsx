import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { createAccessEnrollmentChallenge } from "@/lib/mutations/access";
import { useAccessPrincipalById } from "@/lib/queries/access";
import { copyToClipboard } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Copy, Info, KeyRound, Link, LoaderCircle, Printer, ShieldCheck, TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
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
	const [connectionCode, setConnectionCode] = useState<{ code: string; expiraEm: Date } | null>(null);

	const refetchPrincipal = useCallback(async () => await queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey]);

	const isRevoked = principal?.status === "REVOGADO" || !!principal?.dataRevogacao;
	const readOnly = !canManage || isRevoked;
	const hasPrinters = principal?.tipo === "AGENTE_DESKTOP";
	const { mutate: issueConnectionCode, isPending: isIssuingConnectionCode } = useMutation({
		mutationKey: ["create-access-enrollment-challenge", "existing-desktop", principalId],
		mutationFn: createAccessEnrollmentChallenge,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			setConnectionCode({ code: data.data.code, expiraEm: data.data.expiraEm });
			callbacks?.onSuccess?.();
			toast.success("Código para conectar o agente gerado com sucesso.");
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

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
						{hasPrinters && !readOnly ? (
							<div className="mb-4 flex w-full flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="flex max-w-[48ch] flex-col gap-1">
										<span className="flex items-center gap-2 text-sm font-bold">
											<Link className="h-4 w-4 text-primary" />
											Conectar este agente novamente
										</span>
										<p className="text-xs text-muted-foreground">
											Gere um código curto para uma instalação do agente receber uma nova credencial deste mesmo dispositivo.
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={isIssuingConnectionCode}
										onClick={() =>
											issueConnectionCode({
												principalId,
												accessClientCodigo: principal.cliente.codigo,
												nomeSugerido: principal.nome,
											})
										}
									>
										{isIssuingConnectionCode ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Link className="h-3.5 w-3.5" />}
										{connectionCode ? "GERAR OUTRO CÓDIGO" : "GERAR CÓDIGO"}
									</Button>
								</div>
								{connectionCode ? (
									<div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-5 text-center">
										<span className="select-all text-3xl font-extrabold tracking-[0.18em] text-primary">{connectionCode.code}</span>
										<Button variant="outline" size="sm" className="gap-2" onClick={() => copyToClipboard(connectionCode.code)}>
											<Copy className="h-3.5 w-3.5" /> COPIAR CÓDIGO
										</Button>
										<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
											<TriangleAlert className="h-3.5 w-3.5" /> Válido até {dayjs(connectionCode.expiraEm).format("HH:mm")} e exibido apenas aqui.
										</p>
									</div>
								) : null}
							</div>
						) : null}
						<DeviceCredentialsBlock principalId={principalId} credenciais={principal.credenciais} readOnly={readOnly} onChanged={refetchPrincipal} />
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
