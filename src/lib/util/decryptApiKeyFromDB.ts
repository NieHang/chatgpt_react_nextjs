import { Db } from 'mongodb'
import { decryptApiKey } from './encryptApiKey'

export default async function decryptApiKeyFromDB({
  db,
  userId,
}: {
  db: Db
  userId: string
}): Promise<string> {
  const document = await db
    .collection('apiKeys')
    .findOne({ userId }, { projection: { apiKeyEncrypted: 1 } })

  if (!document?.apiKeyEncrypted) {
    throw new Error('API_KEY_NOT_CONFIGURED')
  }

  return decryptApiKey(document.apiKeyEncrypted, userId)
}
