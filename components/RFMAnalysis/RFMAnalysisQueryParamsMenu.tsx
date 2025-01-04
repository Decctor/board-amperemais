import { formatDateInputChange } from '@/lib/formatting'
import { formatDateForInput } from '@/lib/formatting'
import { TClientSearchQueryParams } from '@/schemas/clients'
import { TUserSession } from '@/schemas/users'
import React, { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import MultipleSelectInput from '../Inputs/MultipleSelectInput'
import MultipleSalesSelectInput from '../Inputs/SelectMultipleSalesInput'
import { RFMLabels } from '@/utils/rfm'
import TextInput from '../Inputs/TextInput'
import { CustomersAcquisitionChannels } from '@/utils/select-options'
import DateInput from '../Inputs/DateInput'
import { Button } from '../ui/button'

type RFMAnalysisQueryParamsMenuProps = {
  queryParams: TClientSearchQueryParams
  updateQueryParams: (newParams: Partial<TClientSearchQueryParams>) => void
  closeMenu: () => void
}
function RFMAnalysisQueryParamsMenu({ queryParams, updateQueryParams, closeMenu }: RFMAnalysisQueryParamsMenuProps) {
  const [queryParamsHolder, setQueryParamsHolder] = useState<TClientSearchQueryParams>(queryParams)

  return (
    <Sheet open onOpenChange={closeMenu}>
      <SheetContent>
        <div className="flex h-full w-full flex-col">
          <SheetHeader>
            <SheetTitle>FILTRAR CLIENTES</SheetTitle>
            <SheetDescription>Escolha aqui parâmetros para filtrar os clientes.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
            <div className="flex w-full flex-col gap-2">
              <TextInput
                label="NOME"
                value={queryParamsHolder.name}
                placeholder={'Preenha aqui o nome do cliente para filtro.'}
                handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, name: value }))}
                width={'100%'}
              />
              <TextInput
                label="TELEFONE"
                value={queryParamsHolder.phone}
                placeholder={'Preenha aqui o telefone do cliente para filtro.'}
                handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, phone: value }))}
                width={'100%'}
              />

              <MultipleSelectInput
                label="CANAL DE AQUISIÇÃO"
                selected={queryParamsHolder.acquisitionChannels}
                options={CustomersAcquisitionChannels.map((s, index) => ({ id: index + 1, label: s.label, value: s.value })) || []}
                handleChange={(value) =>
                  setQueryParamsHolder((prev) => ({
                    ...prev,
                    acquisitionChannels: value as string[],
                  }))
                }
                selectedItemLabel="CANAL DE AQUISIÇÃO"
                onReset={() => setQueryParamsHolder((prev) => ({ ...prev, acquisitionChannels: [] }))}
                width="100%"
              />
              <MultipleSelectInput
                label="CATEGORIA DE CLIENTES"
                selected={queryParamsHolder.rfmTitles}
                options={RFMLabels.map((s, index) => ({ id: index + 1, label: s.text, value: s.text })) || []}
                handleChange={(value) =>
                  setQueryParamsHolder((prev) => ({
                    ...prev,
                    rfmTitles: value as string[],
                  }))
                }
                selectedItemLabel="CATEGORIA DE CLIENTES"
                onReset={() => setQueryParamsHolder((prev) => ({ ...prev, rfmTitles: [] }))}
                width="100%"
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

export default RFMAnalysisQueryParamsMenu
