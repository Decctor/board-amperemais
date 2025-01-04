import { TRFMLabelledStats } from '@/pages/api/stats/sales-rfm-labelled'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchRFMLabelledStats() {
  try {
    const { data } = await axios.get('/api/stats/sales-rfm-labelled')
    return data.data as TRFMLabelledStats
  } catch (error) {
    throw error
  }
}

export function useRFMLabelledStats() {
  return useQuery({ queryKey: ['rfm-labelled-stats'], queryFn: fetchRFMLabelledStats })
}
