// Image conversion — 100% in the browser, using the <canvas> element.
// Flow: file -> bitmap -> canvas (resize happens here) -> blob in target format.

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
}

/** Human-readable file size, e.g. 245 KB / 1.2 MB */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    // quality only affects lossy formats (jpeg/webp); png ignores it.
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Conversion failed'))),
      mime,
      quality,
    )
  })
}

/**
 * Convert one image file.
 * @param {File} file
 * @param {{ format: 'png'|'jpg'|'webp', quality: number, maxWidth: number|null }} opts
 * @returns {Promise<{ blob: Blob, name: string }>}
 */
export async function convertImage(file, { format, quality, maxWidth }) {
  // imageOrientation: 'from-image' fixes phone photos that would
  // otherwise come out rotated (EXIF orientation tag).
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  const scale =
    maxWidth && bitmap.width > maxWidth ? maxWidth / bitmap.width : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')

  // JPEG has no transparency: paint white first, or transparent
  // areas of a PNG would turn black.
  if (format === 'jpg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await canvasToBlob(canvas, MIME[format], quality)
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return { blob, name: `${baseName}.${format}` }
}
