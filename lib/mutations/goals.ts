import { TSaleGoal } from '@/schemas/sale-goals'
import axios from 'axios'

export async function createGoal(info: TSaleGoal) {
  try {
    const { data } = await axios.post('/api/goals', info)
    if (typeof data.message != 'string') return 'Meta criada com sucesso !'
    return data.message as string
  } catch (error) {
    throw error
  }
}

export async function updateGoal({ id, changes }: { id: string; changes: Partial<TSaleGoal> }) {
  try {
    const { data } = await axios.put(`/api/goals?id=${id}`, changes)
    if (typeof data.message != 'string') return 'Meta atualizada com sucesso !'
    return data.message as string
  } catch (error) {
    throw error
  }
}
