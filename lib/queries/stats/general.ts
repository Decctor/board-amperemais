import { TGeneralSalesStats } from '@/pages/api/stats/sales-dashboard'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchGeneralSalesStats({ after, before }: { after: string; before: string }) {
  try {
    const { data } = await axios.get(`/api/stats/sales-dashboard?after=${after}&before=${before}`)

    return data.data as TGeneralSalesStats
  } catch (error) {
    throw error
  }
}

export function useGeneralSalesStats({ after, before }: { after: string; before: string }) {
  return useQuery({
    queryKey: ['general-stats', after, before],
    queryFn: async () => await fetchGeneralSalesStats({ after, before }),
  })
}
