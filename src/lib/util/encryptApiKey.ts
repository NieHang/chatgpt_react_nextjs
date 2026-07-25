// src/lib/api-key-crypto.ts
import crypto from 'node:crypto'

function getEncryptionKey(): Buffer {
  const value = process.env.API_KEY_ENCRYPTION_KEY

  if (!value) {
    throw new Error('API_KEY_ENCRYPTION_KEY is missing')
  }

  const key = Buffer.from(value, 'hex')

  if (key.length !== 32) {
    throw new Error('API_KEY_ENCRYPTION_KEY must be 64 hexadecimal characters')
  }

  return key
}

export function encryptApiKey(apiKey: string, userId: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  // Prevent encrypted keys from being moved between users.
  cipher.setAAD(Buffer.from(userId))

  const ciphertext = Buffer.concat([
    cipher.update(apiKey, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Store this complete value in one database column.
  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

export function decryptApiKey(encryptedValue: string, userId: string): string {
  const key = getEncryptionKey()
  const [version, ivValue, tagValue, ciphertextValue] =
    encryptedValue.split('.')

  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Invalid encrypted API key')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivValue, 'base64url'),
  )

  decipher.setAAD(Buffer.from(userId))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}
