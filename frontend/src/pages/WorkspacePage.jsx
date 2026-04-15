import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useWorkspaceStore from '../store/workspaceStore'
import ThumbnailSidebar from '../components/ThumbnailSidebar'
import MainCanvas from '../components/MainCanvas'
import PropertiesPanel from '../components/PropertiesPanel'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

export default function WorkspacePage() {
  const { blobId } = useParams()
  const navigate = useNavigate()
  const { blob, loading, error, loadBlob } = useWorkspaceStore()

  useEffect(() => { loadBlob(blobId) }, [blobId])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-slate-400">Loading workspace…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-300">{error}</p>
        <button className="btn-ghost" onClick={() => navigate('/')}>← Back to Dashboard</button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-surface-900 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-2.5 bg-surface-800 border-b border-white/5 shrink-0">
        <button
          id="back-to-dashboard"
          onClick={() => navigate('/')}
          className="btn-ghost text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </button>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-sm font-medium text-white truncate">{blob?.filename}</span>
        <span className="text-xs text-slate-500">{blob?.pageCount} pages</span>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={blob?.status} />
        </div>
      </header>

      {/* 3-pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Thumbnail sidebar */}
        <aside className="w-56 panel shrink-0">
          <ThumbnailSidebar />
        </aside>

        {/* Center: Main canvas */}
        <main className="flex-1 overflow-hidden">
          <MainCanvas />
        </main>

        {/* Right: Properties panel */}
        <aside className="w-72 panel border-l border-white/5 border-r-0 shrink-0">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    PENDING:    'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    PROCESSING: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    COMPLETED:  'bg-green-500/15 text-green-300 border-green-500/30',
    FAILED:     'bg-red-500/15 text-red-300 border-red-500/30',
  }
  return (
    <span className={`badge border ${map[status] || map.PENDING}`}>
      {status === 'PROCESSING' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
      {status}
    </span>
  )
}
