import { TSaleGraph } from '@/pages/api/stats/sales-graph'
import { TIntervalGrouping } from '@/utils/graphs'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchSalesGraph({ after, before, group }: { after: string; before: string; group: TIntervalGrouping }) {
  try {
    const { data } = await axios.post('/api/stats/sales-graph', { period: { after, before }, group })
    return data.data as TSaleGraph
  } catch (error) {
    throw error
  }
}

export function useSalesGraph({ after, before, group }: { after: string; before: string; group: TIntervalGrouping }) {
  return useQuery({
    queryKey: ['sales-graph', after, before, group],
    queryFn: async () => await fetchSalesGraph({ after, before, group }),
  })
}
