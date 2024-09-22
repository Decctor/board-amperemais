import { formatWithoutDiacritics } from '@/lib/formatting'
import { TRFMResult } from '@/pages/api/stats/sales-rfm'
import { TSalesRFMFilters } from '@/schemas/query-params-utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

async function fetchRFM(filters: TSalesRFMFilters) {
  try {
    const { data } = await axios.post('/api/stats/sales-rfm', filters)
    return data.data as TRFMResult
  } catch (error) {
    throw error
  }
}

type UseRFMDataSelectFilters = {
  clientName: string
  rfmLabels: string[]
}
type UseRFMDataParams = TSalesRFMFilters
export function useRFMData({ period, total, saleNatures, sellers }: UseRFMDataParams) {
  const [selectFilters, setSelectFilters] = useState<UseRFMDataSelectFilters>({
    clientName: '',
    rfmLabels: [],
  })
  function matchClientName(item: TRFMResult[number]) {
    if (selectFilters.clientName.trim().length == 0) return true
    return formatWithoutDiacritics(item.clientName, true).includes(formatWithoutDiacritics(selectFilters.clientName, true))
  }
  function matchRFMLabels(item: TRFMResult[number]) {
    if (selectFilters.rfmLabels.length == 0) return true
    return selectFilters.rfmLabels.includes(item.rfmLabel)
  }
  function handleModelData(data: TRFMResult) {
    return data.filter((item) => matchClientName(item) && matchRFMLabels(item))
  }
  return {
    ...useQuery({
      queryKey: ['rfm', period, total, saleNatures, sellers],
      queryFn: async () => fetchRFM({ period, total, saleNatures, sellers }),
      select: (data) => handleModelData(data),
      refetchOnWindowFocus: false,
    }),
    selectFilters,
    setSelectFilters,
  }
}
