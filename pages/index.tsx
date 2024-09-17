import Image from 'next/image'
import { Inter } from 'next/font/google'
import { useState } from 'react'
import DateInput from '@/components/Inputs/DateInput'
import { formatDateForInput, formatDateInputChange, formatDecimalPlaces, formatToMoney } from '@/lib/formatting'
import { getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/dates'
import { useGeneralSalesStats } from '@/lib/queries/stats/general'
import LoadingComponent from '@/components/Layouts/LoadingComponent'
import ErrorComponent from '@/components/Layouts/ErrorComponent'
import { getErrorMessage } from '@/lib/errors'
import { VscDiffAdded } from 'react-icons/vsc'
import { BsCart, BsFileEarmarkText, BsTicketPerforated } from 'react-icons/bs'
import { FaPercent } from 'react-icons/fa'
import { TGeneralSalesStats } from './api/stats/sales-dashboard'
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, Label, LabelList, Pie, PieChart, XAxis, YAxis } from 'recharts'
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
  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-[#f8f9fa] p-6">
        <div className="flex w-full flex-col items-center justify-between border-b border-primary/30 pb-2 lg:flex-row">
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
              <div className="flex min-h-[125px] w-full flex-col rounded-xl border border-primary/30 bg-[#fff] p-6 shadow-sm lg:w-1/6">
                <div className="flex items-center justify-between">
                  <h1 className="text-sm font-medium uppercase tracking-tight">Número de Vendas</h1>
                  <VscDiffAdded />
                </div>
                <div className="mt-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{stats.qtdeVendas}</div>
                </div>
              </div>
              <div className="flex min-h-[125px] w-full flex-col rounded-xl border border-primary/30 bg-[#fff] p-6 shadow-sm lg:w-1/6">
                <div className="flex items-center justify-between">
                  <h1 className="text-sm font-medium uppercase tracking-tight">Faturamento</h1>
                  <BsFileEarmarkText />
                </div>
                <div className="mt-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats.faturamentoBruto)}</div>
                  <p className="text-xs text-gray-500 lg:text-[0.6rem]">{formatToMoney(stats.faturamentoLiquido)} líquidos</p>
                </div>
              </div>
              <div className="flex min-h-[125px] w-full flex-col rounded-xl border border-primary/30 bg-[#fff] p-6 shadow-sm lg:w-1/6">
                <div className="flex items-center justify-between">
                  <h1 className="text-sm font-medium uppercase tracking-tight">Margem</h1>
                  <FaPercent />
                </div>
                <div className="mt-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatDecimalPlaces((100 * stats.faturamentoLiquido) / stats.faturamentoBruto)}</div>
                </div>
              </div>
              <div className="flex min-h-[125px] w-full flex-col rounded-xl border border-primary/30 bg-[#fff] p-6 shadow-sm lg:w-1/6">
                <div className="flex items-center justify-between">
                  <h1 className="text-sm font-medium uppercase tracking-tight">Ticket Médio</h1>
                  <BsTicketPerforated />
                </div>
                <div className="mt-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatToMoney(stats.ticketMedio)}</div>
                </div>
              </div>
              <div className="flex min-h-[125px] w-full flex-col rounded-xl border border-primary/30 bg-[#fff] p-6 shadow-sm lg:w-1/6">
                <div className="flex items-center justify-between">
                  <h1 className="text-sm font-medium uppercase tracking-tight">Média de Itens por Venda</h1>
                  <BsCart />
                </div>
                <div className="mt-2 flex w-full flex-col">
                  <div className="text-xl font-bold text-[#15599a]">{formatDecimalPlaces(stats.itensPorVendaMedio)}</div>
                </div>
              </div>
            </div>
            <SellersGraph data={stats.porVendedor} />
            <ProductGroupsGraph data={stats.porGrupo} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SellersGraph({ data }: { data: TGeneralSalesStats['porVendedor'] }) {
  return (
    <div className="w-[550px] flex flex-col border border-primary/30 shadow-sm rounded-xl bg-[#fff] dark:bg-[#121212] p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium uppercase tracking-tight">Ranking de Vendedores</h1>
        <BsTicketPerforated />
      </div>
      <ChartContainer config={{}}>
        <BarChart accessibilityLayer data={data} layout="vertical">
          <XAxis type="number" dataKey="total" hide />
          <YAxis dataKey="titulo" type="category" tickLine={false} tickMargin={0} axisLine={false} tickFormatter={(value) => value.slice(0, 36)} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="total" fill="#fead41" radius={5}>
            <LabelList dataKey="total" position="right" offset={8} className="fill-foreground text-[0.5rem]" formatter={(value) => formatToMoney(value)} />
          </Bar>
        </BarChart>
      </ChartContainer>
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

  return (
    <div className="w-[550px] flex flex-col border border-primary/30 shadow-sm rounded-xl bg-[#fff] dark:bg-[#121212] p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium uppercase tracking-tight">Ranking de Grupos de Item</h1>
        <BsTicketPerforated />
      </div>
      <ChartContainer config={projectTypesChartConfig}>
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie data={graphData} dataKey="qtde" nameKey="titulo" innerRadius={35} strokeWidth={12}></Pie>
          <ChartLegend content={<ChartLegendContent color="#000" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
        </PieChart>
      </ChartContainer>
    </div>
  )
}
