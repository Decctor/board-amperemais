"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/loading-button";
import { getErrorMessage } from "@/lib/errors";
import type {
	TInitializeInternalGatewayInput,
	TInitializeInternalGatewayOutput,
} from "@/app/api/whatsapp-connections/internal-gateway/route";
import type { TGetInternalGatewayStatusOutput } from "@/app/api/whatsapp-connections/internal-gateway/[connectionId]/status/route";

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
	const initializeMutation = useMutation({
		mutationFn: async (input: TInitializeInternalGatewayInput) => {
			const { data } = await axios.post<TInitializeInternalGatewayOutput>(
				"/api/whatsapp-connections/internal-gateway",
				input,
			);
			return data;
		},
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
			const { data } = await axios.get<TGetInternalGatewayStatusOutput>(
				`/api/whatsapp-connections/internal-gateway/${connectionId}/status`,
			);
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

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!phoneName.trim() || !phoneNumber.trim()) {
				toast.error("Preencha todos os campos");
				return;
			}
			initializeMutation.mutate({ phoneName, phoneNumber });
		},
		[phoneName, phoneNumber, initializeMutation],
	);

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
							<CardDescription className="text-xs">
								Preencha as informações do telefone
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="phoneName">Nome do telefone</Label>
							<Input
								id="phoneName"
								placeholder="Ex: WhatsApp Principal"
								value={phoneName}
								onChange={(e) => setPhoneName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="phoneNumber">Número do telefone</Label>
							<Input
								id="phoneNumber"
								placeholder="Ex: (11) 99999-9999"
								value={phoneNumber}
								onChange={(e) => setPhoneNumber(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								Digite o número que será conectado
							</p>
						</div>
						<LoadingButton
							type="submit"
							className="w-full"
							loading={initializeMutation.isPending}
						>
							Gerar QR Code
						</LoadingButton>
					</form>
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
							<CardDescription className="text-xs">
								Abra o WhatsApp no seu celular e escaneie
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col items-center gap-4">
					{qrCode ? (
						<div className="relative">
							<div className="rounded-lg border bg-white p-4">
								<img
									src={qrCode}
									alt="QR Code para conectar WhatsApp"
									className="h-64 w-64"
								/>
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

					<Button
						variant="outline"
						size="sm"
						onClick={() => statusQuery.refetch()}
						disabled={statusQuery.isFetching}
					>
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
					<p className="text-sm text-muted-foreground">
						Seu WhatsApp foi conectado com sucesso.
					</p>
				</div>
				<Button onClick={handleSuccessClose}>Concluir</Button>
			</CardContent>
		</Card>
	);
}
