"use client";
import type { TGetUsersAdminOutputDefault } from "@/app/api/admin/users/route";
import { AdminControlUser } from "@/components/Modals/Users/AdminControlUser";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, Mail, Pencil, Phone, UserRound } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type TAdminUser = TGetUsersAdminOutputDefault["users"][number];

const MAX_ORGANIZATION_PILLS = 3;

type AdminUserRowProps = {
	user: TAdminUser;
	callbacks?: {
		onMutate?: () => void;
		onSettled?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
	};
};

export default function AdminUserRow({ user, callbacks }: AdminUserRowProps) {
	const [editModalOpen, setEditModalOpen] = useState(false);

	const organizationNames = user.associacoes.map((associacao) => associacao.organizacao?.nome).filter((nome): nome is string => !!nome);
	const visibleOrganizationNames = organizationNames.slice(0, MAX_ORGANIZATION_PILLS);
	const hiddenOrganizationsCount = organizationNames.length - visibleOrganizationNames.length;

	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border p-3 shadow-2xs transition-shadow hover:shadow-md lg:flex-row lg:items-center lg:justify-between">
			{/* Avatar, nome e contatos */}
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="relative flex h-11 w-11 min-w-11 min-h-11 items-center justify-center overflow-hidden rounded-full bg-primary/10">
					{user.avatarUrl ? (
						<Image src={user.avatarUrl} alt={user.nome} fill className="object-cover" />
					) : (
						<UserRound className="h-5 w-5 text-foreground/40" />
					)}
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<h3 className="truncate text-sm font-semibold tracking-tight">{user.nome}</h3>
						{user.admin ? (
							<span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight text-primary">
								ADMIN
							</span>
						) : null}
					</div>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<ContactInfo icon={<Mail className="h-3.5 w-3.5 min-w-3.5 min-h-3.5" />} value={user.email} missingLabel="SEM EMAIL" />
						<ContactInfo icon={<Phone className="h-3.5 w-3.5 min-w-3.5 min-h-3.5" />} value={user.telefone} missingLabel="SEM TELEFONE" />
					</div>
					{organizationNames.length > 0 ? (
						<div className="flex flex-wrap items-center gap-1.5">
							{visibleOrganizationNames.map((nome) => (
								<span
									key={nome}
									className="inline-flex items-center gap-1 rounded-full border border-border bg-input/30 px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight text-foreground/70"
								>
									<Building2 className="h-3 w-3 min-w-3 min-h-3" />
									{nome}
								</span>
							))}
							{hiddenOrganizationsCount > 0 ? <span className="text-[0.65rem] font-semibold text-foreground/60">+{hiddenOrganizationsCount}</span> : null}
						</div>
					) : (
						<span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight text-foreground/60">
							SEM ORGANIZAÇÃO
						</span>
					)}
				</div>
			</div>

			{/* Ações */}
			<div className="flex items-center gap-2 self-end lg:self-auto">
				<Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
					<Pencil className="h-3.5 w-3.5" />
					EDITAR
				</Button>
			</div>

			{editModalOpen ? <AdminControlUser userId={user.id} closeModal={() => setEditModalOpen(false)} callbacks={callbacks} /> : null}
		</div>
	);
}

function ContactInfo({ icon, value, missingLabel }: { icon: React.ReactNode; value: string | null | undefined; missingLabel: string }) {
	if (!value)
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight text-amber-600 dark:text-amber-400">
				{icon}
				{missingLabel}
			</span>
		);
	return (
		<span className={cn("flex min-w-0 items-center gap-1 text-xs text-foreground/60")}>
			{icon}
			<span className="truncate">{value}</span>
		</span>
	);
}
