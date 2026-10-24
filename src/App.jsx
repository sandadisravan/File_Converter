import { useState } from 'react'
import JSZip from 'jszip'
import Dropzone from './components/Dropzone.jsx'
import { convertImage, formatSize } from './lib/images.js'
import { downloadBlob, imagesToPdf, mergePdfs } from './lib/pdf.js'

const TOOLS = [
  { id: 'images', label: '🖼️ Image Converter', tagline: 'PNG ↔ JPG ↔ WebP, resize, compress' },
  { id: 'merge', label: '📄 Merge PDF', tagline: 'Combine PDFs in your order' },
  { id: 'images-pdf', label: '🖼️➡️📄 Images to PDF', tagline: 'Photos into one PDF document' },
]

export default function App() {
  const [tool, setTool] = useState('images')
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [format, setFormat] = useState('webp')
  const [quality, setQuality] = useState(0.85)
  const [maxWidth, setMaxWidth] = useState('')

  const accept = tool === 'merge' ? '.pdf' : 'image/*'

  function switchTool(id) {
    setTool(id)
    setFiles([])
    setResults([])
    setError('')
  }

  function moveFile(index, dir) {
    const next = [...files]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setFiles(next)
  }

  async function handleConvert() {
    if (!files.length) return
    setBusy(true)
    setError('')
    setResults([])
    try {
      if (tool === 'images') {
        const out = []
        for (const file of files) {
          const { blob, name } = await convertImage(file, {
            format,
            quality,
            maxWidth: maxWidth ? Number(maxWidth) : null,
          })
          out.push({ name, blob, before: file.size, after: blob.size })
        }
        setResults(out)
      } else if (tool === 'merge') {
        const blob = await mergePdfs(files)
        setResults([{ name: 'merged.pdf', blob, before: null, after: blob.size }])
      } else {
        const blob = await imagesToPdf(files)
        setResults([{ name: 'images.pdf', blob, before: null, after: blob.size }])
      }
    } catch (e) {
      // Most common cause: a password-protected PDF (pdf-lib can't open those).
      setError(
        tool === 'merge'
          ? 'Could not read one of the PDFs — password-protected PDFs are not supported yet.'
          : `Something went wrong: ${e.message}`,
      )
    } finally {
      setBusy(false)
    }
  }

  async function downloadAll() {
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name)
      return
    }
    const zip = new JSZip()
    results.forEach((r) => zip.file(r.name, r.blob))
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, 'converted-files.zip')
  }

  return (
    <div className="min-h-screen font-sans text-stone-800">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="font-display text-2xl font-extrabold tracking-tight">
          📦 Free File Converter
        </span>
        <a href="#trust" className="text-sm font-semibold text-rose-600 hover:underline">
          🔒 Why it's private
        </a>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        {/* Hero */}
        <section className="pt-6 text-center">
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">
            🔒 100% private — files never leave your device
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Convert files without uploading them anywhere.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-stone-500">
            Images and PDFs, converted right here in your browser. No account,
            no waiting, no server ever seeing your files.
          </p>
        </section>

        {/* Tool picker */}
        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTool(t.id)}
              className={`rounded-3xl border-2 p-4 text-left shadow-sm transition
                ${tool === t.id ? 'border-rose-400 bg-white shadow-md' : 'border-orange-200 bg-white/60 hover:border-rose-300'}`}
            >
              <div className="font-display text-lg font-bold">{t.label}</div>
              <div className="mt-1 text-sm text-stone-500">{t.tagline}</div>
            </button>
          ))}
        </section>

        {/* Drop zone */}
        <section className="mt-6">
          <Dropzone
            accept={accept}
            multiple
            hint={
              tool === 'merge'
                ? 'PDF files only — they merge in the order listed below'
                : 'JPG, PNG, WebP and more'
            }
            onFiles={(picked) => {
              setFiles((prev) => [...prev, ...picked])
              setResults([])
            }}
          />
        </section>

        {/* File list */}
        {files.length > 0 && (
          <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
            <ul className="divide-y divide-orange-100">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate text-sm">
                    {f.name} <span className="text-stone-400">({formatSize(f.size)})</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {tool === 'merge' && (
                      <>
                        <button onClick={() => moveFile(i, -1)} className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold" title="Move up">↑</button>
                        <button onClick={() => moveFile(i, 1)} className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold" title="Move down">↓</button>
                      </>
                    )}
                    <button
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            {/* Image settings */}
            {tool === 'images' && (
              <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-orange-100 pt-4">
                <label className="text-sm font-semibold">
                  Convert to
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="ml-2 rounded-xl border border-orange-200 bg-white px-3 py-2"
                  >
                    <option value="webp">WebP</option>
                    <option value="jpg">JPG</option>
                    <option value="png">PNG</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Quality: {Math.round(quality * 100)}%
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="ml-2 align-middle accent-rose-500"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Max width
                  <select
                    value={maxWidth}
                    onChange={(e) => setMaxWidth(e.target.value)}
                    className="ml-2 rounded-xl border border-orange-200 bg-white px-3 py-2"
                  >
                    <option value="">Original size</option>
                    <option value="1920">1920 px</option>
                    <option value="1280">1280 px</option>
                    <option value="800">800 px</option>
                  </select>
                </label>
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={busy}
              className="mt-5 w-full rounded-2xl bg-rose-500 py-3 font-display text-lg font-bold text-white shadow-md transition hover:bg-rose-600 disabled:opacity-50"
            >
              {busy ? 'Converting on your device…' : 'Convert now'}
            </button>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          </section>
        )}

        {/* Results */}
        {results.length > 0 && (
          <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="font-display text-xl font-bold">✅ Done — all on your device</h2>
            <ul className="mt-3 divide-y divide-orange-100">
              {results.map((r) => (
                <li key={r.name} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate text-sm">
                    {r.name}{' '}
                    <span className="text-stone-400">
                      {r.before ? `${formatSize(r.before)} → ${formatSize(r.after)}` : formatSize(r.after)}
                    </span>
                  </span>
                  <button
                    onClick={() => downloadBlob(r.blob, r.name)}
                    className="shrink-0 rounded-xl bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-600"
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={downloadAll}
              className="mt-4 w-full rounded-2xl bg-stone-800 py-3 font-display text-lg font-bold text-white hover:bg-stone-900"
            >
              {results.length === 1 ? 'Download file' : 'Download all as ZIP'}
            </button>
          </section>
        )}

        {/* Trust section — the product's identity, not an afterthought */}
        <section id="trust" className="mt-16 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold">Don't trust us. Check.</h2>
          <p className="mt-2 text-stone-500">
            Other converter sites take your files to their servers. This one
            physically can't — there is no server that receives files.
          </p>
          <ol className="mt-4 space-y-2 text-sm">
            <li className="rounded-2xl bg-orange-50 p-3">
              <b>1.</b> Press <kbd className="rounded bg-white px-1.5 py-0.5 shadow">F12</kbd> to open
              your browser's developer tools, then the <b>Network</b> tab.
            </li>
            <li className="rounded-2xl bg-orange-50 p-3">
              <b>2.</b> Convert a file on this page.
            </li>
            <li className="rounded-2xl bg-orange-50 p-3">
              <b>3.</b> Watch the Network tab: after the page first loads,{' '}
              <b>zero new requests</b>. Nothing leaves your device.
            </li>
          </ol>
          <p className="mt-4 text-sm text-stone-500">
            No account, no sign-up, no tracking of your files. The code is plain
            JavaScript running in this tab — that's the whole trick.
          </p>
        </section>
      </main>

      <footer className="border-t border-orange-200 py-6 text-center text-sm text-stone-400">
        Built client-side with React + Tailwind. Your files never leave this tab.
      </footer>
    </div>
  )
}
