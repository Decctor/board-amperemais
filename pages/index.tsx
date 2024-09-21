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
import { useRFMData } from '@/lib/queries/stats/rfm'
import * as AspectRatio from '@radix-ui/react-aspect-ratio'
import { useRouter } from 'next/router'
import { useUserSession } from '@/lib/queries/session'
import DashboardPage from '@/components/Dashboard/DashboardPage'
import UnauthenticatedPage from '@/components/Utils/UnauthenticatedPage'
const currentDate = new Date()
const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()
const lastDayOfMonth = getLastDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString()

export default function Home() {
  const router = useRouter()
  const { data: session, isLoading, isError, isSuccess, error } = useUserSession()

  if (isLoading) return <LoadingComponent />
  if (isError) return <ErrorComponent msg={getErrorMessage(error)} />
  if (isSuccess && !session) return <UnauthenticatedPage />
  if (isSuccess && !!session) return <DashboardPage user={session} />
  return <></>
}
