import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadBlob, fetchBlobs } from '../api/client'
import {
  CloudUpload, FileText, Loader2, CheckCircle2,
  AlertCircle, Search, Calendar, Filter, ArrowRight,
  MoreVertical, Clock, Check, Trash2, X
} from 'lucide-react'
import { deleteBlob } from '../api/client'

export default function DashboardPage() {
  const navigate = useNavigate()
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState([]) // Tracker for current uploads
  const [blobs, setBlobs] = useState([]) // Persistent list from server
  const [search, setSearch] = useState('')
  const [loadingBlobs, setLoadingBlobs] = useState(true)

  useEffect(() => {
    loadBlobs()
    const interval = setInterval(loadBlobs, 5000) // Poll for status updates
    return () => clearInterval(interval)
  }, [])

  const loadBlobs = async () => {
    try {
      const { data } = await fetchBlobs()
      setBlobs(data.data)
    } catch (e) {
      console.error('Failed to load blobs', e)
    } finally {
      setLoadingBlobs(false)
    }
  }

  const handleFiles = async (files) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) return

    const newUploads = pdfs.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
      status: 'uploading'
    }))

    setUploads(prev => [...newUploads, ...prev])

    for (let i = 0; i < pdfs.length; i++) {
      const file = pdfs[i]
      const trackerId = newUploads[i].id

      try {
        const { data } = await uploadBlob(file, (p) => {
          setUploads(curr => curr.map(u => u.id === trackerId ? { ...u, progress: p } : u))
        })
        setUploads(curr => curr.map(u => u.id === trackerId ? { ...u, status: 'done', blobId: data.blob.id } : u))
        loadBlobs()
      } catch (e) {
        setUploads(curr => curr.map(u => u.id === trackerId ? { ...u, status: 'error', error: e.message } : u))
      }
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const filteredBlobs = blobs.filter(b =>
    b.filename.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this blob and all its data? This cannot be undone.')) return
    try {
      await deleteBlob(id)
      setBlobs(curr => curr.filter(b => b.id !== id))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-200">
      {/* Search Header */}
      <header className="sticky top-0 z-10 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Workbench</span>
          </div>

          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search blobs by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-ghost text-xs">
            <Calendar className="w-4 h-4" /> Filter Date
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-300">Live Backend Connected</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 space-y-10">
        {/* Bulk Uploader */}
        <section>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current.click()}
            className={`
              relative group overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
              flex flex-col items-center justify-center p-12
              ${dragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 bg-surface-900/50 hover:border-indigo-500/30 hover:bg-surface-800/50'}
            `}
          >
            <input ref={inputRef} type="file" multiple accept=".pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CloudUpload className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Smart Ingestion</h2>
              <p className="text-slate-400 max-w-md">
                Drag and drop your bulk mortgage packages here. Our AI will automatically
                <span className="text-indigo-400 mx-1">explode</span>,
                <span className="text-indigo-400 mx-1">classify</span>, and
                <span className="text-indigo-400 mx-1">prepare</span> them.
              </p>
            </div>

            {/* Background Decoration */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent pointer-events-none" />
          </div>
        </section>

        {/* Active Uploads Monitoring */}
        {uploads.length > 0 && (
          <section className="fade-up space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Live Monitors</h3>
              <button onClick={() => setUploads([])} className="text-xs text-slate-600 hover:text-slate-400">Clear Finished</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {uploads.map(u => (
                <UploadCard 
                  key={u.id} 
                  upload={u} 
                  onOpen={() => navigate(`/workspace/${u.blobId}`)} 
                  onCancel={() => setUploads(curr => curr.filter(x => x.id !== u.id))}
                />
              ))}
            </div>
          </section>
        )}

        {/* Main List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Recent Blobs</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              Total: {blobs.length} | Processed: {blobs.filter(b => b.status === 'COMPLETED').length}
            </div>
          </div>

          <div className="space-y-2">
            {loadingBlobs ? (
              <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm">Fetching repository...</p>
              </div>
            ) : filteredBlobs.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">No blobs found matching your search</p>
              </div>
            ) : (
              filteredBlobs.map(blob => (
                <BlobRow 
                  key={blob.id} 
                  blob={blob} 
                  onOpen={() => navigate(`/workspace/${blob.id}`)} 
                  onDelete={(e) => handleDelete(e, blob.id)}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function UploadCard({ upload, onOpen, onCancel }) {
  const isDone = upload.status === 'done'
  const isError = upload.status === 'error'

  return (
    <div className={`
      p-4 rounded-2xl border transition-all duration-300
      ${isDone ? 'bg-green-500/5 border-green-500/20' : isError ? 'bg-red-500/5 border-red-500/20' : 'bg-surface-800 border-white/10'}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-500/20 text-green-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
            {isDone ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate w-40">{upload.name}</p>
            <p className="text-[10px] text-slate-500">{isDone ? 'AI Classifying...' : 'Uploading...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDone && (
            <button onClick={onOpen} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isDone && !isError && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Progress</span>
            <span>{upload.progress}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      )}

      {isError && <p className="text-[10px] text-red-400 mt-2">{upload.error}</p>}
    </div>
  )
}

function BlobRow({ blob, onOpen, onDelete }) {
  const statusStyles = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  const steps = {
    PENDING: 'Queued',
    PROCESSING: 'Exploding PDF',
    AI_PROCESSING: 'AI Classifying', // Future-proof if backend adds this
    COMPLETED: 'Ready for Review'
  }

  return (
    <div
      onClick={onOpen}
      className="
        group flex items-center gap-4 px-6 py-4 rounded-2xl bg-surface-800/30 border border-white/5
        hover:bg-surface-800 hover:border-white/10 transition-all cursor-pointer
      "
    >
      <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
        <FileText className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white truncate">{blob.filename}</h4>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {new Date(blob.createdAt).toLocaleDateString()} at {new Date(blob.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <div className="w-1 h-1 rounded-full bg-slate-600" />
            {blob.pageCount} pages
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyles[blob.status] || statusStyles.PENDING}`}>
          <span className="flex items-center gap-1.5">
            {blob.status === 'PROCESSING' && <Loader2 className="w-3 h-3 animate-spin" />}
            {steps[blob.status] || blob.status}
          </span>
        </div>

        <button 
          onClick={onDelete}
          className="p-2 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
