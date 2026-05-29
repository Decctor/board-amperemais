"use client";

import type { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToPhone } from "@/lib/formatting";
import { disconnectInternalGateway } from "@/lib/mutations/internal-gateway";
import { deleteWhatsappConnection } from "@/lib/mutations/whatsapp-connections";
import { useWhatsappConnections } from "@/lib/queries/whatsapp-connections";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Calendar, Cloud, Key, Loader2, Phone, QrCode, RefreshCw, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import ErrorComponent from "../Layouts/ErrorComponent";
import { MetaIcon, RecompraCRMIconColorful, WhatsappIcon } from "../icons";
import { LoadingButton } from "../loading-button";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { InternalGatewayQRConnect } from "./InternalGatewayQRConnect";

type TWhatsappConnection = TGetWhatsappConnectionsOutput["data"][number];

type SettingsWhatsAppConnectionProps = {
	user: TAuthUserSession["user"];
};

export default function SettingsWhatsAppConnection({ user }: SettingsWhatsAppConnectionProps) {
	const { data: whatsappConnections, isPending, isError } = useWhatsappConnections();

	return (
		<div className="flex h-full grow flex-col gap-3">
			<div className="border-border flex w-full flex-col items-center justify-between border-b pb-2 lg:flex-row">
				<div className="flex flex-col">
					<h1 className="text-lg font-bold">Conexão com o WhatsApp</h1>
					<p className="text-foreground/60 text-sm">Gerencie a conexão do WhatsApp</p>
				</div>
			</div>

			{isPending ? (
				<div className="flex w-full items-center justify-center py-8">
					<Loader2 className="text-foreground/60 h-6 w-6 animate-spin" />
				</div>
			) : isError ? (
				<ErrorComponent msg="Não foi possível carregar suas conexões do WhatsApp." />
			) : (
				<div className="flex w-full flex-col gap-3">
					<IntegrationWithInternalGateway connections={whatsappConnections || []} />
					<IntegrationWithMetaCloud connections={whatsappConnections || []} />
				</div>
			)}
		</div>
	);
}

type ConnectionStatusBadgeProps = {
	isActive: boolean;
	label?: string;
};
function ConnectionStatusBadge({ isActive, label }: ConnectionStatusBadgeProps) {
	return (
		<Badge className={cn("flex items-center gap-1", isActive ? "bg-green-200 text-green-800" : "bg-muted text-muted-foreground")}>
			{label ?? (isActive ? "ATIVA" : "INATIVA")}
		</Badge>
	);
}

type GatewayStatus = "connected" | "connecting" | "qr" | "disconnected";

type GatewayStatusBadgeProps = {
	status: GatewayStatus;
};
function GatewayStatusBadge({ status }: GatewayStatusBadgeProps) {
	switch (status) {
		case "connected":
			return (
				<Badge className="flex items-center gap-1 bg-green-200 text-green-800">
					<Wifi className="h-3 w-3" />
					<span className="text-xs font-bold">CONECTADO</span>
				</Badge>
			);
		case "qr":
			return (
				<Badge className="flex items-center gap-1 bg-yellow-200 text-yellow-800">
					<QrCode className="h-3 w-3" />
					<span className="text-xs font-bold">AGUARDANDO QR</span>
				</Badge>
			);
		case "connecting":
			return (
				<Badge className="flex items-center gap-1 bg-blue-200 text-blue-800">
					<Loader2 className="h-3 w-3 animate-spin" />
					<span className="text-xs font-bold">CONECTANDO</span>
				</Badge>
			);
		default:
			return (
				<Badge className="flex items-center gap-1 bg-red-200 text-red-800">
					<WifiOff className="h-3 w-3" />
					<span className="text-xs font-bold">DESCONECTADO</span>
				</Badge>
			);
	}
}

type ConnectionDetailRowProps = {
	icon: React.ReactNode;
	label: string;
	children: React.ReactNode;
};
function ConnectionDetailRow({ icon, label, children }: ConnectionDetailRowProps) {
	return (
		<div className="flex flex-col items-start gap-x-2 gap-y-1 lg:flex-row lg:items-center">
			<div className="flex items-center gap-2">
				{icon}
				<p className="text-foreground/80 text-xs">{label}</p>
			</div>
			<div className="flex flex-wrap items-center gap-1.5">{children}</div>
		</div>
	);
}

