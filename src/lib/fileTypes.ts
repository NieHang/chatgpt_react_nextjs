const VISION_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

const VISION_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

export function isVisionImageFile({
  name,
  type,
}: {
  name: string
  type?: string | null
}) {
  const normalizedType = type?.toLowerCase() ?? ''
  const normalizedName = name.toLowerCase()

  return (
    VISION_IMAGE_MIME_TYPES.has(normalizedType) ||
    VISION_IMAGE_EXTENSIONS.some((extension) =>
      normalizedName.endsWith(extension),
    )
  )
}