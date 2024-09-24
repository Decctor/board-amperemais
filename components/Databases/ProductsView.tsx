import { useClients } from '@/lib/queries/clients'
import { TUserSession } from '@/schemas/users'
import React from 'react'
import LoadingComponent from '../Layouts/LoadingComponent'
import ErrorComponent from '../Layouts/ErrorComponent'
import { getErrorMessage } from '@/lib/errors'
import { TClientDTO } from '@/schemas/clients'
import { IoMdPulse } from 'react-icons/io'
import { useSaleItems } from '@/lib/queries/sales'
import { BsCart } from 'react-icons/bs'
import { formatLongString } from '@/lib/formatting'
import TextInput from '../Inputs/TextInput'

type ProductsViewProps = {
  session: TUserSession
}
function ProductsView({ session }: ProductsViewProps) {
  const { data: saleItems, isLoading, isError, isSuccess, error, filters, setFilters } = useSaleItems()
  return (
    <div className="flex h-full grow flex-col">
      <div className="flex w-full flex-col items-start lg:items-center justify-between border-b border-gray-200 pb-2 lg:flex-row">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold">Controle de Produtos</h1>
          <p className="text-sm text-[#71717A]">Gerencie os produtos</p>
          <p className="text-sm text-[#71717A]">{isSuccess ? saleItems.length : '0'} produtos atualmente cadastrados</p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 py-2">
        <div className="w-full py-2">
          <TextInput
            label="NOME DO PRODUTO"
            showLabel={false}
            placeholder="Filtre pelo nome do produto..."
            value={filters.search}
            handleChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          />
        </div>
        {isLoading ? <LoadingComponent /> : null}
        {isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
        {isSuccess ? saleItems.length > 0 ? saleItems.map((product, index: number) => <ProductCard key={product} product={product} />) : <p></p> : null}
      </div>
    </div>
  )
}

export default ProductsView

type ProductCardProps = {
  product: string
}
function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="border border-primary flex flex-col px-3 py-2 rounded w-full bg-[#fff] dark:bg-[#121212]">
      <div className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center border border-primary">
            <BsCart size={10} />
          </div>
          <h1 className="hidden lg:block text-[0.6rem] lg:text-sm tracking-tight font-bold">{product}</h1>
          <h1 className="block lg:hidden text-[0.6rem] lg:text-sm tracking-tight font-bold">{formatLongString(product, 25)}</h1>
        </div>
        {/* <h1 className="text-xs lg:text-base font-black">{type == 'total' ? formatToMoney(d.total) : d.qtde}</h1> */}
      </div>
    </div>
  )
}
