import { TUser } from '@/schemas/users'
import axios from 'axios'

export async function createUser(info: TUser) {
  try {
    const { data } = await axios.post('/api/users', info)
    if (typeof data.message != 'string') return 'Usuário criado com sucesso !'
    return data.message as string
  } catch (error) {
    throw error
  }
}

export async function updateUser({ id, changes }: { id: string; changes: Partial<TUser> }) {
  try {
    const { data } = await axios.put(`/api/users?id=${id}`, changes)
    if (typeof data.message != 'string') return 'Usuário criado com sucesso !'
    return data.message as string
  } catch (error) {
    throw error
  }
}
