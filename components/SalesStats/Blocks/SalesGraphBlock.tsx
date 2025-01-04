import { useSalesGraph } from '@/lib/queries/stats/sales-graph'
import { cn } from '@/lib/utils'
import { TSalesGraphFilters, TSaleStatsGeneralQueryParams } from '@/schemas/query-params-utils'
import { TUserSession } from '@/schemas/users'
import React, { useEffect, useState } from 'react'
import { BsFillFileBarGraphFill } from 'react-icons/bs'
import { useDebounce } from 'use-debounce'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts'

type SalesGraphBlockProps = {
  user: TUserSession
  generalQueryParams: TSaleStatsGeneralQueryParams
}
function SalesGraphBlock({ user, generalQueryParams }: SalesGraphBlockProps) {
  const userViewPermission = user.visualizacao
  const [graphMetric, setGraphMetric] = useState<'total' | 'qtde'>('total')
  const [queryParams, setQueryParams] = useState<TSalesGraphFilters>({ ...generalQueryParams, group: 'DIA' })

  const [debouncedQueryParams] = useDebounce(queryParams, 1000)

  const { data: salesGraph, isLoading: salesGraphLoading } = useSalesGraph(debouncedQueryParams)

  const chartConfig = {
    total: {
      label: 'Valor Vendido',
      color: '#fead41',
    },
    qtde: {
      label: 'Qtde de Vendas',
      color: '#fead41',
    },
  } satisfies ChartConfig
  useEffect(() => {
    setQueryParams((prev) => ({ ...prev, ...generalQueryParams }))
  }, [generalQueryParams])
  return (
    <div className="w-full flex flex-col gap-2 py-2">
      <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
        <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
          <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGraphMetric('total')}
              className={cn(
                'px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded',
                graphMetric == 'total' ? 'bg-black text-white' : 'bg-transparent text-black'
              )}
            >
              VALOR
            </button>
            <button
              onClick={() => setGraphMetric('qtde')}
              className={cn(
                'px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded',
                graphMetric == 'qtde' ? 'bg-black text-white' : 'bg-transparent text-black'
              )}
            >
              QUANTIDADE
            </button>
            <BsFillFileBarGraphFill size={12} />
          </div>
        </div>
        <div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] max-h-[450px]">
          <ChartContainer className="w-full h-full" config={chartConfig}>
            <BarChart accessibilityLayer data={salesGraph || []}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="chave" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 12)} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey={graphMetric} fill="#15599a" radius={8} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}

export default SalesGraphBlock
