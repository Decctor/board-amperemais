import { TGeneralSalesStats } from '@/pages/api/stats/sales-dashboard'
import { TSalesGeneralStatsFilters } from '@/schemas/query-params-utils'
import { TSalesQueryFilter } from '@/schemas/sales'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

async function fetchGeneralSalesStats(filters: TSalesGeneralStatsFilters) {
  try {
    const { data } = await axios.post(`/api/stats/sales-dashboard`, filters)

    return data.data as TGeneralSalesStats
  } catch (error) {
    throw error
  }
}

export function useGeneralSalesStats({ period, total, sellers, saleNatures }: TSalesGeneralStatsFilters) {
  return {
    ...useQuery({
      queryKey: ['general-stats', period, total, sellers, saleNatures],
      queryFn: async () => await fetchGeneralSalesStats({ period, total, sellers, saleNatures }),
      refetchOnWindowFocus: false,
    }),
  }
}
