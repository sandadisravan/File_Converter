import { useRef, useState } from 'react'

// A drag-and-drop zone built with plain browser events (no extra
// dependency). Deliberately says "add files", never "upload" —
// uploads are exactly what this site does NOT do.
export default function Dropzone({ accept, multiple, onFiles, hint }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files])
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-3xl border-2 border-dashed px-6 py-12 text-center transition
        ${dragging ? 'border-rose-400 bg-rose-50' : 'border-orange-300 bg-white/70 hover:border-rose-400'}`}
    >
      <div className="text-5xl">📂</div>
      <p className="mt-3 font-display text-xl font-bold text-stone-800">
        Drop files here, or click to add them
      </p>
      <p className="mt-1 text-sm text-stone-500">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files.length) onFiles([...e.target.files])
          e.target.value = '' // allow picking the same file again
        }}
      />
    </div>
  )
}
