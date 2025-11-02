import { useUsers } from "@/lib/queries/users";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import type { TUserDTO, TUserSession } from "@/schemas/users";
import { Filter, Pencil, Phone, Mail, Plus, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import LoadingComponent from "../Layouts/LoadingComponent";
import ErrorComponent from "../Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatNameAsInitials } from "@/lib/formatting";
import Image from "next/image";
import EditUser from "../Modals/Users/EditUser";
import NewUser from "../Modals/Users/NewUser";

type SettingsUsersProps = {
	user: TUserSession;
};
export default function SettingsUsers({ user }: SettingsUsersProps) {
	const { data: users, isLoading, isError, isSuccess, error } = useUsers();
	const [newUserModalIsOpen, setNewUserModalIsOpen] = useState(false);
	const [editUserModalId, setEditUserModalId] = useState<string | null>(null);
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
	return (
		<div className={cn("flex w-full flex-col gap-3")}>
			<div className="flex items-center justify-end gap-2">
				<div className="flex items-center gap-2">
					{/* <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setFilterMenuIsOpen(true)}>
						<Filter className="w-4 h-4 min-w-4 min-h-4" />
						FILTROS
					</Button> */}
					<Button size="sm" className="flex items-center gap-2" onClick={() => setNewUserModalIsOpen(true)}>
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						NOVO USUÁRIO
					</Button>
				</div>
			</div>
			<div className="w-full flex flex-col gap-1.5">
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess ? users.map((user, index: number) => <UserCard key={user._id} user={user} handleClick={setEditUserModalId} />) : null}
			</div>
			{newUserModalIsOpen ? <NewUser session={user} closeModal={() => setNewUserModalIsOpen(false)} /> : null}
			{editUserModalId ? <EditUser session={user} closeModal={() => setEditUserModalId(null)} userId={editUserModalId} /> : null}
		</div>
	);
}

type UserCardProps = {
	user: TUserDTO;
	handleClick: (id: string) => void;
};
function UserCard({ user, handleClick }: UserCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-3 rounded-xl border px-3 py-4 shadow-xs h-full")}>
			<div className="flex items-center justify-center">
				<div className="relative w-20 h-20 lg:h-20 lg:w-20 lg:min-h-20 lg:min-w-20 overflow-hidden rounded-lg">
					{user.avatar ? (
						<Image src={user.avatar} alt={user.nome} fill={true} objectFit="cover" />
					) : (
						<div className="bg-primary/50 text-primary-foreground flex h-full w-full items-center justify-center">
							<UserRound className="h-6 w-6" />
						</div>
					)}
				</div>
			</div>
			<div className="flex h-full grow flex-col gap-1.5">
				<h1 className="text-xs font-bold tracking-tight lg:text-sm">{user.nome}</h1>
				<div className="w-full flex flex-items-center gap-1.5 grow">
					<div className="flex items-center gap-1">
						<Mail className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{user.email ?? "EMAIL NÃO INFORMADO"}</h1>
					</div>
				</div>
				<div className="w-full flex items-center justify-end">
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => handleClick(user._id)}>
						<Pencil className="w-3 min-w-3 h-3 min-h-3" />
						EDITAR
					</Button>
				</div>
			</div>
		</div>
	);
}
