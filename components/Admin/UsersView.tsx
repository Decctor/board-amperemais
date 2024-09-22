import { useUsers } from '@/lib/queries/users'
import React, { useState } from 'react'
import LoadingComponent from '../Layouts/LoadingComponent'
import ErrorComponent from '../Layouts/ErrorComponent'
import { TUser, TUserDTO, TUserSession } from '@/schemas/users'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { formatNameAsInitials } from '@/lib/formatting'
import { FaEye, FaUserTie } from 'react-icons/fa'
import { Pencil } from 'lucide-react'
import NewUser from '../Modals/Users/NewUser'
import EditUser from '../Modals/Users/EditUser'

type UsersViewProps = {
  session: TUserSession
}
function UsersView({ session }: UsersViewProps) {
  const [newUserModalIsOpen, setNewUserModalIsOpen] = useState<boolean>(false)
  const [editUserModal, setEditUserModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false })
  const { data: users, isLoading, isError, isSuccess, error } = useUsers()
  return (
    <div className="flex h-full grow flex-col">
      <div className="flex w-full flex-col items-center justify-between border-b border-gray-200 pb-2 lg:flex-row">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold">Controle de usuários</h1>
          <p className="text-sm text-[#71717A]">Gerencie, adicione e edite os usuários</p>
          <p className="text-sm text-[#71717A]">{isSuccess ? users.length : '0'} usuários atualmente cadastrados</p>
        </div>
        <button
          onClick={() => setNewUserModalIsOpen(true)}
          className="h-9 whitespace-nowrap rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow disabled:bg-gray-500 disabled:text-white enabled:hover:bg-gray-800 enabled:hover:text-white"
        >
          NOVO USUÁRIO
        </button>
      </div>
      <div className="flex w-full flex-col gap-2 py-2">
        {isLoading ? <LoadingComponent /> : null}
        {isError ? <ErrorComponent msg="Erro ao buscar usuários" /> : null}
        {isSuccess && users.map((user, index: number) => <UserCard key={user._id} user={user} handleClick={(id) => setEditUserModal({ id, isOpen: true })} />)}
      </div>
      {newUserModalIsOpen ? <NewUser session={session} closeModal={() => setNewUserModalIsOpen(false)} /> : null}
      {editUserModal.id && editUserModal.isOpen ? (
        <EditUser session={session} closeModal={() => setEditUserModal({ id: null, isOpen: false })} userId={editUserModal.id} />
      ) : null}
    </div>
  )
}

export default UsersView

type UserCardProps = {
  user: TUserDTO
  handleClick: (id: string) => void
}
function UserCard({ user, handleClick }: UserCardProps) {
  return (
    <div className="flex w-full flex-col gap-1 rounded border border-primary bg-[#fff] p-2 shadow-sm dark:bg-[#121212]">
      <div className="flex items-center gap-2">
        <Avatar className="z-[1] h-5 w-5">
          <AvatarImage src={user?.avatar || undefined} alt={user.nome} />
          <AvatarFallback>{formatNameAsInitials(user.nome || '')}</AvatarFallback>
        </Avatar>
        <h1 className="text-sm font-bold leading-none tracking-tight">{user.nome}</h1>
      </div>
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <FaEye size={12} />
            <p className="text-[0.6rem] italic text-primary/80 lg:text-xs">{user.visualizacao}</p>
          </div>
          <div className="flex items-center gap-1">
            <FaUserTie size={12} />
            <p className="text-[0.6rem] italic text-primary/80 lg:text-xs">{user.vendedor}</p>
          </div>
        </div>

        <button onClick={() => handleClick(user._id)} className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[0.6rem] text-secondary">
          <Pencil width={10} height={10} />
          <p>EDITAR</p>
        </button>
      </div>
    </div>
  )
}
