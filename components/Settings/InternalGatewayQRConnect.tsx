"use client";

import type { TGetInternalGatewayStatusOutput } from "@/app/api/whatsapp-connections/internal-gateway/[connectionId]/status/route";
import type { TInitializeInternalGatewayInput, TInitializeInternalGatewayOutput } from "@/app/api/whatsapp-connections/internal-gateway/route";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { initializeInternalGatewayConnection } from "@/lib/mutations/internal-gateway";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, CheckCircle2, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

	// Initialize connection mutation
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

	// Poll connection status
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
			return 3000; // Poll every 3 seconds
		},
	});

	// Handle status changes
	useEffect(() => {
		if (statusQuery.data?.data) {
			const { status, qrCode: newQrCode } = statusQuery.data.data;

			// Update QR code if it changed
			if (newQrCode && newQrCode !== qrCode) {
				setQrCode(newQrCode);
			}

			// Handle connected status
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

	// Form step
	if (step === "form") {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<CardTitle className="text-base">Conectar via QR Code</CardTitle>
							<CardDescription className="text-xs">Preencha as informações do telefone</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="w-full flex flex-col gap-1.5">
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
						<LoadingButton
							className="w-full"
							loading={isInitializingInternalGatewayConnection}
							disabled={isInitializingInternalGatewayConnection || !phoneName.trim() || !phoneNumber.trim()}
							onClick={() => initializeInternalGatewayConnectionMutation({ phoneName, phoneNumber })}
						>
							GERAR QR CODE
						</LoadingButton>
					</div>
				</CardContent>
			</Card>
		);
	}

	// QR code step
	if (step === "qr") {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<CardTitle className="text-base">Escaneie o QR Code</CardTitle>
							<CardDescription className="text-xs">Abra o WhatsApp no seu celular e escaneie</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col items-center gap-4">
					{qrCode ? (
						<div className="relative">
							<div className="rounded-lg border bg-white p-4">
								<img src={qrCode} alt="QR Code para conectar WhatsApp" className="h-64 w-64" />
							</div>
							{statusQuery.isFetching && (
								<div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
								</div>
							)}
						</div>
					) : (
						<div className="flex h-64 w-64 items-center justify-center rounded-lg border bg-muted">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					)}

					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Smartphone className="h-4 w-4" />
						<span>Aguardando escaneamento...</span>
					</div>

					<div className="text-center text-xs text-muted-foreground">
						<p>1. Abra o WhatsApp no seu celular</p>
						<p>2. Toque em Menu ou Configurações</p>
						<p>3. Toque em &quot;Aparelhos conectados&quot;</p>
						<p>4. Toque em &quot;Conectar um aparelho&quot;</p>
						<p>5. Aponte seu celular para esta tela</p>
					</div>

					<Button variant="outline" size="sm" onClick={() => statusQuery.refetch()} disabled={statusQuery.isFetching}>
						<RefreshCw className={`h-4 w-4 mr-2 ${statusQuery.isFetching ? "animate-spin" : ""}`} />
						Atualizar QR Code
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Success step
	return (
		<Card>
			<CardContent className="flex flex-col items-center gap-4 py-8">
				<div className="rounded-full bg-green-100 p-3">
					<CheckCircle2 className="h-8 w-8 text-green-600" />
				</div>
				<div className="text-center">
					<h3 className="font-semibold">Conexão estabelecida!</h3>
					<p className="text-sm text-muted-foreground">Seu WhatsApp foi conectado com sucesso.</p>
				</div>
				<Button onClick={handleSuccessClose}>Concluir</Button>
			</CardContent>
		</Card>
	);
}
