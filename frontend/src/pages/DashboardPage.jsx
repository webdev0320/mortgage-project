import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadBlob, fetchBlobs, deleteBlob, fetchDemoFiles, ingestDemoFile } from '../api/client'
import {
  CloudUpload, FileText, Loader2, CheckCircle2,
  AlertCircle, Search, Calendar, Filter, ArrowRight,
  MoreVertical, Clock, Check, Trash2, X, LogOut, User as UserIcon
} from 'lucide-react'
import useAuthStore from '../store/authStore'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState([]) // Tracker for current uploads
  const [blobs, setBlobs] = useState([]) // Persistent list from server
  const [search, setSearch] = useState('')
  const [loadingBlobs, setLoadingBlobs] = useState(true)

  useEffect(() => {
    loadBlobs()
    loadDemoFiles()

    // Adaptive polling: fast when jobs are active, slow when idle
    let interval
    const scheduleNext = (blobList) => {
      clearInterval(interval)
      const hasActive = blobList.some(b => b.status === 'PROCESSING' || b.status === 'EXPLODED')
      const delay = hasActive ? 2000 : 10000
      interval = setInterval(async () => {
        const { data } = await fetchBlobs().catch(() => ({ data: { data: [] } }))
        setBlobs(data.data)
        scheduleNext(data.data)
      }, delay)
    }

    // Bootstrap: fetch once then set adaptive interval
    fetchBlobs()
      .then(({ data }) => { setBlobs(data.data); scheduleNext(data.data) })
      .catch(() => {})

    return () => clearInterval(interval)
  }, [])

  const [demoFiles, setDemoFiles] = useState([])
  const loadDemoFiles = async () => {
    try {
      const { data } = await fetchDemoFiles()
      setDemoFiles(data.data)
    } catch (e) { console.error(e) }
  }

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

  const handleIngest = async (filename) => {
    const trackerId = Math.random().toString(36).substr(2, 9)
    setUploads(prev => [{ id: trackerId, name: filename, progress: 100, status: 'done' }, ...prev])
    
    try {
      const { data } = await ingestDemoFile(filename)
      setUploads(curr => curr.map(u => u.id === trackerId ? { ...u, blobId: data.blob.id } : u))
      loadBlobs()
    } catch (e) {
      setUploads(curr => curr.map(u => u.id === trackerId ? { ...u, status: 'error', error: e.message } : u))
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

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white leading-none">{user?.name || 'Operator'}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{user?.role}</span>
          </div>
          
          <button 
            onClick={logout}
            className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-white/5"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
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
                  blob={blobs.find(b => b.id === u.blobId)}
                  onOpen={() => navigate(`/workspace/${u.blobId}`)} 
                  onCancel={() => setUploads(curr => curr.filter(x => x.id !== u.id))}
                />
              ))}
            </div>
          </section>
        )}

        {/* Server Repository (Demo Files) */}
        {demoFiles.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Server Repository (demo_file)</h3>
              <span className="text-[10px] text-indigo-400 font-mono animate-pulse">DIRECT INGEST AVAILABLE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {demoFiles.map(file => (
                <div 
                  key={file.name}
                  className="p-5 rounded-2xl bg-surface-800/40 border border-white/5 hover:border-indigo-500/30 hover:bg-surface-800 transition-all group cursor-pointer"
                  onClick={() => handleIngest(file.name)}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white truncate mb-1">{file.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <button className="text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      INGEST <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
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

function UploadCard({ upload, blob, onOpen, onCancel }) {
  const isDone = upload.status === 'done'
  const isError = upload.status === 'error'

  // During the AI phase, use the real progress from the polled blob record
  const isCompleted = blob?.status === 'COMPLETED'
  const ingestProgress = blob?.progress ?? 0
  const isAiPhase = isDone && !isCompleted

  // Determine the status label and icon colour
  let statusLabel = 'Uploading...'
  let iconBg = 'bg-indigo-500/20 text-indigo-400'
  if (isCompleted) {
    statusLabel = 'Ready for Review'
    iconBg = 'bg-green-500/20 text-green-400'
  } else if (isAiPhase) {
    const blobStatus = blob?.status
    if (blobStatus === 'EXPLODED') statusLabel = `AI Classifying — ${ingestProgress}%`
    else if (blobStatus === 'PROCESSING') statusLabel = 'Exploding PDF...'
    else statusLabel = 'Queued...'
    iconBg = 'bg-indigo-500/20 text-indigo-400'
  } else if (!isDone && !isError) {
    statusLabel = `Uploading — ${upload.progress}%`
  }

  return (
    <div className={`
      p-4 rounded-2xl border transition-all duration-300
      ${isCompleted ? 'bg-green-500/5 border-green-500/20' : isError ? 'bg-red-500/5 border-red-500/20' : 'bg-surface-800/80 border-white/10'}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
            {isCompleted
              ? <Check className="w-4 h-4" />
              : isAiPhase
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate w-40">{upload.name}</p>
            <p className="text-[10px] text-slate-400">{statusLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && upload.blobId && (
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

      {/* Upload phase progress */}
      {!isDone && !isError && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Uploading</span>
            <span className="font-mono">{upload.progress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300 rounded-full" style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      )}

      {/* AI ingestion phase progress */}
      {isAiPhase && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Ingestion</span>
            <span className="font-mono text-indigo-400">{ingestProgress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 rounded-full"
              style={{ width: `${ingestProgress}%` }}
            />
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
    EXPLODED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  }

  const steps = {
    PENDING:    'Queued',
    PROCESSING: 'Exploding PDF',
    EXPLODED:   'AI Classifying',
    COMPLETED:  'Ready for Review',
    FAILED:     'Failed'
  }

  const isActive = blob.status === 'PROCESSING' || blob.status === 'EXPLODED'
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
        {isActive && (
          <div className="mt-2 space-y-1">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden w-48">
              <div
                className="h-full bg-indigo-500 transition-all duration-700 rounded-full"
                style={{ width: `${blob.progress || 0}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-indigo-400">{blob.progress || 0}% complete</span>
          </div>
        )}
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
