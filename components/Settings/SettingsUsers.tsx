import type { TGetUsersOutputDefault } from "@/app/api/users/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDateBirthdayAsLocale, formatNameAsInitials } from "@/lib/formatting";
import { useOrganizationMembershipInvitations } from "@/lib/queries/organizations";
import { useUsers } from "@/lib/queries/users";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Cake, Filter, Mail, Pencil, Phone, Plus, UserRound, UsersRound } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import NewOrganizationMembershipInvitation from "../Modals/OrganizationsMembershipInvitations/NewOrganizationMembershipInvitation";
import EditUser from "../Modals/Users/EditUser";
import NewUser from "../Modals/Users/NewUser";
import { Button } from "../ui/button";

type SettingsUsersProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function SettingsUsers({ user, membership }: SettingsUsersProps) {
	const queryClient = useQueryClient();
	const { data: users, queryKey, isLoading, isError, isSuccess, error } = useUsers({ initialFilters: { search: "" } });
	const {
		data: pendingInvitations,
		isLoading: isLoadingInvitations,
		isError: isInvitationsError,
		error: invitationsError,
	} = useOrganizationMembershipInvitations({ pendingOnly: true });
	const [newUserModalIsOpen, setNewUserModalIsOpen] = useState(false);
	const [editUserModalId, setEditUserModalId] = useState<string | null>(null);
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);

	const sessionUserHasCreatePermission = membership.permissoes.usuarios.criar;
	const sessionUserHasEditPermission = membership.permissoes.usuarios.editar;
	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	return (
		<div className={cn("flex w-full flex-col gap-3")}>
			<div className="flex items-center justify-end gap-2">
				<div className="flex items-center gap-2">
					{sessionUserHasCreatePermission ? (
						<Button size="sm" className="flex items-center gap-2" onClick={() => setNewUserModalIsOpen(true)}>
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVO CONVITE
						</Button>
					) : null}
				</div>
			</div>
			{pendingInvitations && pendingInvitations.length > 0 ? (
				<div className="w-full flex flex-col gap-2 p-3 bg-card border-primary/20 border rounded-xl">
					<div className="flex items-center gap-2">
						<h2 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">CONVITES PENDENTES</h2>
					</div>

					<div className="flex flex-col gap-2">
						{pendingInvitations.map((invitation) => (
							<div key={invitation.id} className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
										<Mail className="h-4 w-4" />
									</div>
									<div className="flex flex-col">
										<span className="text-sm font-semibold">{invitation.nome}</span>
										<span className="text-xs text-muted-foreground">{invitation.email}</span>
									</div>
								</div>
								<span className="bg-yellow-100 text-yellow-800 border-yellow-200 border px-2 py-1 rounded-full text-[0.6rem] font-bold tracking-widest">
									PENDENTE
								</span>
							</div>
						))}
					</div>
				</div>
			) : null}

			<div className="w-full flex flex-col gap-1.5">
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess
					? users.map((user, index: number) => (
							<UserCard key={user.id} user={user} handleClick={setEditUserModalId} userHasEditPermission={sessionUserHasEditPermission} />
						))
					: null}
			</div>
			{newUserModalIsOpen ? (
				<NewOrganizationMembershipInvitation
					sessionUserId={user.id}
					closeModal={() => setNewUserModalIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
			{editUserModalId ? (
				<EditUser
					session={user}
					closeModal={() => setEditUserModalId(null)}
					userId={editUserModalId}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

type UserCardProps = {
	user: TGetUsersOutputDefault[number];
	handleClick: (id: string) => void;
	userHasEditPermission: boolean;
};
function UserCard({ user, handleClick, userHasEditPermission }: UserCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full")}>
			<div className="flex items-center justify-center">
				<div className="relative w-20 h-20 lg:h-20 lg:w-20 lg:min-h-20 lg:min-w-20 overflow-hidden rounded-lg">
					{user.avatarUrl ? (
						<Image src={user.avatarUrl} alt={user.nome} fill={true} objectFit="cover" />
					) : (
						<div className="bg-primary/50 text-primary-foreground flex h-full w-full items-center justify-center">
							<UserRound className="h-6 w-6" />
						</div>
					)}
				</div>
			</div>
			<div className="flex h-full grow flex-col gap-1.5">
				<h1 className="text-xs font-bold tracking-tight lg:text-sm">{user.nome}</h1>
				<div className="w-full flex flex-items-center gap-1.5 grow flex-wrap">
					<div className="flex items-center gap-1">
						<Phone className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{user.telefone ?? "TELEFONE NÃO INFORMADO"}</h1>
					</div>
					<div className="flex items-center gap-1">
						<Mail className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{user.email ?? "EMAIL NÃO INFORMADO"}</h1>
					</div>
					<div className="flex items-center gap-1">
						<Cake className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">
							{formatDateBirthdayAsLocale(user.dataNascimento, true) ?? "DATA DE NASCIMENTO NÃO INFORMADA"}
						</h1>
					</div>
				</div>
				<div className="w-full flex items-center justify-end">
					{userHasEditPermission ? (
						<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => handleClick(user.id)}>
							<Pencil className="w-3 min-w-3 h-3 min-h-3" />
							EDITAR
						</Button>
					) : null}
				</div>
			</div>
		</div>
	);
}
