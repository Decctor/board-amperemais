"use client";
import type { TGetOrganizationsAdminOutputDefault } from "@/app/api/admin/organizations/route";
import { AdminControlOrganization } from "@/components/Modals/Organizations/AdminControlOrganization";
import { AdminDeleteOrganization } from "@/components/Modals/Organizations/AdminDeleteOrganization";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { joinAsMember } from "@/lib/mutations/admin";
import { cn, copyToClipboard } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { BrainCircuit, Building2, Calendar, Copy, ImageIcon, MoreVertical, Settings2, Trash2, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import AdminMarketingContextExportMenu from "./AdminMarketingContextExportMenu";
import AdminOrganizationWatermarkMenu from "./AdminOrganizationWatermarkMenu";

type TAdminOrganization = TGetOrganizationsAdminOutputDefault["organizations"][number];

type TStatusPill = {
	label: string;
	className: string;
};

function getSubscriptionStatusPill(organization: TAdminOrganization): TStatusPill {
	const status = organization.stripeSubscriptionStatus;
	if (status === "active") return { label: "ASSINATURA ATIVA", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
	if (status === "trialing") return { label: "TRIAL (STRIPE)", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
	if (status === "past_due" || status === "unpaid" || status === "incomplete")
		return { label: "PAGAMENTO PENDENTE", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
	if (status === "canceled" || status === "incomplete_expired")
		return { label: "ASSINATURA CANCELADA", className: "bg-red-500/15 text-red-600 dark:text-red-400" };

	if (organization.periodoTesteFim) {
		const trialEnd = dayjs(organization.periodoTesteFim);
		if (trialEnd.isAfter(dayjs())) {
			const daysRemaining = Math.max(trialEnd.diff(dayjs(), "day"), 0);
			return { label: `TRIAL ATIVO (${daysRemaining}D RESTANTES)`, className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
		}
		return { label: "TRIAL EXPIRADO", className: "bg-red-500/15 text-red-600 dark:text-red-400" };
	}

	return { label: "SEM ASSINATURA", className: "bg-muted text-foreground/60" };
}

function CopyableCode({ value, label }: { value: string; label: string }) {
	return (
		<button
			type="button"
			title={`Copiar ${label}: ${value}`}
			onClick={() => copyToClipboard(value)}
			className="inline-flex max-w-[200px] cursor-pointer items-center gap-1 rounded-full border border-border bg-input/30 px-2 py-0.5 font-mono text-[0.65rem] text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
		>
			<Copy className="h-3 w-3 min-w-3 min-h-3" />
			<span className="truncate">{value}</span>
		</button>
	);
}

function StatusPill({ pill }: { pill: TStatusPill }) {
	return (
		<span
			className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight", pill.className)}
		>
			{pill.label}
		</span>
	);
}

type AdminOrganizationRowProps = {
	sessionUser: TAuthUserSession["user"];
	organization: TAdminOrganization;
	callbacks?: {
		onMutate?: () => void;
		onSettled?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
	};
};

export default function AdminOrganizationRow({ sessionUser, organization, callbacks }: AdminOrganizationRowProps) {
	const { id, nome, cnpj, logoUrl, dataInsercao } = organization;
	const [controlModalOpen, setControlModalOpen] = useState(false);
	const [marketingContextModalOpen, setMarketingContextModalOpen] = useState(false);
	const [watermarkModalOpen, setWatermarkModalOpen] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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

	const subscriptionPill = getSubscriptionStatusPill(organization);
	const planPill: TStatusPill = {
		label: organization.assinaturaPlano ?? "ESSENCIAL",
		className: "border border-border bg-input/30 text-foreground/70",
	};

	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border p-3 shadow-2xs transition-shadow hover:shadow-md lg:flex-row lg:items-center lg:justify-between">
			{/* Logo, nome e pills */}
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="relative flex h-11 w-11 min-w-11 min-h-11 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
					{logoUrl ? <Image src={logoUrl} alt={nome} fill className="object-cover" /> : <Building2 className="h-5 w-5 text-foreground/40" />}
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<h3 className="truncate text-sm font-semibold tracking-tight">{nome}</h3>
						<span className="truncate text-xs text-foreground/60">{cnpj}</span>
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<StatusPill pill={subscriptionPill} />
						<StatusPill pill={planPill} />
						{organization.consultoriaAtiva ? (
							<StatusPill pill={{ label: "CONSULTORIA", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400" }} />
						) : null}
						{!organization.dataOnboardingConclusao ? (
							<StatusPill pill={{ label: "ONBOARDING PENDENTE", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" }} />
						) : null}
						{organization.stripeSubscriptionId ? <CopyableCode value={organization.stripeSubscriptionId} label="ID da assinatura Stripe" /> : null}
						{organization.stripeCustomerId ? <CopyableCode value={organization.stripeCustomerId} label="ID do cliente Stripe" /> : null}
						<span className="flex items-center gap-1 text-xs text-foreground/60">
							<Users className="h-3.5 w-3.5 min-w-3.5 min-h-3.5" />
							{organization.membros.length}
						</span>
						<span className="flex items-center gap-1 text-xs text-foreground/60">
							<Calendar className="h-3.5 w-3.5 min-w-3.5 min-h-3.5" />
							{formatDateAsLocale(dataInsercao)}
						</span>
					</div>
				</div>
			</div>

			{/* Ações */}
			<div className="flex items-center gap-2 self-end lg:self-auto">
				{!adminUserIsMember ? (
					<LoadingButton loading={isPending} variant="ghost-brand" size="sm" onClick={() => joinAsMemberMutation({ organizationId: id })}>
						ENTRAR
					</LoadingButton>
				) : (
					<span className="px-2 text-xs text-foreground/60">MEMBRO</span>
				)}
				<Button variant="outline" size="sm" onClick={() => setControlModalOpen(true)}>
					<Settings2 className="h-3.5 w-3.5" />
					GERENCIAR
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon-sm" aria-label="Mais ações">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setMarketingContextModalOpen(true)}>
							<BrainCircuit className="h-3.5 w-3.5" />
							CONTEXTO IA
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setWatermarkModalOpen(true)}>
							<ImageIcon className="h-3.5 w-3.5" />
							MARCA D'ÁGUA
						</DropdownMenuItem>
						<DropdownMenuItem variant="destructive" onClick={() => setDeleteModalOpen(true)}>
							<Trash2 className="h-3.5 w-3.5" />
							EXCLUIR
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{controlModalOpen ? <AdminControlOrganization organizationId={id} closeModal={() => setControlModalOpen(false)} callbacks={callbacks} /> : null}
			{deleteModalOpen ? <AdminDeleteOrganization organizationId={id} closeModal={() => setDeleteModalOpen(false)} callbacks={callbacks} /> : null}
			{marketingContextModalOpen ? (
				<AdminMarketingContextExportMenu organizationId={id} organizationName={nome} closeModal={() => setMarketingContextModalOpen(false)} />
			) : null}
			{watermarkModalOpen ? (
				<AdminOrganizationWatermarkMenu organizationName={nome} organizationLogoUrl={logoUrl} closeModal={() => setWatermarkModalOpen(false)} />
			) : null}
		</div>
	);
}
