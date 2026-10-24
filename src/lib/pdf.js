// PDF tools — 100% in the browser, using pdf-lib (pure JavaScript).
// Nothing is sent anywhere: files are read as ArrayBuffers, pages are
// copied into a new document, and the result is saved as bytes.

import { PDFDocument } from 'pdf-lib'

function toBlob(bytes) {
  return new Blob([bytes], { type: 'application/pdf' })
}

/** Merge several PDFs into one, in the order given. */
export async function mergePdfs(files) {
  const merged = await PDFDocument.create()
  for (const file of files) {
    // NOTE: password-protected PDFs throw here — App.jsx catches
    // that and shows a friendly error instead of crashing.
    const src = await PDFDocument.load(await file.arrayBuffer())
    const pages = await merged.copyPages(src, src.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
  }
  return toBlob(await merged.save())
}

/** Turn a list of image files into one PDF, one image per page. */
export async function imagesToPdf(files) {
  const doc = await PDFDocument.create()
  for (const file of files) {
    let image
    if (file.type === 'image/png') {
      image = await doc.embedPng(await file.arrayBuffer())
    } else if (file.type === 'image/jpeg') {
      image = await doc.embedJpg(await file.arrayBuffer())
    } else {
      // pdf-lib cannot embed WebP: rasterize it to PNG via canvas first.
      image = await doc.embedPng(await webpToPngBytes(file))
    }
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return toBlob(await doc.save())
}

async function webpToPngBytes(file) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('WebP conversion failed'))), 'image/png'),
  )
  return blob.arrayBuffer()
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Free the memory once the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
