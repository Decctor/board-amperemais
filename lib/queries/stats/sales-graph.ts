import { TSaleGraph } from '@/pages/api/stats/sales-graph'
import { TSalesGraphFilters } from '@/schemas/query-params-utils'
import { TIntervalGrouping } from '@/utils/graphs'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchSalesGraph(filters: TSalesGraphFilters) {
  try {
    const { data } = await axios.post('/api/stats/sales-graph', filters)
    return data.data as TSaleGraph
  } catch (error) {
    throw error
  }
}

export function useSalesGraph({ period, group, total, saleNatures, sellers }: TSalesGraphFilters) {
  return useQuery({
    queryKey: ['sales-graph', period, group, total, saleNatures, sellers],
    queryFn: async () => await fetchSalesGraph({ period, group, total, saleNatures, sellers }),
  })
}
