import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { formatWithoutDiacritics } from '../formatting'
import { TItemsSearchQueryParams } from '@/pages/api/sales/items/search'
import { TSaleItemsBySearch } from '@/pages/api/sales/items/search'
import { TItemsExport } from '@/pages/api/sales/items/export'
import { TSalesSimplifiedSearchQueryParams } from '@/schemas/sales'
import { TSalesSimplifiedSearchResult } from '@/pages/api/sales/simplified-search'

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

async function fetchSaleItemsBySearch(params: TItemsSearchQueryParams) {
  const { data } = await axios.post('/api/sales/items/search', params)

  return data.data as TSaleItemsBySearch
}

export function useSaleItemsBySearch() {
  const [params, setParams] = useState<TItemsSearchQueryParams>({
    page: 1,
    searchDescription: '',
    searchCode: '',
  })
  function updateParams(newParams: Partial<TItemsSearchQueryParams>) {
    setParams((prev) => ({ ...prev, ...newParams }))
  }
  return {
    ...useQuery({
      queryKey: ['sale-items-search', params],
      queryFn: async () => await fetchSaleItemsBySearch(params),
    }),
    params,
    updateParams,
  }
}

export async function fetchItemsExport() {
  try {
    const { data } = await axios.get('/api/sales/items/export')

    return data.data as TItemsExport[]
  } catch (error) {
    throw error
  }
}

async function fetchSalesSimplifiedSearch(params: TSalesSimplifiedSearchQueryParams) {
  try {
    const { data } = await axios.post('/api/sales/simplified-search', params)

    return data.data as TSalesSimplifiedSearchResult
  } catch (error) {
    throw error
  }
}

export function useSalesSimplifiedSearch() {
  const [params, setParams] = useState<TSalesSimplifiedSearchQueryParams>({
    search: '',
    page: 1,
  })
  function updateParams(newParams: Partial<TSalesSimplifiedSearchQueryParams>) {
    setParams((prev) => ({ ...prev, ...newParams }))
  }
  return {
    ...useQuery({
      queryKey: ['sales-simplified-search', params],
      queryFn: async () => await fetchSalesSimplifiedSearch(params),
      refetchOnWindowFocus: false,
    }),
    params,
    updateParams,
  }
}
