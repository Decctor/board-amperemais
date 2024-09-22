import { TRFMResult } from '@/pages/api/stats/sales-rfm'
import { TSalesRFMFilters } from '@/schemas/query-params-utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchRFM(filters: TSalesRFMFilters) {
  try {
    const { data } = await axios.post('/api/stats/sales-rfm', filters)
    return data.data as TRFMResult
  } catch (error) {
    throw error
  }
}

type UseRFMDataParams = TSalesRFMFilters
export function useRFMData({ period, total, saleNatures, sellers }: UseRFMDataParams) {
  return useQuery({
    queryKey: ['rfm', period, total, saleNatures, sellers],
    queryFn: async () => fetchRFM({ period, total, saleNatures, sellers }),
  })
}
