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
import { BsCart, BsFileEarmarkText, BsTicketPerforated } from 'react-icons/bs'
import { FaLayerGroup, FaPercent } from 'react-icons/fa'
import { FaRankingStar } from 'react-icons/fa6'
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, LabelList, Pie, PieChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'

import { cn } from '@/lib/utils'

import { TGeneralSalesStats } from '@/pages/api/stats/sales-dashboard'
import { TUserSession } from '@/schemas/users'

import { useSaleQueryFilterOptions } from '@/lib/queries/stats/utils'
import MultipleSelectInput from '../Inputs/MultipleSelectInput'
import { TSale } from '@/schemas/sales'
import NumberInput from '../Inputs/NumberInput'
import { TSalesGeneralStatsFilters } from '@/schemas/query-params-utils'
import { useDebounce } from 'use-debounce'
import MatrixRFMAnalysis from './MatrixRFMAnalysis'
import SalesGraph from './SalesGraph'
import Header from '../Layouts/Header'
import { RFMLabels } from '@/utils/rfm'
import MultipleSalesSelectInput from '../Inputs/SelectMultipleSalesInput'
const currentDate = new Date()
const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()
const lastDayOfMonth = getLastDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()

type DashboardPageProps = {
  user: TUserSession
}
export default function DashboardPage({ user }: DashboardPageProps) {
  const userViewPermission = user.visualizacao
  const [filters, setFilters] = useState<TSalesGeneralStatsFilters>({
    period: {
      after: firstDayOfMonth,
      before: lastDayOfMonth,
    },
    total: {},
    saleNatures: [],
    sellers: userViewPermission == 'GERAL' ? [] : [user.vendedor],
    clientRFMTitles: [],
    productGroups: [],
    excludedSalesIds: [],
  })
  const [filtersDebounced] = useDebounce(filters, 1000)

  const { data: stats, isLoading, isError, isSuccess, error } = useGeneralSalesStats({ ...filtersDebounced })
  const { data: filterOptions } = useSaleQueryFilterOptions()

  const selectableSellers = userViewPermission == 'GERAL' ? filterOptions?.sellers || [] : [user.vendedor]
  return (
    <div className="flex h-full flex-col">
      <Header session={user} />
      <div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-[#f8f9fa] p-6">
        <div className="flex w-full flex-col justify-between border-b border-primary pb-2 gap-2">
          <h1 className="text-2xl font-black text-black">Dashboard</h1>
          <div className="flex flex-col items-center gap-2 lg:flex-row flex-wrap justify-center lg:justify-end">
            <div className="w-full lg:w-[250px]">
              <NumberInput
                label="VALOR MÁX"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                placeholder="Valor máximo..."
                value={filters.total.max || null}
                handleChange={(value) => setFilters((prev) => ({ ...prev, total: { ...prev.total, max: value } }))}
                width="100%"
              />
            </div>
            <div className="w-full lg:w-[250px]">
              <NumberInput
                label="VALOR MIN"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                placeholder="Valor mínimo..."
                value={filters.total.min || null}
                handleChange={(value) => setFilters((prev) => ({ ...prev, total: { ...prev.total, min: value } }))}
                width="100%"
              />
            </div>
            <div className="w-full lg:w-[250px]">
              <MultipleSelectInput
                label="VENDEDOR"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                selected={filters.sellers}
                options={selectableSellers.map((s, index) => ({ id: index + 1, label: s, value: s }))}
                handleChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    sellers: value as TSale['natureza'][],
                  }))
                }
                selectedItemLabel="VENDEDOR"
                onReset={() => setFilters((prev) => ({ ...prev, sellers: [] }))}
                width="100%"
              />
            </div>
            <div className="w-full lg:w-[350px]">
              <MultipleSalesSelectInput
                label="VENDAS EXCLUÍDAS"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                selected={filters.excludedSalesIds}
                handleChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    excludedSalesIds: value as string[],
                  }))
                }
                selectedItemLabel="VENDAS EXCLUÍDAS"
                onReset={() => setFilters((prev) => ({ ...prev, excludedSalesIds: [] }))}
                width="100%"
              />
            </div>

            <div className="w-full lg:w-[250px]">
              <MultipleSelectInput
                label="GRUPO DE PRODUTOS"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                selected={filters.productGroups}
                options={filterOptions?.productsGroups.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
                handleChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    productGroups: value as string[],
                  }))
                }
                selectedItemLabel="GRUPO DE PRODUTOS"
                onReset={() => setFilters((prev) => ({ ...prev, productGroups: [] }))}
                width="100%"
              />
            </div>
            <div className="w-full lg:w-[250px]">
              <MultipleSelectInput
                label="CATEGORIA DE CLIENTES"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                selected={filters.clientRFMTitles}
                options={RFMLabels.map((s, index) => ({ id: index + 1, label: s.text, value: s.text })) || []}
                handleChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    clientRFMTitles: value as string[],
                  }))
                }
                selectedItemLabel="CATEGORIA DE CLIENTES"
                onReset={() => setFilters((prev) => ({ ...prev, clientRFMTitles: [] }))}
                width="100%"
              />
            </div>
            <div className="w-full lg:w-[250px]">
              <MultipleSelectInput
                label="NATUREZA DA VENDA"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                selected={filters.saleNatures}
                options={filterOptions?.saleNatures.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
                handleChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    saleNatures: value as TSale['natureza'][],
                  }))
                }
                selectedItemLabel="NATUREZA DA VENDA"
                onReset={() => setFilters((prev) => ({ ...prev, saleNatures: [] }))}
                width="100%"
              />
            </div>
            <div className="w-full lg:w-[150px]">
              <DateInput
                label="PERÍODO"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                value={formatDateForInput(filters.period.after)}
                handleChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    period: {
                      ...prev.period,
                      after: (formatDateInputChange(value) as string) || firstDayOfMonth,
                    },
                  }))
                }
                width="100%"
              />
            </div>
            <div className="w-full lg:w-[150px]">
              <DateInput
                label="PERÍODO"
                labelClassName="text-[0.6rem]"
                holderClassName="text-xs p-2 min-h-[34px]"
                value={formatDateForInput(filters.period.before)}
                handleChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    period: {
                      ...prev.period,
                      before: (formatDateInputChange(value) as string) || lastDayOfMonth,
                    },
                  }))
                }
                width="100%"
              />
            </div>
          </div>
        </div>
        {isLoading ? <LoadingComponent /> : null}
        {isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
        {isSuccess ? (
          <div className="w-full flex flex-col grow gap-2 py-2">
            <div className="w-full flex flex-col gap-1 rounded-xl border border-primary shadow-sm  overflow-hidden">
              <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white ">
                <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">ACOMPANHAMENTO DE META DO PERÍODO</h1>
                <VscDiffAdded size={12} />
              </div>
              <div className="w-full flex items-center justify-center p-2">
                <GoalTrackingBar
                  barBgColor="bg-gradient-to-r from-yellow-200 to-amber-400"
                  goalText={`${stats.faturamentoMeta}`}
                  barHeigth="25px"
                  valueGoal={stats.faturamentoMeta}
                  valueHit={stats.faturamentoBruto}
                  formattedValueGoal={formatToMoney(stats.faturamentoMeta || 0)}
                  formattedValueHit={formatToMoney(stats.faturamentoBruto || 0)}
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
                  {userViewPermission == 'GERAL' ? (
                    <p className="text-xs text-green-500 font-bold lg:text-[0.7rem]">{formatToMoney(stats.faturamentoLiquido)} líquidos</p>
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
                    <div className="text-xl font-bold text-[#15599a]">{formatDecimalPlaces((100 * stats.faturamentoLiquido) / stats.faturamentoBruto)}%</div>
                  </div>
                </div>
              ) : null}

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
                <SalesGraph
                  period={filters.period}
                  total={filters.total}
                  sellers={filters.sellers}
                  saleNatures={filters.saleNatures}
                  clientRFMTitles={filters.clientRFMTitles}
                  productGroups={filters.productGroups}
                  excludedSalesIds={filters.excludedSalesIds}
                />
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
            <MatrixRFMAnalysis session={user} sellerOptions={filterOptions?.sellers || []} saleNatureOptions={filterOptions?.saleNatures || []} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SellersGraph({ data }: { data: TGeneralSalesStats['porVendedor'] }) {
  const [type, setType] = useState<'qtde' | 'total'>('total')
  const chartConfig = {
    total: {
      label: 'Valor Vendido',
      color: '#fead41',
    },
    qtde: {
      label: 'Qtde Vendas',
      color: '#fead41',
    },
  } satisfies ChartConfig
  return (
    <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
      <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
        <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">RANKING DE VENDEDORES</h1>
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
          <FaRankingStar size={12} />
        </div>
      </div>

      <div className="px-6 py-2 flex w-full flex-col gap-2 h-[450px] :max-h-[450px]">
        <ResponsiveContainer className={'w-full h-full'}>
          <ChartContainer config={chartConfig} className="w-full h-full">
            <BarChart accessibilityLayer data={data.sort((a, b) => (type == 'total' ? b.total - a.total : b.qtde - a.qtde))} layout="vertical">
              <XAxis type="number" dataKey={type} hide />
              <YAxis dataKey="titulo" type="category" tickLine={false} tickMargin={0} axisLine={false} tickFormatter={(value) => value.slice(0, 36)} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey={type} fill="#15599a" radius={5}>
                <LabelList
                  dataKey={type}
                  position="right"
                  offset={8}
                  className="fill-foreground text-[0.5rem]"
                  formatter={(value: any) => (type == 'total' ? formatToMoney(value) : value)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ProductGroupsGraph({ data }: { data: TGeneralSalesStats['porGrupo'] }) {
  const [type, setType] = useState<'qtde' | 'total'>('total')

  const Collors = ['#15599a', '#fead41', '#ff595e', '#8ac926', '#6a4c93', '#5adbff']
  const total = data.reduce((acc, current) => (type == 'total' ? acc + current.total : acc + current.qtde), 0)
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setType('total')}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded',
              type == 'total' ? 'bg-white text-black' : 'bg-transparent text-white'
            )}
          >
            VALOR
          </button>
          <button
            onClick={() => setType('qtde')}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded',
              type == 'qtde' ? 'bg-white text-black' : 'bg-transparent text-white'
            )}
          >
            QUANTIDADE
          </button>
          <FaLayerGroup size={12} />
        </div>
      </div>
      <div className="px-6 py-2 flex w-full flex-col gap-2 h-[300px] lg:h-[350px] max-h-[300px] lg:max-h-[350px]">
        <ChartContainer config={projectTypesChartConfig} className="h-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={graphData}
              dataKey={type}
              nameKey="titulo"
              label={(x) => {
                console.log('PIE', x)
                return `${formatDecimalPlaces((100 * x.value) / total)}%`
              }}
              innerRadius={60}
              strokeWidth={2}
            ></Pie>
            <ChartLegend content={<ChartLegendContent color="#000" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  )
}
function ProductNameGraph({ data }: { data: TGeneralSalesStats['porItem'] }) {
  const [type, setType] = useState<'qtde' | 'total'>('total')
  const dataSorted = data.sort((a, b) => (type == 'total' ? b.total - a.total : b.qtde - a.qtde))
  return (
    <div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden">
      <div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
        <h1 className="text-[0.7rem] font-bold uppercase tracking-tight">PARTICIPAÇÃO POR ITEM</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setType('total')}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded',
              type == 'total' ? 'bg-white text-black' : 'bg-transparent text-white'
            )}
          >
            VALOR
          </button>
          <button
            onClick={() => setType('qtde')}
            className={cn(
              'px-2 py-0.5 text-[0.6rem] font-medium border border-white rounded',
              type == 'qtde' ? 'bg-white text-black' : 'bg-transparent text-white'
            )}
          >
            QUANTIDADE
          </button>
          <BsCart size={12} />
        </div>
      </div>
      <div className="px-6 py-4 flex w-full flex-col gap-3 h-[350px] max-h-[350px] scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 overflow-y-auto overscroll-y-auto">
        {dataSorted.map((d, index) => (
          <div key={`${type}-${index}`} className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center border border-primary">
                <BsCart size={10} />
              </div>
              <h1 className="rounded-full p-1 text-[0.55rem] bg-[#15599a] text-white font-bold">{index + 1}º</h1>
              <h1 className="hidden lg:block text-[0.6rem] lg:text-xs tracking-tight font-medium">{d.titulo}</h1>
              <h1 className="block lg:hidden text-[0.6rem] lg:text-xs tracking-tight font-medium">{formatLongString(d.titulo, 25)}</h1>
            </div>
            <h1 className="text-xs lg:text-base font-black">{type == 'total' ? formatToMoney(d.total) : d.qtde}</h1>
          </div>
        ))}
      </div>
    </div>
  )
}

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
