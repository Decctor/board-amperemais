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
import { useMarketingControls } from '@/lib/queries/marketing-controls'
import { TMarketingControlDTO } from '@/schemas/marketing-controls'
import NewMarketingControl from '../Modals/MarketingControls/NewMarketingControl'
import EditMarketingControl from '../Modals/MarketingControls/EditMarketingControl'
import { BsMegaphoneFill } from 'react-icons/bs'

type MarketingControlViewProps = {
  session: TUserSession
}
function MarketingControlView({ session }: MarketingControlViewProps) {
  const [newMarketingControlModalIsOpen, setNewMarketingControlModalIsOpen] = useState<boolean>(false)
  const [editMarketingControlModal, setEditMarketingControlModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false })
  const { data: goals, isLoading, isError, isSuccess, error } = useMarketingControls()
  return (
    <div className="flex h-full grow flex-col">
      <div className="flex w-full flex-col items-center justify-between border-b border-gray-200 pb-2 lg:flex-row">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold">Controles de Marketing</h1>
          <p className="text-sm text-[#71717A]">Gerencie, adicione e edite os controles de marketing</p>
          {/* <p className="text-sm text-[#71717A]">{isSuccess ? users.length : '0'} metas atualmente cadastrados</p> */}
        </div>
        <button
          onClick={() => setNewMarketingControlModalIsOpen(true)}
          className="h-9 whitespace-nowrap rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow disabled:bg-gray-500 disabled:text-white enabled:hover:bg-gray-800 enabled:hover:text-white"
        >
          NOVO CONTROLE
        </button>
      </div>
      <div className="flex w-full flex-col gap-2 py-2">
        {isLoading ? <LoadingComponent /> : null}
        {isError ? <ErrorComponent msg="Erro ao buscar usuários" /> : null}
        {isSuccess ? (
          goals.length > 0 ? (
            goals.map((control, index: number) => (
              <MarketingControlCard key={control._id} control={control} handleClick={(id) => setEditMarketingControlModal({ id, isOpen: true })} />
            ))
          ) : (
            <p className="w-full tracking-tight text-center">Nenhum controle encontrado.</p>
          )
        ) : null}
      </div>
      {newMarketingControlModalIsOpen ? <NewMarketingControl session={session} closeModal={() => setNewMarketingControlModalIsOpen(false)} /> : null}
      {editMarketingControlModal.id && editMarketingControlModal.isOpen ? (
        <EditMarketingControl
          session={session}
          closeModal={() => setEditMarketingControlModal({ id: null, isOpen: false })}
          marketingControlId={editMarketingControlModal.id}
        />
      ) : null}
    </div>
  )
}

export default MarketingControlView

type MarketingControlCardProps = {
  control: TMarketingControlDTO
  handleClick: (id: string) => void
}
function MarketingControlCard({ control, handleClick }: MarketingControlCardProps) {
  return (
    <div className="flex w-full flex-col gap-1 rounded border border-primary bg-[#fff] p-2 shadow-sm dark:bg-[#121212]">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-bold leading-none tracking-tight">{control.titulo}</h1>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2">
        <h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80 ">INVESTIMENTOS</h1>
        {Object.entries(control.meses).map(([mes, info], index) => (
          <h1 key={mes} className="rounded-lg bg-primary px-2 py-0.5 text-[0.5rem] text-secondary">
            {getMonthLabel(Number(mes))} ({formatToMoney(info.investimento)})
          </h1>
        ))}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2">
        <h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80 ">CANAIS DE AQUISIÇÃO</h1>
        {control.canaisAquisicao.map((channel, index) => (
          <div key={`${channel}-${index}`} className="flex items-center gap-1 rounded-lg bg-primary px-2 py-0.5 text-[0.5rem] text-secondary">
            <BsMegaphoneFill />
            {channel}
          </div>
        ))}
      </div>
      <div className="flex w-full items-center justify-end">
        <button onClick={() => handleClick(control._id)} className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[0.6rem] text-secondary">
          <Pencil width={10} height={10} />
          <p>EDITAR</p>
        </button>
      </div>
    </div>
  )
}
