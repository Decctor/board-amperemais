import { ObjectId } from 'mongodb'

export function isInvalidMongoId(id: unknown) {
  return typeof id != 'string' || !ObjectId.isValid(id)
}
