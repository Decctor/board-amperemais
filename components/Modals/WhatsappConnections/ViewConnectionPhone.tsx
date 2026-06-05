"use client";

import type { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { MetaIcon, RecompraCRMIconColorful, WhatsappIcon } from "@/components/icons";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToPhone } from "@/lib/formatting";
import { disconnectInternalGateway } from "@/lib/mutations/internal-gateway";
import { deleteWhatsappConnection } from "@/lib/mutations/whatsapp-connections";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type TWhatsappConnection = TGetWhatsappConnectionsOutput["data"][number];
type TWhatsappConnectionPhone = TWhatsappConnection["telefones"][number];

export type TViewConnectionPhoneContext = {
	phone: TWhatsappConnectionPhone;
	connection: TWhatsappConnection;
	totalPhonesInConnection: number;
};

type ViewConnectionPhoneProps = {
	context: TViewConnectionPhoneContext;
	closeMenu: () => void;
};

type DetailItem = {
	label: string;
	value: string;
	tone?: "default" | "success" | "warning" | "danger";
};

export default function ViewConnectionPhone({ context, closeMenu }: ViewConnectionPhoneProps) {
	const { phone, connection, totalPhonesInConnection } = context;
	const queryClient = useQueryClient();
	const isMetaConnection = connection.tipoConexao === "META_CLOUD_API";
	const isInternalGateway = connection.tipoConexao === "INTERNAL_GATEWAY";

	const { mutate: handleDisconnect, isPending: isDisconnecting } = useMutation({
		mutationKey: ["disconnect-whatsapp-connection-phone", connection.id, phone.id],
		mutationFn: async () => {
			if (isInternalGateway) return disconnectInternalGateway(connection.id);
			return deleteWhatsappConnection(connection.id);
		},
		onMutate: () => queryClient.cancelQueries({ queryKey: ["whatsapp-connection"] }),
		onSuccess: (data) => {
			toast.success(data.message);
			closeMenu();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] }),
	});

	const meta = getConnectionMeta(connection.tipoConexao);
	const details = getPhoneDetails({ phone, connection });

	return (
		<ResponsiveMenu
			menuTitle="DETALHES DO TELEFONE"
			menuDescription={`Revise os dados deste número antes de desconectar.`}
			menuActionButtonText="DESCONECTAR"
			menuActionButtonClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			menuCancelButtonText="FECHAR"
			actionFunction={() => handleDisconnect()}
			actionIsLoading={isDisconnecting}
			stateIsLoading={false}
			closeMenu={closeMenu}
			dialogVariant="fit"
			drawerVariant="md"
			dialogContentClassName="w-[min(100vw-2rem,34rem)] max-w-[min(100vw-2rem,34rem)]"
			drawerContentClassName="max-h-[90dvh]"
		>
			<div className="flex flex-col gap-4 px-1">
				<div
					className="relative overflow-hidden rounded-2xl p-4 shadow-2xs outline-solid outline-1 outline-black/5 dark:outline-white/10"
					style={{ background: `linear-gradient(135deg, ${meta.brandHex}1F, var(--card) 58%)` }}
				>
					<div className="absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl" style={{ backgroundColor: `${meta.brandHex}33` }} />
					<div className="relative flex items-start gap-3">
						<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.brandHex}18` }}>
							{meta.icon}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">{meta.title}</p>
							<h2 className="mt-1 text-lg font-bold leading-tight tracking-tight text-balance">{phone.nome}</h2>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{formatToPhone(phone.numero)}</p>
						</div>
					</div>
				</div>

				<div className="grid gap-2 sm:grid-cols-2">
					{details.map((detail) => (
						<div key={detail.label} className="rounded-xl bg-muted/40 px-3 py-2.5 shadow-2xs outline-solid outline-1 outline-black/5 dark:outline-white/10">
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">{detail.label}</p>
							<p className={cn("mt-1 text-sm font-semibold tracking-tight", getDetailToneClass(detail.tone))}>{detail.value}</p>
						</div>
					))}
				</div>

				<div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-destructive">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<div className="space-y-1">
						<p className="text-sm font-bold tracking-tight">Desconectar este telefone</p>
						<p className="text-xs leading-relaxed text-destructive/80">
							{isMetaConnection && totalPhonesInConnection > 1
								? "Esta ação remove toda a conexão Meta Cloud API, incluindo todos os números vinculados. Campanhas, templates e envios que dependem dela deixarão de funcionar."
								: "Esta ação remove a conexão deste número. Campanhas, templates ou envios que dependem dele deixarão de funcionar."}
						</p>
					</div>
				</div>
			</div>
		</ResponsiveMenu>
	);
}

function getConnectionMeta(connectionType: TWhatsappConnection["tipoConexao"]) {
	if (connectionType === "META_CLOUD_API") {
		return {
			title: "WhatsApp Cloud API",
			brandHex: "#0869E1",
			icon: (
				<div className="flex shrink-0 items-center -space-x-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0869E1] text-white">
						<MetaIcon className="h-4 w-4" />
					</div>
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">
						<WhatsappIcon className="h-4 w-4" />
					</div>
				</div>
			),
		};
	}

	return {
		title: "WhatsApp Gateway do Recompra CRM",
		brandHex: "#24549C",
		icon: (
			<div className="flex shrink-0 items-center -space-x-2">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#24549C]">
					<RecompraCRMIconColorful className="h-4 w-4" />
				</div>
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">
					<WhatsappIcon className="h-4 w-4" />
				</div>
			</div>
		),
	};
}

function getPhoneDetails({ phone, connection }: { phone: TWhatsappConnectionPhone; connection: TWhatsappConnection }): DetailItem[] {
	const connectedAt: DetailItem = {
		label: "Conectado em",
		value: formatDateAsLocale(new Date(connection.dataInsercao), true) || "Não informado",
	};
	const aiAttendance: DetailItem = {
		label: "Atendimento IA",
		value: phone.permitirAtendimentoIa ? "Permitido" : "Desativado",
		tone: phone.permitirAtendimentoIa ? "success" : "default",
	};

	if (connection.tipoConexao === "META_CLOUD_API") {
		const tokenExpiresAt = connection.dataExpiracao ? new Date(connection.dataExpiracao) : null;
		const isExpired = tokenExpiresAt ? tokenExpiresAt <= new Date() : false;

		return [
			{ label: "Número", value: formatToPhone(phone.numero) },
			{ label: "Phone ID", value: phone.whatsappTelefoneId ?? "Não informado" },
			{ label: "WABA", value: phone.whatsappBusinessAccountId ?? "Não informado" },
			{
				label: "Token",
				value: tokenExpiresAt ? `Expira ${formatDateAsLocale(tokenExpiresAt, true)}` : "Sem expiração",
				tone: isExpired ? "danger" : "default",
			},
			aiAttendance,
			connectedAt,
		];
	}

	const gatewayStatus = formatGatewayStatus(connection.gatewayStatus);
	return [
		{ label: "Número", value: formatToPhone(phone.numero) },
		{ label: "Sessão", value: connection.gatewaySessaoId ?? "Não informada" },
		{ label: "Gateway", value: gatewayStatus.label, tone: gatewayStatus.tone },
		{
			label: "Última conexão",
			value: connection.gatewayUltimaConexao ? formatDateAsLocale(new Date(connection.gatewayUltimaConexao), true) || "Não informado" : "Não informado",
		},
		aiAttendance,
		connectedAt,
	];
}

function formatGatewayStatus(status: string | null | undefined): { label: string; tone: DetailItem["tone"] } {
	switch (status) {
		case "connected":
			return { label: "Conectado", tone: "success" };
		case "qr":
			return { label: "Aguardando QR", tone: "warning" };
		case "connecting":
			return { label: "Conectando", tone: "warning" };
		default:
			return { label: "Desconectado", tone: "danger" };
	}
}

function getDetailToneClass(tone: DetailItem["tone"]) {
	if (tone === "success") return "text-emerald-700 dark:text-emerald-300";
	if (tone === "warning") return "text-amber-700 dark:text-amber-300";
	if (tone === "danger") return "text-destructive";
	return "text-foreground";
}
