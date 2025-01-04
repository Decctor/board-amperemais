import { TOverallSalesStats } from '@/pages/api/stats/sales-overall'
import { TSaleStatsGeneralQueryParams } from '@/schemas/query-params-utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export async function fetchOverallSalesStats(filters: TSaleStatsGeneralQueryParams) {
  try {
    const { data } = await axios.post('/api/stats/sales-overall', filters)
    return data.data as TOverallSalesStats
  } catch (error) {
    throw error
  }
}

export function useOverallSalesStats(filters: TSaleStatsGeneralQueryParams) {
  return useQuery({
    queryKey: ['overall-sales-stats', filters],
    queryFn: async () => await fetchOverallSalesStats(filters),
    refetchOnWindowFocus: false,
  })
}