type ConnectionPhonesListProps = {
	telefones: TWhatsappConnection["telefones"];
};
function ConnectionPhonesList({ telefones }: ConnectionPhonesListProps) {
	if (!telefones.length) return <span className="text-foreground/50 text-xs italic">Nenhum telefone vinculado</span>;
	return (
		<>
			{telefones.map((telefone) => (
				<div key={telefone.numero} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
					<span className="text-foreground/80 text-xs">{telefone.nome}:</span>
					<span className="text-foreground/80 text-xs font-bold">{formatToPhone(telefone.numero)}</span>
				</div>
			))}
		</>
	);
}

type IntegrationWithMetaCloudProps = {
	connections: TGetWhatsappConnectionsOutput["data"];
};
function IntegrationWithMetaCloud({ connections }: IntegrationWithMetaCloudProps) {
	const PERMISSION_LABELS_MAP: Record<string, string> = {
		email: "Email",
		public_profile: "Perfil Público",
		whatsapp_business_management: "Gerenciamento de WhatsApp Business",
		whatsapp_business_messaging: "Mensagens de WhatsApp Business",
	};

	const connection = connections.find((c) => c.tipoConexao === "META_CLOUD_API") || null;
	const isConnected = !!connection;

	const queryClient = useQueryClient();
	const { mutate: handleDisconnect, isPending: isDisconnecting } = useMutation({
		mutationKey: ["delete-whatsapp-connection", connection?.id],
		mutationFn: deleteWhatsappConnection,
		onMutate: () => queryClient.cancelQueries({ queryKey: ["whatsapp-connection"] }),
		onSuccess: (data) => toast.success(data.message),
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] }),
	});

	return (
		<div className="border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full items-start gap-3">
				<div className="flex shrink-0 items-center -space-x-3 overflow-visible">
					<div className="ring-background z-10 flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-full bg-[#0869E1] ring-2">
						<MetaIcon className="h-8 w-8 text-white" />
					</div>
					<div className="ring-background flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-full bg-[#25D366] ring-2">
						<WhatsappIcon className="h-8 w-8 text-white" />
					</div>
				</div>
				<div className="flex grow flex-col gap-1.5 pt-1">
					<div className="w-full flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<h1 className="text-xs font-bold tracking-tight lg:text-sm">WhatsApp Cloud API</h1>
							<ConnectionStatusBadge isActive={isConnected} />
						</div>
						{isConnected ? (
							<LoadingButton
								variant="ghost"
								size="xs"
								className="hover:bg-destructive/10 hover:text-destructive w-fit"
								loading={isDisconnecting}
								onClick={() => handleDisconnect(connection.id)}
							>
								DESCONECTAR
							</LoadingButton>
						) : (
							<Link href="/api/integrations/whatsapp/auth">
								<Button size="xs" className="flex items-center gap-1">
									<Cloud className="h-4 w-4" />
									CONECTAR COM META
								</Button>
							</Link>
						)}
					</div>
					<p className="text-foreground/70 text-xs font-medium tracking-tight">Conecte seu WhatsApp Cloud API para enviar e receber mensagens.</p>
				</div>
			</div>

			{isConnected && (
				<div className="w-full flex flex-col gap-3">
					<div className="flex w-full flex-col gap-2">
						{connection.dataExpiracao && (
							<ConnectionDetailRow icon={<Calendar className="h-4 w-4" />} label="EXPIRAÇÃO DO TOKEN:">
								<p className="text-xs font-bold">{formatDateAsLocale(new Date(connection.dataExpiracao), true) || "N/A"}</p>
							</ConnectionDetailRow>
						)}
						{/* {connection.metaEscopo && (
							<ConnectionDetailRow icon={<Key className="h-4 w-4" />} label="Permissões concedidas:">
								{connection.metaEscopo.split(",").map((scope) => (
									<Badge key={scope} className="bg-primary/10 text-foreground/80 rounded-md px-2 py-1 text-xs">
										{PERMISSION_LABELS_MAP[scope] ?? scope}
									</Badge>
								))}
							</ConnectionDetailRow>
						)} */}
						<ConnectionDetailRow icon={<Phone className="h-4 w-4" />} label="TELEFONES CONECTADOS:">
							<ConnectionPhonesList telefones={connection.telefones} />
						</ConnectionDetailRow>
					</div>
				</div>
			)}
		</div>
	);
}

