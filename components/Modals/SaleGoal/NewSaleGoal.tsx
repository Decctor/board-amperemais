import { TUser, TUserSession } from '@/schemas/users'
import React, { useState } from 'react'
import { VscChromeClose } from 'react-icons/vsc'
import * as Dialog from '@radix-ui/react-dialog'
import TextInput from '@/components/Inputs/TextInput'
import SelectInput from '@/components/Inputs/SelectInput'
import { useSaleQueryFilterOptions } from '@/lib/queries/stats/utils'
import { LoadingButton } from '@/components/loading-button'
import { useMutationWithFeedback } from '@/lib/mutations/common'
import { createUser } from '@/lib/mutations/users'
import { useQueryClient } from '@tanstack/react-query'
import { TSaleGoal } from '@/schemas/sale-goals'
import dayjs from 'dayjs'
import { getMonthLabel, Months } from '@/utils/constants'
import NumberInput from '@/components/Inputs/NumberInput'
import { createGoal } from '@/lib/mutations/goals'

function getMonthGeralInformation({ year, month }: { year: number; month: number }) {
  // Ajusta o mês para o formato esperado pelo DayJS (0-11)
  const adjustedMonth = month - 1

  // Cria uma data com o ano e mês fornecidos
  const date = dayjs().year(year).month(adjustedMonth)

  const days = date.daysInMonth()
  const initialDay = date.startOf('month').toISOString()
  const finalDay = date.endOf('month').toISOString()

  return {
    dias: days,
    inicio: initialDay,
    fim: finalDay,
  }
}
function generateYearList(year: number): string[] {
  const startYear = 2022
  const endYear = year + 5
  const yearList: string[] = []

  for (let i = startYear; i <= endYear; i++) {
    yearList.push(i.toString())
  }

  return yearList
}
const currentYear = new Date().getFullYear()
type NewSaleGoalProps = {
  session: TUserSession
  closeModal: () => void
}
function NewSaleGoal({ session, closeModal }: NewSaleGoalProps) {
  const queryClient = useQueryClient()
  const [infoHolder, setInfoHolder] = useState<TSaleGoal>({
    ano: currentYear,
    inicio: dayjs(currentYear).startOf('year').toISOString(),
    fim: dayjs(currentYear).endOf('year').toISOString(),
    meses: {
      '1': { ...getMonthGeralInformation({ year: currentYear, month: 1 }), vendas: 0 },
      '2': { ...getMonthGeralInformation({ year: currentYear, month: 2 }), vendas: 0 },
      '3': { ...getMonthGeralInformation({ year: currentYear, month: 3 }), vendas: 0 },
      '4': { ...getMonthGeralInformation({ year: currentYear, month: 4 }), vendas: 0 },
      '5': { ...getMonthGeralInformation({ year: currentYear, month: 5 }), vendas: 0 },
      '6': { ...getMonthGeralInformation({ year: currentYear, month: 6 }), vendas: 0 },
      '7': { ...getMonthGeralInformation({ year: currentYear, month: 7 }), vendas: 0 },
      '8': { ...getMonthGeralInformation({ year: currentYear, month: 8 }), vendas: 0 },
      '9': { ...getMonthGeralInformation({ year: currentYear, month: 9 }), vendas: 0 },
      '10': { ...getMonthGeralInformation({ year: currentYear, month: 10 }), vendas: 0 },
      '11': { ...getMonthGeralInformation({ year: currentYear, month: 11 }), vendas: 0 },
      '12': { ...getMonthGeralInformation({ year: currentYear, month: 12 }), vendas: 0 },
    },
    dataInsercao: new Date().toISOString(),
  })

  const { mutate, isPending } = useMutationWithFeedback({
    mutationKey: ['create-user'],
    mutationFn: createGoal,
    queryClient: queryClient,
    affectedQueryKey: ['goals'],
  })
  return (
    <Dialog.Root open onOpenChange={closeModal}>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-primary/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] h-[80%] w-[90%] translate-x-[-50%] translate-y-[-50%] rounded-md bg-background p-[10px] lg:h-[80%] lg:w-[40%]">
        <div className="flex h-full w-full flex-col">
          <div className="flex flex-col items-center justify-between border-b border-gray-200 px-2 pb-2 text-lg lg:flex-row">
            <h3 className="text-sm font-bold lg:text-xl">NOVA META</h3>
            <button
              onClick={() => closeModal()}
              type="button"
              className="flex items-center justify-center rounded-lg p-1 duration-300 ease-linear hover:scale-105 hover:bg-red-200"
            >
              <VscChromeClose style={{ color: 'red' }} />
            </button>
          </div>
          <div className="scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 flex grow flex-col gap-y-2 overflow-y-auto overscroll-y-auto p-2 py-1">
            <SelectInput
              value={infoHolder.ano}
              options={generateYearList(currentYear).map((s) => ({ id: s, label: s, value: Number(s) }))}
              label="ANO DE REFERÊNCIA"
              selectedItemLabel="NÃO DEFINIDO"
              onReset={() =>
                setInfoHolder((prev) => ({
                  ...prev,
                  ano: currentYear,
                  inicio: dayjs(currentYear).startOf('year').toISOString(),
                  fim: dayjs(currentYear).endOf('year').toISOString(),
                  meses: {
                    '1': { ...getMonthGeralInformation({ year: currentYear, month: 1 }), vendas: 0 },
                    '2': { ...getMonthGeralInformation({ year: currentYear, month: 2 }), vendas: 0 },
                    '3': { ...getMonthGeralInformation({ year: currentYear, month: 3 }), vendas: 0 },
                    '4': { ...getMonthGeralInformation({ year: currentYear, month: 4 }), vendas: 0 },
                    '5': { ...getMonthGeralInformation({ year: currentYear, month: 5 }), vendas: 0 },
                    '6': { ...getMonthGeralInformation({ year: currentYear, month: 6 }), vendas: 0 },
                    '7': { ...getMonthGeralInformation({ year: currentYear, month: 7 }), vendas: 0 },
                    '8': { ...getMonthGeralInformation({ year: currentYear, month: 8 }), vendas: 0 },
                    '9': { ...getMonthGeralInformation({ year: currentYear, month: 9 }), vendas: 0 },
                    '10': { ...getMonthGeralInformation({ year: currentYear, month: 10 }), vendas: 0 },
                    '11': { ...getMonthGeralInformation({ year: currentYear, month: 11 }), vendas: 0 },
                    '12': { ...getMonthGeralInformation({ year: currentYear, month: 12 }), vendas: 0 },
                  },
                }))
              }
              handleChange={(value) =>
                setInfoHolder((prev) => ({
                  ...prev,
                  ano: value,
                  inicio: dayjs(value).startOf('year').toISOString(),
                  fim: dayjs(value).endOf('year').toISOString(),
                  meses: {
                    '1': { ...getMonthGeralInformation({ year: value, month: 1 }), vendas: 0 },
                    '2': { ...getMonthGeralInformation({ year: value, month: 2 }), vendas: 0 },
                    '3': { ...getMonthGeralInformation({ year: value, month: 3 }), vendas: 0 },
                    '4': { ...getMonthGeralInformation({ year: value, month: 4 }), vendas: 0 },
                    '5': { ...getMonthGeralInformation({ year: value, month: 5 }), vendas: 0 },
                    '6': { ...getMonthGeralInformation({ year: value, month: 6 }), vendas: 0 },
                    '7': { ...getMonthGeralInformation({ year: value, month: 7 }), vendas: 0 },
                    '8': { ...getMonthGeralInformation({ year: value, month: 8 }), vendas: 0 },
                    '9': { ...getMonthGeralInformation({ year: value, month: 9 }), vendas: 0 },
                    '10': { ...getMonthGeralInformation({ year: value, month: 10 }), vendas: 0 },
                    '11': { ...getMonthGeralInformation({ year: value, month: 11 }), vendas: 0 },
                    '12': { ...getMonthGeralInformation({ year: value, month: 12 }), vendas: 0 },
                  },
                }))
              }
              width="100%"
            />
            <div className="flex w-full flex-col items-center gap-2">
              <h1 className="text-center w-full tracking-tight leading-none text-xs my-2 font-medium">Metas Mensais</h1>
              {Months.map((month) => (
                <div key={month.label} className="w-full flex flex-col border border-primary gap-2 rounded-lg overflow-hidden">
                  <h1 className="w-full p-1 bg-black text-center text-white font-medium tracking-tight text-xs">Meta do mês de {month.label}</h1>
                  <div className="w-full flex items-center justify-center p-2">
                    <NumberInput
                      label={`META DE VENDAS DE ${getMonthLabel(month.value).toUpperCase()}`}
                      value={infoHolder.meses[month.value.toString() as keyof TSaleGoal['meses']].vendas}
                      handleChange={(value) => {
                        setInfoHolder((prev) => ({
                          ...prev,
                          meses: {
                            ...prev.meses,
                            [month.value.toString()]: {
                              ...prev.meses[month.value.toString() as keyof TSaleGoal['meses']],
                              vendas: value,
                            },
                          },
                        }))
                      }}
                      placeholder="Preencha aqui a meta de vendas para o mês em questão..."
                      width="100%"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex w-full items-end justify-end">
            <LoadingButton
              onClick={() => {
                // @ts-ignore
                mutate(infoHolder)
              }}
              loading={isPending}
            >
              CRIAR META
            </LoadingButton>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default NewSaleGoal
