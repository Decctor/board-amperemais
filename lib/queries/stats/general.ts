import { TGeneralSalesStats } from '@/pages/api/stats/sales-dashboard'
import { TSalesQueryFilter } from '@/schemas/sales'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

async function fetchGeneralSalesStats({ after, before, filters }: { after: string; before: string; filters: TSalesQueryFilter }) {
  try {
    const { data } = await axios.post(`/api/stats/sales-dashboard?after=${after}&before=${before}`, filters)

    return data.data as TGeneralSalesStats
  } catch (error) {
    throw error
  }
}

export function useGeneralSalesStats({ after, before }: { after: string; before: string }) {
  const [queryFilters, setQueryFilters] = useState<TSalesQueryFilter>({
    total: {},
    saleNature: [],
    sellers: [],
  })
  return {
    ...useQuery({
      queryKey: ['general-stats', after, before, queryFilters],
      queryFn: async () => await fetchGeneralSalesStats({ after, before, filters: queryFilters }),
    }),
    queryFilters,
    setQueryFilters,
  }
}
