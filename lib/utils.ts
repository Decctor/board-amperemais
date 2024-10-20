import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function isEmpty(value: any) {
  return value == null || (typeof value === 'string' && value.trim().length === 0)
}

function getLevenshteinDistance(string1: string, string2: string) {
  const matrix = Array(string1.length + 1)
    .fill(null)
    .map(() => Array(string2.length + 1).fill(null))

  for (let i = 0; i <= string1.length; i++) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= string2.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= string1.length; i++) {
    for (let j = 1; j <= string2.length; j++) {
      const indicator = string1[i - 1] === string2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + indicator)
    }
  }

  return matrix[string1.length][string2.length]
}
export function calculateStringSimilarity(string1: string, string2: string) {
  const maxLength = Math.max(string1.length, string2.length)
  const distance = getLevenshteinDistance(string1, string2)
  const similarity = (maxLength - distance) / maxLength
  const similarityPercentage = similarity * 100

  return similarityPercentage
}
