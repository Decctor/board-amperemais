"use client";
import { AdminControlOrganization } from "@/components/Modals/Organizations/AdminControlOrganization";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import type { TGetOrganizationsAdminOutputDefault } from "@/app/api/admin/organizations/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { joinAsMember } from "@/lib/mutations/admin";
import { useMutation } from "@tanstack/react-query";
import { BrainCircuit, Building2, Calendar, Settings2, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import AdminMarketingContextExportMenu from "./AdminMarketingContextExportMenu";

type AdminOrganizationCardProps = {
	sessionUser: TAuthUserSession["user"];
	organization: TGetOrganizationsAdminOutputDefault["organizations"][number];
	callbacks?: {
		onMutate?: () => void;
		onSettled?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
	};
};

export default function AdminOrganizationCard({ sessionUser, organization, callbacks }: AdminOrganizationCardProps) {
	const { id, nome, cnpj, logoUrl, dataInsercao } = organization;
	const [controlModalOpen, setControlModalOpen] = useState(false);
	const [marketingContextModalOpen, setMarketingContextModalOpen] = useState(false);

	const adminUserIsMember = organization.membros.some((member) => member.usuarioId === sessionUser.id);
	const { mutate: joinAsMemberMutation, isPending } = useMutation({
		mutationFn: joinAsMember,
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});

	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border p-4 shadow-2xs hover:shadow-md transition-shadow">
			{/* Logo e Nome */}
			<div className="flex items-center gap-3">
				<div className="relative h-16 w-16 min-w-16 min-h-16 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
					{logoUrl ? <Image src={logoUrl} alt={nome} fill className="object-cover" /> : <Building2 className="w-8 h-8 text-foreground/40" />}
				</div>
				<div className="flex flex-col flex-1 min-w-0">
					<h3 className="text-base font-semibold tracking-tight truncate">{nome}</h3>
					<p className="text-xs text-foreground/60 truncate">{cnpj}</p>
				</div>
			</div>

			{/* Informações */}
			<div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
				<div className="flex items-center gap-2 text-xs text-foreground/70">
					<Calendar className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
					<span>Criada em {formatDateAsLocale(dataInsercao)}</span>
				</div>
				<div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-1">
					<Users className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 text-foreground/70" />
					<span className="text-xs font-semibold text-foreground">{organization.membros.length}</span>
				</div>
			</div>
			<div className="flex w-full flex-col gap-2">
				<Button variant="secondary" size="sm" className="w-full" onClick={() => setMarketingContextModalOpen(true)}>
					<BrainCircuit className="h-3.5 w-3.5" />
					CONTEXTO IA
				</Button>
				<Button variant="outline" size="sm" className="w-full" onClick={() => setControlModalOpen(true)}>
					<Settings2 className="h-3.5 w-3.5" />
					GERENCIAR
				</Button>
				{!adminUserIsMember ? (
					<LoadingButton
						loading={isPending}
						variant="ghost-brand"
						size="sm"
						className="w-full"
						onClick={() => joinAsMemberMutation({ organizationId: id })}
					>
						ENTRAR
					</LoadingButton>
				) : (
					<div className="flex h-8 w-full items-center justify-center rounded-md px-3 text-xs">VOCÊ É MEMBRO</div>
				)}
			</div>

			{controlModalOpen ? <AdminControlOrganization organizationId={id} closeModal={() => setControlModalOpen(false)} callbacks={callbacks} /> : null}
			{marketingContextModalOpen ? (
				<AdminMarketingContextExportMenu organizationId={id} organizationName={nome} closeModal={() => setMarketingContextModalOpen(false)} />
			) : null}
		</div>
	);
}
