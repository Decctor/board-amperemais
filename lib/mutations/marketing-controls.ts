import { TMarketingControl } from '@/schemas/marketing-controls'
import axios from 'axios'

export async function createMarketingControl(info: TMarketingControl) {
  try {
    const { data } = await axios.post('/api/marketing-controls', info)
    if (typeof data.message != 'string') return 'Controle criado com sucesso !'
    return data.message as string
  } catch (error) {
    throw error
  }
}

export async function updateMarketingControl({ id, changes }: { id: string; changes: Partial<TMarketingControl> }) {
  try {
    const { data } = await axios.put(`/api/marketing-controls?id=${id}`, changes)
    if (typeof data.message != 'string') return 'Controle atualizado com sucesso !'
    return data.message as string
  } catch (error) {
    throw error
  }
}
