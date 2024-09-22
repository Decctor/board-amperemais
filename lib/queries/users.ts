import { TUserDTO } from '@/schemas/users'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchUsers() {
  try {
    const { data } = await axios.get('/api/users')
    return data.data as TUserDTO[]
  } catch (error) {
    throw error
  }
}
async function fetchUserById(id: string) {
  try {
    const { data } = await axios.get(`/api/users?id=${id}`)
    return data.data as TUserDTO
  } catch (error) {
    throw error
  }
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  })
}

export function useUserById(id: string) {
  return useQuery({
    queryKey: ['user-by-id', id],
    queryFn: async () => await fetchUserById(id),
  })
}
