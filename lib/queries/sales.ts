import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { formatWithoutDiacritics } from '../formatting'

async function fetchSaleItems() {
  try {
    const { data } = await axios.get('/api/sales/items')

    return data.data as string[]
  } catch (error) {
    throw error
  }
}

export function useSaleItems() {
  const [filters, setFilters] = useState({
    search: '',
  })
  function matchSearch(item: string) {
    if (filters.search.trim().length == 0) return true
    return formatWithoutDiacritics(item, true).includes(formatWithoutDiacritics(filters.search, true))
  }
  function handleModelData(data: string[]) {
    return data.filter((d) => matchSearch(d))
  }
  return {
    ...useQuery({
      queryKey: ['sale-items'],
      queryFn: fetchSaleItems,
      select: (data) => handleModelData(data),
    }),
    filters,
    setFilters,
  }
}
