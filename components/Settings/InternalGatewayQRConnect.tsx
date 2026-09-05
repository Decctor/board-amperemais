"use client";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

import type { TGetInternalGatewayStatusOutput } from "@/app/api/whatsapp-connections/internal-gateway/[connectionId]/status/route";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { initializeInternalGatewayConnection } from "@/lib/mutations/internal-gateway";
import type { ConnectionStatus } from "@/lib/whatsapp/internal-gateway";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import TextInput from "../Inputs/TextInput";

type Step = "form" | "qr" | "success";

type InternalGatewayQRConnectProps = {
	onBack: () => void;
	onSuccess: () => void;
};

export function InternalGatewayQRConnect({ onBack, onSuccess }: InternalGatewayQRConnectProps) {
	const queryClient = useQueryClient();
	const [step, setStep] = useState<Step>("form");
	const [phoneName, setPhoneName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [connectionId, setConnectionId] = useState<string | null>(null);
	const [qrCode, setQrCode] = useState<string | null>(null);

	const { mutate: initializeInternalGatewayConnectionMutation, isPending: isInitializingInternalGatewayConnection } = useMutation({
		mutationFn: initializeInternalGatewayConnection,
		onSuccess: (data) => {
			setConnectionId(data.data.connectionId);
			setQrCode(data.data.qrCode || null);
			setStep("qr");
			toast.success(data.message);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const statusQuery = useQuery({
		queryKey: ["internal-gateway-status", connectionId],
		queryFn: async () => {
			if (!connectionId) throw new Error("No connection ID");
			const { data } = await axios.get<TGetInternalGatewayStatusOutput>(`/api/whatsapp-connections/internal-gateway/${connectionId}/status`);
			return data;
		},
		enabled: !!connectionId && step === "qr",
		refetchInterval: (query) => {
			const data = query.state.data;
			if (data?.data?.status === "connected") {
				return false;
			}
			return 3000;
		},
	});

	const liveStatus = statusQuery.data?.data?.status as ConnectionStatus | undefined;

	useEffect(() => {
		if (statusQuery.data?.data) {
			const { status, qrCode: newQrCode } = statusQuery.data.data;

			if (newQrCode && newQrCode !== qrCode) {
				setQrCode(newQrCode);
			}

			if (status === "connected") {
				setStep("success");
				queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
				toast.success("WhatsApp conectado com sucesso!");
			}
		}
	}, [statusQuery.data, qrCode, queryClient]);

	const handleSuccessClose = useCallback(() => {
		onSuccess();
	}, [onSuccess]);

	const submitForm = useCallback(() => {
		const name = phoneName.trim();
		const number = phoneNumber.trim();
		if (!name || !number) {
			toast.error("Preencha o nome e o número do telefone.");
			return;
		}
		initializeInternalGatewayConnectionMutation({ phoneName: name, phoneNumber: number });
	}, [phoneName, phoneNumber, initializeInternalGatewayConnectionMutation]);

	const { menuTitle, menuDescription } = useMemo(() => {
		if (step === "form") {
			return {
				menuTitle: "CONECTAR VIA QR CODE",
				menuDescription: "Preencha as informações do telefone para gerar o código.",
			};
		}
		if (step === "success") {
			return {
				menuTitle: "WHATSAPP CONECTADO",
				menuDescription: "A conexão foi estabelecida com sucesso.",
			};
		}
		if (liveStatus === "disconnected") {
			return {
				menuTitle: "TENTANDO CONEXÃO",
				menuDescription: "Aguarde enquanto estabelecemos a sessão após o escaneamento.",
			};
		}
		if (liveStatus === "connecting") {
			return {
				menuTitle: "CONECTANDO",
				menuDescription: "Finalizando a vinculação com o WhatsApp.",
			};
		}
		return {
			menuTitle: "ESCANEIE O QR CODE",
			menuDescription: "Abra o WhatsApp no seu celular e escaneie o código.",
		};
	}, [step, liveStatus]);

	const showQrPhase = liveStatus === "qr" || (liveStatus === undefined && !!qrCode);
	const showPairingFeedback = liveStatus === "disconnected" || liveStatus === "connecting";

	const actionIsLoading = step === "form" ? isInitializingInternalGatewayConnection : step === "qr" ? statusQuery.isFetching : false;

	const menuSuccessContent =
		step === "success" ? (
			<div className="flex flex-col items-center gap-4 py-4 text-center">
				<div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
					<CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
				</div>
				<div className="space-y-1">
					<h3 className="text-lg font-semibold">Conexão estabelecida!</h3>
					<p className="text-muted-foreground text-sm">Seu WhatsApp foi conectado com sucesso.</p>
				</div>
				<Button className="mt-2" onClick={handleSuccessClose}>
					Concluir
				</Button>
			</div>
		) : undefined;

	return (
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) onBack();
			}}
		>
			<ResponsiveMenu.Content
				dialogVariant="fit"
				drawerVariant="md"
				dialogClassName="w-[min(100vw-2rem,28rem)] max-w-[min(100vw-2rem,28rem)]"
				drawerClassName="max-h-[90dvh]"
			>
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>{menuTitle}</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>{menuDescription}</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody
					stateKey={menuSuccessContent ? "success" : "content"}
					className={menuSuccessContent ? "items-center justify-center p-6" : "overflow-x-hidden overflow-y-auto"}
				>
					{menuSuccessContent ? (
						menuSuccessContent
					) : (
						<>
							{step === "form" && (
								<div className="flex w-full min-w-0 flex-col gap-3 px-1">
									<TextInput
										label="Nome do telefone"
										placeholder="Preencha o nome a ser dado à conexão..."
										value={phoneName}
										handleChange={(value) => setPhoneName(value)}
										disabled={isInitializingInternalGatewayConnection}
									/>
									<TextInput
										label="Número do telefone"
										placeholder="Preencha o número do telefone a ser conectado..."
										value={phoneNumber}
										handleChange={(value) => setPhoneNumber(value)}
										disabled={isInitializingInternalGatewayConnection}
									/>
								</div>
							)}

							{step === "qr" && (
								<div className="flex w-full min-w-0 flex-col items-center gap-4 px-1 py-2">
									{showPairingFeedback ? (
										<div className="flex min-h-64 w-full flex-col items-center justify-center gap-4 px-4 text-center">
											<Loader2 className="text-foreground h-10 w-10 animate-spin" />
											<p className="text-foreground text-sm font-bold tracking-wide uppercase">
												{liveStatus === "connecting" ? "CONECTANDO" : "TENTANDO CONEXÃO"}
											</p>
											<p className="text-muted-foreground max-w-sm text-xs">
												{liveStatus === "connecting"
													? "Sincronizando com o WhatsApp. Isso costuma levar poucos segundos."
													: "Reestabelecendo a sessão após o escaneamento do QR Code."}
											</p>
										</div>
									) : showQrPhase ? (
										<>
											<div className="relative">
												{qrCode ? (
													<div className="rounded-lg border bg-white p-4">
														<img src={qrCode} alt="QR Code para conectar WhatsApp" className="h-56 w-56 sm:h-64 sm:w-64" />
													</div>
												) : (
													<div className="flex h-56 w-56 items-center justify-center rounded-lg border bg-muted sm:h-64 sm:w-64">
														<Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
													</div>
												)}
												{statusQuery.isFetching && qrCode && (
													<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/50">
														<Loader2 className="text-foreground h-8 w-8 animate-spin" />
													</div>
												)}
											</div>
											<div className="text-muted-foreground flex items-center gap-2 text-sm">
												<Smartphone className="h-4 w-4 shrink-0" />
												<span>Aguardando escaneamento...</span>
											</div>
											<div className="text-muted-foreground text-center text-xs leading-relaxed">
												<p>1. Abra o WhatsApp no seu celular</p>
												<p>2. Toque em Menu ou Configurações</p>
												<p>3. Toque em &quot;Aparelhos conectados&quot;</p>
												<p>4. Toque em &quot;Conectar um aparelho&quot;</p>
												<p>5. Aponte seu celular para esta tela</p>
											</div>
										</>
									) : (
										<div className="flex min-h-64 w-full items-center justify-center">
											<Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
										</div>
									)}
								</div>
							)}
						</>
					)}
				</ResponsiveMenuAnimatedBody>
				{!menuSuccessContent ? (
					<ResponsiveMenu.Footer visibleOn={liveStatus ? "mobile" : "all"}>
						<ResponsiveMenu.Close variant="outline">Fechar</ResponsiveMenu.Close>
						<LoadingButton loading={actionIsLoading} onClick={step === "form" ? submitForm : () => void statusQuery.refetch()}>
							{step === "form" ? "GERAR QR CODE" : "Atualizar QR Code"}
						</LoadingButton>
					</ResponsiveMenu.Footer>
				) : null}
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
	);
}
