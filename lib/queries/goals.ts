import { TSaleGoal, TSaleGoalDTO } from '@/schemas/sale-goals'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchGoals() {
  try {
    const { data } = await axios.get('/api/goals')
    return data.data as TSaleGoalDTO[]
  } catch (error) {
    throw error
  }
}
async function fetchGoalById(id: string) {
  try {
    const { data } = await axios.get(`/api/goals?id=${id}`)
    return data.data as TSaleGoalDTO
  } catch (error) {
    throw error
  }
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => fetchGoals(),
  })
}

export function useGoalById(id: string) {
  return useQuery({
    queryKey: ['goal-by-id', id],
    queryFn: async () => await fetchGoalById(id),
  })
}
