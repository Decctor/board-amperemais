import { useUsers } from '@/lib/queries/users'
import React, { useState } from 'react'
import LoadingComponent from '../Layouts/LoadingComponent'
import ErrorComponent from '../Layouts/ErrorComponent'
import { TUser, TUserDTO, TUserSession } from '@/schemas/users'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { formatNameAsInitials, formatToMoney } from '@/lib/formatting'
import { FaEye, FaUserTie } from 'react-icons/fa'
import { Pencil } from 'lucide-react'
import NewUser from '../Modals/Users/NewUser'
import EditUser from '../Modals/Users/EditUser'
import NewSaleGoal from '../Modals/SaleGoal/NewSaleGoal'
import { TSaleGoalDTO } from '@/schemas/sale-goals'
import { useGoals } from '@/lib/queries/goals'
import EditSaleGoal from '../Modals/SaleGoal/EditSaleGoal'
import { getMonthLabel } from '@/utils/constants'

type SaleGoalsViewProps = {
  session: TUserSession
}
function SaleGoalsView({ session }: SaleGoalsViewProps) {
  const [newSaleGoalModalIsOpen, setNewSaleGoalModalIsOpen] = useState<boolean>(false)
  const [editSaleGoalModal, setEditSaleGoalModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false })
  const { data: goals, isLoading, isError, isSuccess, error } = useGoals()
  return (
    <div className="flex h-full grow flex-col">
      <div className="flex w-full flex-col items-center justify-between border-b border-gray-200 pb-2 lg:flex-row">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold">Controle de metas</h1>
          <p className="text-sm text-[#71717A]">Gerencie, adicione e edite os metas</p>
          {/* <p className="text-sm text-[#71717A]">{isSuccess ? users.length : '0'} metas atualmente cadastrados</p> */}
        </div>
        <button
          onClick={() => setNewSaleGoalModalIsOpen(true)}
          className="h-9 whitespace-nowrap rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow disabled:bg-gray-500 disabled:text-white enabled:hover:bg-gray-800 enabled:hover:text-white"
        >
          NOVA META
        </button>
      </div>
      <div className="flex w-full flex-col gap-2 py-2">
        {isLoading ? <LoadingComponent /> : null}
        {isError ? <ErrorComponent msg="Erro ao buscar usuários" /> : null}
        {isSuccess &&
          goals.map((goal, index: number) => <GoalCard key={goal._id} goal={goal} handleClick={(id) => setEditSaleGoalModal({ id, isOpen: true })} />)}
      </div>
      {newSaleGoalModalIsOpen ? <NewSaleGoal session={session} closeModal={() => setNewSaleGoalModalIsOpen(false)} /> : null}
      {editSaleGoalModal.id && editSaleGoalModal.isOpen ? (
        <EditSaleGoal session={session} closeModal={() => setEditSaleGoalModal({ id: null, isOpen: false })} goalId={editSaleGoalModal.id} />
      ) : null}
    </div>
  )
}

export default SaleGoalsView

type GoalCardProps = {
  goal: TSaleGoalDTO
  handleClick: (id: string) => void
}
function GoalCard({ goal, handleClick }: GoalCardProps) {
  return (
    <div className="flex w-full flex-col gap-1 rounded border border-primary bg-[#fff] p-2 shadow-sm dark:bg-[#121212]">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-bold leading-none tracking-tight">Meta Anual de {goal.ano}</h1>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2">
        <h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80 ">METAS</h1>
        {Object.entries(goal.meses).map(([mes, info], index) => (
          <h1 key={mes} className="rounded-lg bg-primary px-2 py-0.5 text-[0.5rem] text-secondary">
            {getMonthLabel(Number(mes))} ({formatToMoney(info.vendas)})
          </h1>
        ))}
      </div>
      <div className="flex w-full items-center justify-end">
        <button onClick={() => handleClick(goal._id)} className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[0.6rem] text-secondary">
          <Pencil width={10} height={10} />
          <p>EDITAR</p>
        </button>
      </div>
    </div>
  )
}
