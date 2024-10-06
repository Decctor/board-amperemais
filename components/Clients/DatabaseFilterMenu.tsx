import React, { useState } from 'react'

import { TClientSearchQueryParams } from '@/schemas/clients'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import TextInput from '../Inputs/TextInput'
import MultipleSelectInputVirtualized from '../Inputs/MultipleSelectInputVirtualized'
import { CustomersAcquisitionChannels } from '@/utils/select-options'
import DateInput from '../Inputs/DateInput'
import { formatDateForInput, formatDateInputChange } from '@/lib/formatting'
import { Button } from '../ui/button'

type ClientsDatabaseFilterMenuProps = {
  queryParams: TClientSearchQueryParams
  updateQueryParams: (params: Partial<TClientSearchQueryParams>) => void
  closeMenu: () => void
}
function ClientsDatabaseFilterMenu({ queryParams, updateQueryParams, closeMenu }: ClientsDatabaseFilterMenuProps) {
  const [queryParamsHolder, setQueryParamsHolder] = useState<TClientSearchQueryParams>(queryParams)

  return (
    <Sheet open onOpenChange={closeMenu}>
      <SheetContent>
        <div className="flex h-full w-full flex-col">
          <SheetHeader>
            <SheetTitle>FILTRAR CLIENTES</SheetTitle>
            <SheetDescription>Escolha aqui parâmetros para filtrar o banco de clientes.</SheetDescription>
          </SheetHeader>

          <div className="scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2">
            <div className="flex w-full flex-col gap-2">
              <TextInput
                label="NOME"
                value={queryParamsHolder.name}
                placeholder={'Preenha aqui o nome do cliente para filtro.'}
                handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, name: value }))}
                width={'100%'}
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <h1 className="w-full text-center text-[0.65rem] tracking-tight text-primary/80">FILTRO POR PERÍODO</h1>
              <DateInput
                label="DEPOIS DE"
                value={formatDateForInput(queryParamsHolder.period.after)}
                handleChange={(value) =>
                  setQueryParamsHolder((prev) => ({ ...prev, period: { ...prev.period, after: formatDateInputChange(value, 'string') as string } }))
                }
                width="100%"
              />
              <DateInput
                label="ANTES DE"
                value={formatDateForInput(queryParamsHolder.period.before)}
                handleChange={(value) =>
                  setQueryParamsHolder((prev) => ({ ...prev, period: { ...prev.period, before: formatDateInputChange(value, 'string') as string } }))
                }
                width="100%"
              />
            </div>
          </div>
          <Button
            onClick={() => {
              updateQueryParams({ ...queryParamsHolder, page: 1 })
              closeMenu()
            }}
          >
            FILTRAR
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ClientsDatabaseFilterMenu
