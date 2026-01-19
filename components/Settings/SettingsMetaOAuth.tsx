import type { TGetWhatsappConnectionOutput } from "@/app/api/whatsapp-connections/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { deleteWhatsappConnection } from "@/lib/mutations/whatsapp-connections";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Calendar, Code, Key, Phone } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ErrorComponent from "../Layouts/ErrorComponent";
import { LoadingButton } from "../loading-button";
import { Badge } from "../ui/badge";

type SettingsMetaOAuthProps = {
	user: TAuthUserSession["user"];
};

export default function SettingsMetaOAuth({ user }: SettingsMetaOAuthProps) {
	const queryClient = useQueryClient();
	const { data: whatsappConnection, queryKey, isPending, isError, isSuccess } = useWhatsappConnection();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });

	console.log("ISERROR", isError);
	return (
		<div className="flex h-full grow flex-col">
			<div className="border-primary/20 flex w-full flex-col items-center justify-between border-b pb-2 lg:flex-row">
				<div className="flex flex-col">
					<h1 className="text-lg font-bold">Conexão WhatsApp</h1>
					<p className="text-sm text-primary/60">Gerencie a conexão do WhatsApp Business</p>
				</div>
			</div>
			{isPending ? <h3 className="text-sm text-primary/60 animate-pulse py-4">Carregando conexão...</h3> : null}
			{isError ? <ErrorComponent msg="Erro ao carregar conexão do WhatsApp Business." /> : null}
			{isSuccess ? (
				whatsappConnection ? (
					<WhatsAppConnectionBlockConnected whatsappConnection={whatsappConnection} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
				) : (
					<WhatsAppConnectionBlockUnconnected />
				)
			) : null}
		</div>
	);
}

function WhatsAppConnectionBlockUnconnected() {
	return (
		<div className="flex w-full flex-col gap-2 py-2">
			<p className="text-sm text-primary/60">Oops, parece que você não está conectado ao WhatsApp Business.</p>
			<Link href="/api/integrations/whatsapp/auth">Conectar com WhatsApp</Link>
		</div>
	);
}

type WhatsAppConnectionBlockConnectedProps = {
	whatsappConnection: Exclude<TGetWhatsappConnectionOutput["data"], null>;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};
function WhatsAppConnectionBlockConnected({ whatsappConnection, callbacks }: WhatsAppConnectionBlockConnectedProps) {
	const PERMISSION_LABELS_MAP = {
		email: "Email",
		public_profile: "Perfil Público",
		whatsapp_business_management: "Gerenciamento de WhatsApp Business",
		whatsapp_business_messaging: "Mensagens de WhatsApp Business",
	};

	const { mutate: handleDeleteWhatsappConnectionMutation, isPending } = useMutation({
		mutationKey: ["delete-whatsapp-connection", whatsappConnection.id],
		mutationFn: deleteWhatsappConnection,
		onMutate: () => {
			if (callbacks.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: (data) => {
			if (callbacks.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: (error) => {
			if (callbacks.onError) callbacks.onError(error);
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			if (callbacks.onSettled) callbacks.onSettled();
			return;
		},
	});

	return (
		<div className="flex w-full flex-col gap-2 py-2">
			<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
				<Badge className="flex items-center gap-1 bg-green-200 text-green-800">
					<BadgeCheck className="w-4 h-4 min-w-4 min-h-4" />
					<h1 className="text-sm font-bold">Você está conectado ao WhatsApp Business</h1>
				</Badge>
				<LoadingButton
					variant={"ghost"}
					size={"sm"}
					className="w-fit hover:bg-destructive/10 hover:text-destructive"
					loading={isPending}
					onClick={() => handleDeleteWhatsappConnectionMutation(whatsappConnection.id)}
				>
					DESCONECTAR
				</LoadingButton>
			</div>

			<div className="w-full flex flex-col gap-1.5">
				<p className="text-sm text-primary/80">Detalhes da sua Conexão:</p>
				<div className="w-full flex flex-col gap-3">
					<div className="flex items-start lg:items-center gap-x-2 gap-y-1 flex-col lg:flex-row">
						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4 min-w-4 min-h-4" />
							<p className="text-sm text-primary/80">Data de expiração do token:</p>
						</div>
						<p className="text-sm font-bold">{formatDateAsLocale(new Date(whatsappConnection.dataExpiracao), true) || "N/A"}</p>
					</div>
					<div className="flex items-start lg:items-center gap-x-2 gap-y-1 flex-col lg:flex-row">
						<div className="flex items-center gap-2">
							<Key className="w-4 h-4 min-w-4 min-h-4" />
							<p className="text-sm text-primary/80">Permissões que você concedeu:</p>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							{whatsappConnection.metaEscopo.split(",").map((scope) => (
								<Badge key={scope} className="text-xs text-primary/80 bg-primary/10 rounded-md px-2 py-1">
									{PERMISSION_LABELS_MAP[scope as keyof typeof PERMISSION_LABELS_MAP]}
								</Badge>
							))}
						</div>
					</div>
					<div className="flex items-start lg:items-center gap-x-2 gap-y-1 flex-col lg:flex-row">
						<div className="flex items-center gap-2">
							<Phone className="w-4 h-4 min-w-4 min-h-4" />
							<p className="text-sm text-primary/80">Telefones conectados:</p>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							{whatsappConnection.telefones.map((telefone) => (
								<Badge key={telefone.numero} className="text-xs text-primary/80 bg-primary/10 rounded-md px-2 py-1">
									{telefone.nome}: <strong>{telefone.numero}</strong>
								</Badge>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
