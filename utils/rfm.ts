export type TRFMConfig = {
  identificador: 'CONFIG_RFM'
  frequencia: {
    5: {
      min: number
      max: number
    }
    4: {
      min: number
      max: number
    }
    3: {
      min: number
      max: number
    }
    2: {
      min: number
      max: number
    }
    1: {
      min: number
      max: number
    }
  }
  recencia: {
    5: {
      min: number
      max: number
    }
    4: {
      min: number
      max: number
    }
    3: {
      min: number
      max: number
    }
    2: {
      min: number
      max: number
    }
    1: {
      min: number
      max: number
    }
  }
}

const RFMLabels = [
  {
    text: 'NÃO PODE PERDÊ-LOS',
    combinations: [
      [5, 1],
      [5, 2],
    ],
  },
  {
    text: 'CLIENTES LEAIS',
    combinations: [
      [5, 3],
      [5, 4],
      [4, 3],
      [4, 4],
      [4, 5],
    ],
  },
  {
    text: 'CAMPEÕES',
    combinations: [[5, 5]],
  },
  {
    text: 'EM RISCO',
    combinations: [
      [4, 1],
      [4, 2],
      [3, 1],
      [3, 2],
    ],
  },
  {
    text: 'PRECISAM DE ATENÇÃO',
    combinations: [[3, 3]],
  },
  {
    text: 'POTENCIAIS CLIENTES LEAIS',
    combinations: [
      [3, 4],
      [3, 5],
      [2, 4],
      [2, 5],
    ],
  },
  {
    text: 'HIBERNANDO',
    combinations: [[2, 2]],
  },
  {
    text: 'PRESTES A DORMIR',
    combinations: [
      [2, 3],
      [1, 3],
    ],
  },
  {
    text: 'PERDIDOS',
    combinations: [
      [2, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    text: 'PROMISSORES',
    combinations: [[1, 4]],
  },
  { text: 'CLIENTES RECENTES', combinations: [[1, 5]] },
]
export const getRFMLabel = (frequency: number, recency: number) => {
  const label = RFMLabels.find((l) => l.combinations.some((c) => c[0] == frequency && c[1] == recency))

  return label?.text || 'PERDIDOS'
}
