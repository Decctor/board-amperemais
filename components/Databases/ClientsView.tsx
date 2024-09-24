import { useClients } from '@/lib/queries/clients'
import { TUserSession } from '@/schemas/users'
import React from 'react'
import LoadingComponent from '../Layouts/LoadingComponent'
import ErrorComponent from '../Layouts/ErrorComponent'
import { getErrorMessage } from '@/lib/errors'
import { TClientDTO } from '@/schemas/clients'
import { IoMdPulse } from 'react-icons/io'
import TextInput from '../Inputs/TextInput'

type ClientsViewProps = {
  session: TUserSession
}
function ClientsView({ session }: ClientsViewProps) {
  const { data: clients, isLoading, isError, isSuccess, error, filters, setFilters } = useClients()
  return (
    <div className="flex h-full grow flex-col">
      <div className="flex w-full flex-col items-start lg:items-center justify-between border-b border-gray-200 pb-2 lg:flex-row">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold">Controle de Clientes</h1>
          <p className="text-sm text-[#71717A]">Gerencie os clientes.</p>
          <p className="text-sm text-[#71717A]">{isSuccess ? clients.length : '0'} clientes atualmente cadastrados</p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 py-2">
        <div className="w-full py-2">
          <TextInput
            label="NOME DO CLIENTE"
            showLabel={false}
            placeholder="Filtre pelo nome do cliente..."
            value={filters.search}
            handleChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          />
        </div>
        {isLoading ? <LoadingComponent /> : null}
        {isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
        {isSuccess ? clients.length > 0 ? clients.map((client, index: number) => <ClientCard key={client._id} client={client} />) : <p></p> : null}
      </div>
    </div>
  )
}

export default ClientsView

type ClientCardProps = {
  client: TClientDTO
}
function ClientCard({ client }: ClientCardProps) {
  return (
    <div className="border border-primary flex flex-col px-3 py-2 rounded w-full bg-[#fff] dark:bg-[#121212]">
      <div className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-[0.6rem] font-bold tracking-tight lg:text-sm">{client.nome}</h1>
          {/* <h1 className={cn('px-2 py-1 rounded-lg text-white text-[0.6rem]', gridItems.find((x) => x.text == client.rfmLabel)?.color)}>{client.rfmLabel}</h1> */}
        </div>
      </div>
      {/* <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <IoMdPulse width={10} height={10} />
          <h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">FREQUÊNCIA</h1>
          <h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">NOTA {client.rfmScore.frequency}</h1>
        </div>
        <div className="flex items-center gap-1">
          <FaFastBackward width={10} height={10} />
          <h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">RECÊNCIA</h1>
          <h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">NOTA {client.rfmScore.recency}</h1>
        </div>
        <div className="flex items-center gap-1">
          <MdAttachMoney width={10} height={10} />
          <h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">VALOR GASTO NO PERÍODO</h1>
          <h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{formatToMoney(client.monetary)}</h1>
        </div>
        <div className="flex items-center gap-1">
          <BsCalendar width={10} height={10} />
          <h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">DIAS DESDE ÚLTIMA COMPRA</h1>
          <h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{client.recency} DIAS</h1>
        </div>
      </div> */}
    </div>
  )
}
