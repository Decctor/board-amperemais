import { getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/dates'
import { useSalesGraph } from '@/lib/queries/stats/sales-graph'
import { TSalesGraphFilters } from '@/schemas/query-params-utils'
import React, { useEffect, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import { cn } from '@/lib/utils'
import { BsFillFileBarGraphFill } from 'react-icons/bs'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts'

const currentDate = new Date()
const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()
const lastDayOfMonth = getLastDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()
type SalesGraphProps = {
  period: {
    after: string
    before: string
  }
  total: { min?: number | null; max?: number | null }
  sellers: string[]
  saleNatures: TSalesGraphFilters['saleNatures']
}
function SalesGraph({ period, total, sellers, saleNatures }: SalesGraphProps) {
  const [type, setType] = useState<'total' | 'qtde'>('total')
  const [filters, setFilters] = useState<TSalesGraphFilters>({
    period: { after: period.after || firstDayOfMonth, before: period.before || lastDayOfMonth },
    total: {},
    group: 'DIA',
    saleNatures: saleNatures,
    sellers: sellers,
  })
  const [filtersDebounced] = useDebounce(filters, 1000)

  const { data: graph } = useSalesGraph({ ...filtersDebounced })

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
    setFilters((prev) => ({ ...prev, period, total, sellers, saleNatures }))
  }, [period, total, sellers, saleNatures])
  return (
    <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
      <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
        <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setType('total')}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded',
              type == 'total' ? 'bg-black text-white' : 'bg-transparent text-black'
            )}
          >
            VALOR
          </button>
          <button
            onClick={() => setType('qtde')}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded',
              type == 'qtde' ? 'bg-black text-white' : 'bg-transparent text-black'
            )}
          >
            QUANTIDADE
          </button>
          <BsFillFileBarGraphFill size={12} />
        </div>
      </div>
      <div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] max-h-[450px]">
        <ChartContainer className="w-full h-full" config={chartConfig}>
          <BarChart accessibilityLayer data={graph || []}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="chave" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 12)} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey={type} fill="#15599a" radius={8} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}

export default SalesGraph
