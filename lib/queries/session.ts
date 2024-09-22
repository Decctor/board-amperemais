import { TUser, TUserSession } from '@/schemas/users'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Session } from 'lucia'

async function fetchUserSession() {
  try {
    const { data } = await axios.get('/api/auth/session')
    return data.data as TUserSession | null
  } catch (error) {
    throw error
  }
}

export function useUserSession() {
  return useQuery({
    queryKey: ['user-session'],
    queryFn: fetchUserSession,
  })
}
