import { TMarketingControl, TMarketingControlDTO } from '@/schemas/marketing-controls'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchControls() {
  try {
    const { data } = await axios.get('/api/marketing-controls')
    return data.data as TMarketingControlDTO[]
  } catch (error) {
    throw error
  }
}
async function fetchMarketingControlById(id: string) {
  try {
    const { data } = await axios.get(`/api/marketing-controls?id=${id}`)
    return data.data as TMarketingControlDTO
  } catch (error) {
    throw error
  }
}

export function useMarketingControls() {
  return useQuery({
    queryKey: ['marketing-controls'],
    queryFn: () => fetchControls(),
  })
}

export function useMarketingControlById(id: string) {
  return useQuery({
    queryKey: ['marketing-control-by-id', id],
    queryFn: async () => await fetchMarketingControlById(id),
  })
}
