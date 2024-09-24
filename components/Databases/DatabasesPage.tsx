import { TUserSession } from '@/schemas/users'
import React, { useState } from 'react'
import Header from '../Layouts/Header'
import ErrorComponent from '../Layouts/ErrorComponent'
import { cn } from '@/lib/utils'

import ClientsView from './ClientsView'
import ProductsView from './ProductsView'

type DatabasesPageProps = {
  session: TUserSession
}
function DatabasesPage({ session }: DatabasesPageProps) {
  const [view, setView] = useState<'clients' | 'products'>('clients')

  if (session.visualizacao != 'GERAL')
    return (
      <div className="flex h-full flex-col">
        <Header session={session} />
        <ErrorComponent msg="Oops, você não possui permissão para acessar essa área." />
      </div>
    )

  return (
    <div className="flex h-full flex-col">
      <Header session={session} />
      <div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-[#f8f9fa] p-6 gap-6">
        <div className="w-full flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => setView('clients')}
            className={cn(
              'px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out',
              view == 'clients' ? 'bg-[#fead41] text-[#15599a]' : 'hover:bg-gray-100'
            )}
          >
            Banco de Cliente
          </button>
          <button
            onClick={() => setView('products')}
            className={cn(
              'px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out',
              view == 'products' ? 'bg-[#fead41] text-[#15599a]' : 'hover:bg-gray-100'
            )}
          >
            Banco de Produtos
          </button>
        </div>
        {view == 'clients' ? <ClientsView session={session} /> : null}
        {view == 'products' ? <ProductsView session={session} /> : null}
      </div>
    </div>
  )
}

export default DatabasesPage
