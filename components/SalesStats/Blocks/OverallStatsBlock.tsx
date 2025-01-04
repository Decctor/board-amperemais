import { formatDecimalPlaces, formatToMoney } from '@/lib/formatting'
import { useOverallSalesStats } from '@/lib/queries/stats/overall'
import { TSaleStatsGeneralQueryParams } from '@/schemas/query-params-utils'
import { TUserSession } from '@/schemas/users'
import React, { useEffect, useState } from 'react'
import { BsCart } from 'react-icons/bs'
import { FaPercent } from 'react-icons/fa'
import { BsFileEarmarkText, BsTicketPerforated } from 'react-icons/bs'
import { VscDiffAdded } from 'react-icons/vsc'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'

type OverallStatsBlockProps = {
  user: TUserSession
  generalQueryParams: TSaleStatsGeneralQueryParams
}
function OverallStatsBlock({ user, generalQueryParams }: OverallStatsBlockProps) {
  const userViewPermission = user.visualizacao
  const [queryParams, setQueryParams] = useState<TSaleStatsGeneralQueryParams>(generalQueryParams)

  const [debouncedQueryParams] = useDebounce(queryParams, 1000)

  const { data: overallStats, isLoading: overallStatsLoading } = useOverallSalesStats(debouncedQueryParams)
  useEffect(() => {
    setQueryParams(generalQueryParams)
  }, [generalQueryParams])
  return (
    <div className="w-full flex flex-col gap-2 py-2">
      <div className="w-full flex flex-col gap-1 rounded-xl border border-primary shadow-sm  overflow-hidden">
        <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white ">
          <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">ACOMPANHAMENTO DE META DO PERÍODO</h1>
          <VscDiffAdded size={12} />
        </div>
        <div className="w-full flex items-center justify-center p-2">
          <GoalTrackingBar
            barBgColor="bg-gradient-to-r from-yellow-200 to-amber-400"
            goalText={`${overallStats?.faturamentoMeta || '...'}`}
            barHeigth="25px"
            valueGoal={overallStats?.faturamentoMeta || 0}
            valueHit={overallStats?.faturamentoBruto || 0}
            formattedValueGoal={formatToMoney(overallStats?.faturamentoMeta || 0)}
            formattedValueHit={formatToMoney(overallStats?.faturamentoBruto || 0)}
          />
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
        <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
          <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
            <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Número de Vendas</h1>
            <VscDiffAdded size={12} />
          </div>
          <div className="px-6 py-2 flex w-full flex-col">
            <div className="text-xl font-bold text-[#15599a]">{overallStats?.qtdeVendas}</div>
          </div>
        </div>
        <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
          <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
            <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Faturamento</h1>
            <BsFileEarmarkText size={12} />
          </div>
          <div className="flex w-full flex-col py-2 px-6">
            <div className="text-xl font-bold text-[#15599a]">{formatToMoney(overallStats?.faturamentoBruto || 0)}</div>
            {userViewPermission == 'GERAL' ? (
              <p className="text-xs text-green-500 font-bold lg:text-[0.7rem]">{formatToMoney(overallStats?.faturamentoLiquido || 0)} líquidos</p>
            ) : null}
          </div>
        </div>
        {userViewPermission == 'GERAL' ? (
          <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
            <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
              <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Margem</h1>
              <FaPercent size={12} />
            </div>
            <div className="px-6 py-2 flex w-full flex-col">
              <div className="text-xl font-bold text-[#15599a]">
                {formatDecimalPlaces((100 * (overallStats?.faturamentoLiquido || 0)) / (overallStats?.faturamentoBruto || 0))}%
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
          <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
            <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Ticket Médio</h1>
            <BsTicketPerforated size={12} />
          </div>
          <div className="px-6 py-2 flex w-full flex-col">
            <div className="text-xl font-bold text-[#15599a]">{formatToMoney(overallStats?.ticketMedio || 0)}</div>
          </div>
        </div>
        <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
          <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
            <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Valor Diário Vendido</h1>
            <BsCart size={12} />
          </div>
          <div className="px-6 py-2 flex w-full flex-col">
            <div className="text-xl font-bold text-[#15599a]">{formatToMoney(overallStats?.valorDiarioVendido || 0)}</div>
          </div>
        </div>
        <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
          <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
            <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Média de Itens por Venda</h1>
            <BsCart size={12} />
          </div>
          <div className="px-6 py-2 flex w-full flex-col">
            <div className="text-xl font-bold text-[#15599a]">{formatDecimalPlaces(overallStats?.itensPorVendaMedio || 0)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverallStatsBlock

type GoalTrackingBarProps = {
  valueGoal?: number
  valueHit: number
  formattedValueGoal?: string
  formattedValueHit?: string
  goalText: string
  barHeigth: string
  barBgColor: string
}
function GoalTrackingBar({ valueGoal, valueHit, formattedValueGoal, formattedValueHit, goalText, barHeigth, barBgColor }: GoalTrackingBarProps) {
  function getPercentage({ goal, hit }: { goal: number | undefined; hit: number | undefined }) {
    if (!hit || hit == 0) return '0%'
    if (!goal && hit) return '100%'
    if (goal && !hit) return '0%'
    if (goal && hit) {
      var percentage = ((hit / goal) * 100).toFixed(2)
      return `${percentage}%`
    }
    // return `${(Math.random() * 100).toFixed(2)}%`
  }
  function getWidth({ goal, hit }: { goal: number | undefined; hit: number | undefined }) {
    if (!hit || hit == 0) return '0%'
    if (!goal && hit) return '100%'
    if (goal && !hit) return '0%'
    if (goal && hit) {
      var percentage: number | string = (hit / goal) * 100
      percentage = percentage > 100 ? 100 : percentage.toFixed(2)
      return `${percentage}%`
    }
    // return `${(Math.random() * 100).toFixed(2)}%`
  }

  return (
    <div className="flex w-full items-center gap-1">
      <div className="flex grow gap-2">
        <div className="grow">
          <div
            style={{ width: getWidth({ goal: valueGoal, hit: valueHit }), height: barHeigth }}
            className={cn('flex items-center justify-center rounded-sm text-xs text-white shadow-sm', barBgColor)}
          ></div>
        </div>
      </div>
      <div className="flex min-w-[70px] flex-col items-end justify-end lg:min-w-[100px]">
        <p className="text-xs font-medium uppercase tracking-tight lg:text-sm">{getPercentage({ goal: valueGoal, hit: valueHit })}</p>
        <p className="text-[0.5rem] italic text-gray-500 lg:text-[0.65rem]">
          <strong>{formattedValueHit || valueHit?.toLocaleString('pt-br', { maximumFractionDigits: 2 }) || 0}</strong> de{' '}
          <strong>{formattedValueGoal || valueGoal?.toLocaleString('pt-br', { maximumFractionDigits: 2 }) || 0}</strong>{' '}
        </p>
      </div>
    </div>
  )
}
