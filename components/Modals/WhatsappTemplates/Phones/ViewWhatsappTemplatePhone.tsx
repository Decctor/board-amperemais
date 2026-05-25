import ResponsiveMenuViewOnly from "@/components/Utils/ResponsiveMenuViewOnly";
import { getErrorMessage } from "@/lib/errors";
import { whatsappTemplateComponentsToMessageContent } from "@/lib/message-templates";
import { useWhatsappTemplatePhoneById } from "@/lib/queries/whatsapp-templates";
import { cn } from "@/lib/utils";
import TemplatePreview from "../Blocks/TemplatePreview";
import { useMutation } from "@tanstack/react-query";
import { deleteWhatsappTemplatePhone, syncWhatsappTemplatePhone } from "@/lib/mutations/whatsapp-templates";
import { toast } from "sonner";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Phone, Settings } from "lucide-react";
import { LoadingButton } from "@/components/loading-button";

type ViewWhatsappTemplatePhoneProps = {
	whatsappTemplatePhoneId: string;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export function ViewWhatsappTemplatePhone({ whatsappTemplatePhoneId, closeMenu, callbacks }: ViewWhatsappTemplatePhoneProps) {
	const { data: whatsappTemplatePhone, isLoading, isError, isSuccess, error } = useWhatsappTemplatePhoneById({ id: whatsappTemplatePhoneId });

	const { mutate: handleSync, isPending: isSyncing } = useMutation({
		mutationKey: ["sync-whatsapp-template-phone"],
		mutationFn: syncWhatsappTemplatePhone,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});

	const { mutate: handleDelete, isPending: isDeleting } = useMutation({
		mutationKey: ["delete-whatsapp-template-phone"],
		mutationFn: deleteWhatsappTemplatePhone,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});
	return (
		<ResponsiveMenuViewOnly
			menuTitle="VER TELEFONE DO TEMPLATE"
			menuDescription="Veja os detalhes do telefone do template"
			menuCancelButtonText="FECHAR"
			closeMenu={closeMenu}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
		>
			{isSuccess ? (
				<div className="w-full flex flex-col gap-2">
					<ResponsiveMenuSection title="DETALHES DO TELEFONE" icon={<Phone size={15} />}>
						{whatsappTemplatePhone.whatsappTemplateId ? (
							<div className="w-full flex items-center justify-between gap-2">
								<span className="text-sm font-medium">TEMPLATE ID (META)</span>
								<span className="text-sm font-medium">{whatsappTemplatePhone.whatsappTemplateId}</span>
							</div>
						) : null}
						<div className="w-full flex items-center justify-between gap-2">
							<span className="text-sm font-medium">NOME</span>
							<span className="text-sm font-medium">{whatsappTemplatePhone.telefone.nome}</span>
						</div>
						<div className="w-full flex items-center justify-between gap-2">
							<span className="text-sm font-medium">NÚMERO</span>
							<span className="text-sm font-medium">{whatsappTemplatePhone.telefone.numero}</span>
						</div>
						<div className="w-full flex items-center justify-between gap-2">
							<span className="text-sm font-medium">STATUS</span>
							<div
								className={cn("px-2 py-0.5 rounded-lg text-[0.65rem] font-bold", {
									"bg-blue-500 text-white": whatsappTemplatePhone.status === "APROVADO",
									"bg-primary/20 text-foreground": whatsappTemplatePhone.status === "PENDENTE",
									"bg-red-500 text-white": whatsappTemplatePhone.status === "REJEITADO",
									"bg-orange-500 text-white": whatsappTemplatePhone.status === "PAUSADO",
									"bg-gray-500 text-white": whatsappTemplatePhone.status === "DESABILITADO" || whatsappTemplatePhone.status === "RASCUNHO",
								})}
							>
								{whatsappTemplatePhone.status}
							</div>
						</div>
						<div className="w-full flex items-center justify-between gap-2">
							<span className="text-sm font-medium">QUALIDADE</span>
							<div
								className={cn("px-2 py-0.5 rounded-lg text-[0.65rem] font-bold", {
									"bg-green-500 text-white": whatsappTemplatePhone.qualidade === "ALTA",
									"bg-yellow-500 text-white": whatsappTemplatePhone.qualidade === "MEDIA",
									"bg-red-500 text-white": whatsappTemplatePhone.qualidade === "BAIXA",
									"bg-primary/20 text-foreground": whatsappTemplatePhone.qualidade === "PENDENTE",
								})}
							>
								{whatsappTemplatePhone.qualidade}
							</div>
						</div>
						{whatsappTemplatePhone.rejeicao ? (
							<div className="w-full flex items-center justify-between gap-2">
								<span className="text-sm font-medium">REJEIÇÃO</span>
								<span className="text-sm font-medium">{whatsappTemplatePhone.rejeicao}</span>
							</div>
						) : null}
					</ResponsiveMenuSection>

					<TemplatePreview content={whatsappTemplateComponentsToMessageContent(whatsappTemplatePhone.template.componentes)} />

					<ResponsiveMenuSection title="AÇÕES" icon={<Settings size={15} />}>
						<div className="w-full flex items-center flex-col lg:flex-row justify-center gap-x-3 gap-y-3">
							{whatsappTemplatePhone.whatsappTemplateId ? (
								<LoadingButton
									onClick={() => handleSync({ id: whatsappTemplatePhoneId })}
									variant="ghost-brand"
									size="sm"
									loading={isSyncing}
									disabled={isSyncing}
								>
									SINCRONIZAR TEMPLATE
								</LoadingButton>
							) : null}

							<LoadingButton
								onClick={() => handleDelete({ id: whatsappTemplatePhoneId })}
								variant="destructive"
								size="sm"
								loading={isDeleting}
								disabled={isDeleting}
							>
								EXCLUIR VÍNCULO
							</LoadingButton>
						</div>
					</ResponsiveMenuSection>
				</div>
			) : null}
		</ResponsiveMenuViewOnly>
	);
}
