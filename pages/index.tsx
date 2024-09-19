import Image from 'next/image'
import { Inter } from 'next/font/google'
import { useState } from 'react'
import DateInput from '@/components/Inputs/DateInput'
import { formatDateForInput, formatDateInputChange, formatDecimalPlaces, formatLongString, formatToMoney } from '@/lib/formatting'
import { getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/dates'
import { useGeneralSalesStats } from '@/lib/queries/stats/general'
import LoadingComponent from '@/components/Layouts/LoadingComponent'
import ErrorComponent from '@/components/Layouts/ErrorComponent'
import { getErrorMessage } from '@/lib/errors'
import { VscDiffAdded } from 'react-icons/vsc'
import { BsCart, BsFileEarmarkText, BsFillFileBarGraphFill, BsTicketPerforated } from 'react-icons/bs'
import { FaLayerGroup, FaPercent } from 'react-icons/fa'
import { FaRankingStar } from 'react-icons/fa6'
import { TGeneralSalesStats } from './api/stats/sales-dashboard'
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { useSalesGraph } from '@/lib/queries/stats/sales-graph'
import { before } from 'node:test'
import { TIntervalGrouping } from '@/utils/graphs'
import { cn } from '@/lib/utils'
const currentDate = new Date()
const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()
const lastDayOfMonth = getLastDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()

export default function Home() {
  const [queryFilters, setQueryFilters] = useState<{ period: { after: string; before: string } }>({
    period: {
      after: firstDayOfMonth,
      before: lastDayOfMonth,
    },
  })
  const { data: stats, isLoading, isError, isSuccess, error } = useGeneralSalesStats({ after: queryFilters.period.after, before: queryFilters.period.before })
  console.log(stats)
  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-[#f8f9fa] p-6">
        <div className="flex w-full flex-col items-center justify-between border-b border-primary pb-2 lg:flex-row">
          <h1 className="font-Raleway text-2xl font-black text-black">DASHBOARD</h1>
          <div className="flex w-full flex-col lg:w-fit">
            <div className="flex flex-col items-center gap-2 lg:flex-row">
              <div className="w-full lg:w-[150px]">
                <DateInput
                  label="PERÍODO"
                  showLabel={false}
                  value={formatDateForInput(queryFilters.period.after)}
                  handleChange={(value) =>
                    setQueryFilters((prev) => ({
                      ...prev,
                      period: {
                        ...prev.period,
                        after: formatDateInputChange(value) || firstDayOfMonth,
                      },
                    }))
                  }
                  width="100%"
                />
              </div>
              <div className="w-full lg:w-[150px]">
                <DateInput
                  label="PERÍODO"
                  showLabel={false}
                  value={formatDateForInput(queryFilters.period.before)}
                  handleChange={(value) =>
                    setQueryFilters((prev) => ({
                      ...prev,
                      period: {
                        ...prev.period,
                        before: formatDateInputChange(value) || lastDayOfMonth,
                      },
                    }))
                  }
                  width="100%"
                />
              </div>
            </div>
          </div>
        </div>
        {isLoading ? <LoadingComponent /> : null}
        {isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
        {isSuccess ? (
          <div className="w-full flex flex-col grow gap-2 py-2">
            <div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
              <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
                <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
                  <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Número de Vendas</h1>
                  <VscDiffAdded size={12} />
                </div>
                <div className="px-6 py-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{stats.qtdeVendas}</div>
                </div>
              </div>
              <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
                <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
                  <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Faturamento</h1>
                  <BsFileEarmarkText size={12} />
                </div>
                <div className="flex w-full flex-col py-2 px-6">
                  <div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats.faturamentoBruto)}</div>
                  <p className="text-xs text-green-500 font-bold lg:text-[0.7rem]">{formatToMoney(stats.faturamentoLiquido)} líquidos</p>
                </div>
              </div>
              <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
                <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
                  <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Margem</h1>
                  <FaPercent size={12} />
                </div>
                <div className="px-6 py-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatDecimalPlaces((100 * stats.faturamentoLiquido) / stats.faturamentoBruto)}%</div>
                </div>
              </div>
              <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
                <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
                  <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Ticket Médio</h1>
                  <BsTicketPerforated size={12} />
                </div>
                <div className="px-6 py-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats.ticketMedio)}</div>
                </div>
              </div>
              <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
                <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
                  <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Valor Diário Vendido</h1>
                  <BsCart size={12} />
                </div>
                <div className="px-6 py-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats.valorDiarioVendido)}</div>
                </div>
              </div>
              <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm lg:w-1/6 overflow-hidden">
                <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
                  <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">Média de Itens por Venda</h1>
                  <BsCart size={12} />
                </div>
                <div className="px-6 py-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatDecimalPlaces(stats.itensPorVendaMedio)}</div>
                </div>
              </div>
            </div>
            <div className="w-full flex flex-col items-center gap-2 lg:flex-row">
              <div className="w-full lg:w-[60%]">
                <SalesGraph />
              </div>
              <div className="w-full lg:w-[40%]">
                <SellersGraph data={stats.porVendedor} />
              </div>
            </div>
            <div className="w-full flex flex-col items-center gap-2 lg:flex-row">
              <div className="w-full lg:w-[50%]">
                <ProductNameGraph data={stats.porItem} />
              </div>
              <div className="w-full lg:w-[50%]">
                <ProductGroupsGraph data={stats.porGrupo} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SellersGraph({ data }: { data: TGeneralSalesStats['porVendedor'] }) {
  const chartConfig = {
    total: {
      label: 'Valor Vendido',
      color: '#fead41',
    },
  } satisfies ChartConfig
  return (
    <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
      <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
        <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RANKING DE VENDEDORES</h1>
        <FaRankingStar size={12} />
      </div>
      <div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] max-h-[450px]">
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data} layout="vertical">
            <XAxis type="number" dataKey="total" hide />
            <YAxis dataKey="titulo" type="category" tickLine={false} tickMargin={0} axisLine={false} tickFormatter={(value) => value.slice(0, 36)} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="total" fill="#15599a" radius={5}>
              <LabelList
                dataKey="total"
                position="right"
                offset={8}
                className="fill-foreground text-[0.5rem]"
                formatter={(value: any) => formatToMoney(value)}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}

function SalesGraph() {
  const [params, setParams] = useState<{ type: 'total' | 'qtde'; period: { after: string; before: string }; group: TIntervalGrouping }>({
    type: 'total',
    period: {
      after: firstDayOfMonth,
      before: lastDayOfMonth,
    },
    group: 'DIA',
  })
  const { data: graph } = useSalesGraph({ after: params.period.after, before: params.period.before, group: params.group })
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
  return (
    <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
      <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
        <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">GRÁFICO DE VENDAS</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setParams((prev) => ({ ...prev, type: 'total' }))}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded',
              params.type == 'total' ? 'bg-black text-white' : 'bg-transparent text-black'
            )}
          >
            VALOR
          </button>
          <button
            onClick={() => setParams((prev) => ({ ...prev, type: 'qtde' }))}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-black rounded',
              params.type == 'qtde' ? 'bg-black text-white' : 'bg-transparent text-black'
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
            <Bar dataKey={params.type} fill="#15599a" radius={8} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}

function ProductGroupsGraph({ data }: { data: TGeneralSalesStats['porGrupo'] }) {
  const Collors = ['#15599a', '#fead41', '#ff595e', '#8ac926', '#6a4c93', '#5adbff']
  const graphData = data
    .filter((d) => d.qtde > 100)
    .sort((a, b) => b.qtde - a.qtde)
    .map((p, index) => ({ ...p, fill: Collors[index] || '#000' }))
  const projectTypesChartConfig = { titulo: { label: 'GRUPO' } }
  console.log('TEST')
  return (
    <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
      <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
        <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">PARTICIPAÇÃO POR GRUPO</h1>
        <FaLayerGroup size={12} />
      </div>
      <div className="px-6 py-2 flex w-full flex-col gap-2 h-[350px] max-h-[350px]">
        <ChartContainer config={projectTypesChartConfig} className="h-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={graphData} dataKey="qtde" nameKey="titulo" innerRadius={60} strokeWidth={5}></Pie>
            <ChartLegend content={<ChartLegendContent color="#000" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  )
}
function ProductNameGraph({ data }: { data: TGeneralSalesStats['porItem'] }) {
  return (
    <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
      <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
        <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">PARTICIPAÇÃO POR ITEM</h1>
        <BsCart size={12} />
      </div>
      <div className="px-6 py-2 flex w-full flex-col gap-3 h-[350px] max-h-[350px] scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 overflow-y-auto overscroll-y-auto">
        {data.map((d, index) => (
          <div key={index} className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center border border-primary">
                <BsCart size={10} />
              </div>
              <h1 className="hidden lg:block text-[0.6rem] lg:text-xs tracking-tight font-medium">{d.titulo}</h1>
              <h1 className="block lg:hidden text-[0.6rem] lg:text-xs tracking-tight font-medium">{formatLongString(d.titulo, 25)}</h1>
            </div>
            <h1 className="text-xs lg:text-base font-black">{formatToMoney(d.total)}</h1>
          </div>
        ))}
      </div>
    </div>
  )
}
