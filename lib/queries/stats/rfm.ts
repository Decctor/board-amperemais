import { TRFMResult } from '@/pages/api/stats/sales-rfm'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchRFM() {
  try {
    const { data } = await axios.get('/api/stats/sales-rfm')
    return data.data as TRFMResult
  } catch (error) {
    throw error
  }
}

export function useRFMData() {
  return useQuery({
    queryKey: ['rfm'],
    queryFn: fetchRFM,
  })
}
