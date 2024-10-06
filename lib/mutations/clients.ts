import { TClient } from '@/schemas/clients'
import axios from 'axios'

export async function createClient(info: TClient) {
  try {
    const { data } = await axios.post('/api/clients', info)
    if (typeof data.message != 'string') return 'Cliente criado com sucesso !'
    return data.message as string
  } catch (error) {
    throw error
  }
}