type IntegrationWithInternalGatewayProps = {
	connections: TGetWhatsappConnectionsOutput["data"];
};
function IntegrationWithInternalGateway({ connections }: IntegrationWithInternalGatewayProps) {
	const queryClient = useQueryClient();
	const [showQRConnect, setShowQRConnect] = useState(false);

	const connection = connections.find((c) => c.tipoConexao === "INTERNAL_GATEWAY") || null;
	const gatewayStatus = (connection?.gatewayStatus as GatewayStatus | null) ?? "disconnected";
	const isConnected = !!connection;
	const isActive = isConnected && gatewayStatus === "connected";

	const { mutate: handleDisconnect, isPending: isDisconnecting } = useMutation({
		mutationKey: ["disconnect-internal-gateway", connection?.id],
		mutationFn: (id: string) => disconnectInternalGateway(id),
		onMutate: () => queryClient.cancelQueries({ queryKey: ["whatsapp-connection"] }),
		onSuccess: (data) => toast.success(data.message),
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] }),
	});

	return (
		<>
			{showQRConnect && !isConnected && (
				<InternalGatewayQRConnect
					onBack={() => setShowQRConnect(false)}
					onSuccess={() => {
						setShowQRConnect(false);
						queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
					}}
				/>
			)}
			<div className="border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex w-full items-start gap-3">
					<div className="flex shrink-0 items-center -space-x-3 overflow-visible">
						<div className="ring-background z-10 flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-full bg-[#24549C] ring-2">
							<RecompraCRMIconColorful className="h-8 w-8" />
						</div>
						<div className="ring-background flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-full bg-[#25D366] ring-2">
							<WhatsappIcon className="h-8 w-8 text-white" />
						</div>
					</div>
					<div className="flex grow flex-col gap-1.5 pt-1">
						<div className="w-full flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<h1 className="text-xs font-bold tracking-tight lg:text-sm">WhatsApp Gateway do Recompra CRM</h1>
								<ConnectionStatusBadge isActive={isActive} />
								{isConnected && <GatewayStatusBadge status={gatewayStatus} />}
							</div>
							{isConnected ? (
								<>
									{gatewayStatus !== "connected" && (
										<Button
											variant="outline"
											size="xs"
											className="flex items-center gap-1"
											onClick={() => queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] })}
										>
											<RefreshCw className="h-4 w-4" />
											ATUALIZAR STATUS
										</Button>
									)}
									<LoadingButton
										variant="ghost"
										size="xs"
										className="hover:bg-destructive/10 hover:text-destructive w-fit"
										loading={isDisconnecting}
										onClick={() => handleDisconnect(connection.id)}
									>
										DESCONECTAR
									</LoadingButton>
								</>
							) : (
								<Button size="xs" className="flex items-center gap-1" onClick={() => setShowQRConnect(true)}>
									<QrCode className="h-4 w-4" />
									CONECTAR VIA QR CODE
								</Button>
							)}
						</div>
						<p className="text-foreground/70 text-xs font-medium tracking-tight">
							Conecte seu WhatsApp para uso não-oficial através do gateway do Recompra CRM para enviar e receber mensagens.
						</p>
					</div>
				</div>

				{isConnected && (
					<div className="w-full flex flex-col gap-3">
						<div className="flex w-full flex-col gap-2">
							{connection.gatewayUltimaConexao && (
								<ConnectionDetailRow icon={<Calendar className="h-4 w-4" />} label="ÚLTIMA CONEXÃO:">
									<p className="text-xs font-bold">{formatDateAsLocale(new Date(connection.gatewayUltimaConexao), true) || "N/A"}</p>
								</ConnectionDetailRow>
							)}
							<ConnectionDetailRow icon={<Phone className="h-4 w-4" />} label="TELEFONES CONECTADOS:">
								<ConnectionPhonesList telefones={connection.telefones} />
							</ConnectionDetailRow>
						</div>

						{gatewayStatus !== "connected" && (
							<div className="mt-1 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
								<p className="text-xs text-yellow-800">
									<strong>Atenção:</strong> Sua conexão com o WhatsApp está inativa. Para continuar enviando e recebendo mensagens, reconecte escaneando um
									novo QR Code.
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</>
	);
}
