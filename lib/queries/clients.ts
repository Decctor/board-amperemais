import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { formatWithoutDiacritics } from '../formatting'
import { TClient, TClientDTO } from '@/schemas/clients'

async function fetchClients() {
  try {
    const { data } = await axios.get('/api/clients')

    return data.data as TClientDTO[]
  } catch (error) {
    throw error
  }
}

export function useClients() {
  const [filters, setFilters] = useState({
    search: '',
  })
  function matchSearch(item: TClientDTO) {
    if (filters.search.trim().length == 0) return true
    return formatWithoutDiacritics(item.nome, true).includes(formatWithoutDiacritics(filters.search, true))
  }
  function handleModelData(data: TClientDTO[]) {
    return data.filter((d) => matchSearch(d))
  }
  return {
    ...useQuery({
      queryKey: ['clients'],
      queryFn: fetchClients,
      select: (data) => handleModelData(data),
    }),
    filters,
    setFilters,
  }
}
