import { TSalesMarketingResult } from '@/pages/api/stats/sales-marketing'
import { TSalesMarketingStatsFilters } from '@/schemas/query-params-utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchSalesMarketingStats(params: TSalesMarketingStatsFilters) {
  try {
    const { data } = await axios.post('/api/stats/sales-marketing', params)

    return data.data as TSalesMarketingResult
  } catch (error) {
    throw error
  }
}

export function useSalesMarketingStats(params: TSalesMarketingStatsFilters) {
  return useQuery({
    queryKey: ['sales-marketing-stats', params],
    queryFn: async () => await fetchSalesMarketingStats(params),
  })
}
