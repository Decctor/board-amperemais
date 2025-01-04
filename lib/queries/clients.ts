import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { formatWithoutDiacritics } from '../formatting'
import { TClient, TClientDTO, TClientSearchQueryParams } from '@/schemas/clients'
import { TClientsBySearch } from '@/pages/api/clients/search'

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

async function fetchClientsBySearch(params: TClientSearchQueryParams) {
  try {
    const { data } = await axios.post('/api/clients/search', params)

    return data.data as TClientsBySearch
  } catch (error) {
    throw error
  }
}

export function useClientsBySearch() {
  const [queryParams, setQueryParams] = useState<TClientSearchQueryParams>({
    page: 1,
    name: '',
    phone: '',
    acquisitionChannels: [],
    rfmTitles: [],
    period: { after: null, before: null },
  })

  function updateQueryParams(newParams: Partial<TClientSearchQueryParams>) {
    setQueryParams((prevParams) => ({ ...prevParams, ...newParams }))
  }

  return {
    ...useQuery({
      queryKey: [
        'clients-by-search',
        queryParams.page,
        queryParams.name,
        queryParams.phone,
        queryParams.acquisitionChannels,
        queryParams.rfmTitles,
        queryParams.period,
      ],
      queryFn: () => fetchClientsBySearch(queryParams),
    }),
    queryParams,
    updateQueryParams,
  }
}
