import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Scissors, GripVertical, Check, X, 
  RotateCcw, Maximize2, Layers, Trash2, Save 
} from 'lucide-react'
import useWorkspaceStore from '../store/workspaceStore'

export default function SplitMergePage() {
  const { blobId } = useParams()
  const navigate = useNavigate()
  const { blob, pages, staplePages, splitAfterPage } = useWorkspaceStore()
  
  const [selectedIds, setSelectedIds] = useState([])
  const [hoveredSplitIndex, setHoveredSplitIndex] = useState(null)

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleStaple = () => {
    if (selectedIds.length < 2) return
    staplePages(selectedIds)
    setSelectedIds([])
  }

  const handleSplit = (pageId) => {
    splitAfterPage(pageId)
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d0f14] text-slate-300 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#13161e]/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/workspace/${blobId}`)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold leading-none mb-1">Split & Merge Manager</h1>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-mono">
              Editing: {blob?.filename || 'Untitled Document'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="btn-ghost"
            onClick={() => navigate(`/workspace/${blobId}`)}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
            onClick={() => navigate(`/workspace/${blobId}`)}
          >
            <Save className="w-4 h-4" /> Commit Changes
          </button>
        </div>
      </header>

      {/* Ribbon / Toolbar */}
      <div className="px-6 py-3 bg-[#13161e] border-b border-white/5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Selection</span>
            <div className="h-6 w-px bg-white/10 mx-1" />
            <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
              {selectedIds.length} Pages Selected
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={selectedIds.length < 2}
              onClick={handleStaple}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${selectedIds.length >= 2 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20' 
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'}
              `}
            >
              <GripVertical className="w-3.5 h-3.5" /> Staple & Group
            </button>
            <button 
              disabled={selectedIds.length === 0}
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-xs font-bold transition-all disabled:opacity-20"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase font-bold">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" /> Current Group
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full border border-white/20" /> Unassigned
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <main className="flex-1 overflow-y-auto p-12 scrollbar-thin">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-12 gap-x-8">
            {pages.map((page, index) => {
              const isSelected = selectedIds.includes(page.id)
              const isLast = index === pages.length - 1
              
              return (
                <div key={page.id} className="relative group">
                  {/* Page Card */}
                  <div 
                    onClick={() => toggleSelection(page.id)}
                    className={`
                      relative aspect-[3/4] rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden
                      ${isSelected 
                        ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-2xl scale-[1.02]' 
                        : 'border-white/10 hover:border-white/30 bg-surface-800'}
                    `}
                  >
                    <img 
                      src={`http://localhost:3001/storage/pages/${page.s3Path}`}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    
                    {/* Page Number Overlay */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white border border-white/10">
                      {index + 1}
                    </div>

                    {/* AI Label Overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 pointer-events-none">
                      <span className="text-[10px] font-bold text-white uppercase tracking-tight opacity-70">
                        {page.aiLabel || 'Unclassified'}
                      </span>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg animate-in zoom-in">
                        <Check className="w-3 h-3 text-white stroke-[3px]" />
                      </div>
                    )}
                  </div>

                  {/* Split Visual Indicator (Between Pages) */}
                  {!isLast && (
                    <div 
                      className="absolute -right-4 top-0 bottom-0 w-8 flex flex-col items-center justify-center z-10"
                      onMouseEnter={() => setHoveredSplitIndex(index)}
                      onMouseLeave={() => setHoveredSplitIndex(null)}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSplit(page.id) }}
                        className={`
                          group/split-btn relative flex flex-col items-center gap-2 transition-all duration-200
                          ${hoveredSplitIndex === index ? 'opacity-100' : 'opacity-0'}
                        `}
                      >
                        <div className="h-12 w-px bg-gradient-to-b from-transparent via-indigo-500 to-transparent" />
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl border border-white/20 group-hover/split-btn:scale-125 transition-transform">
                          <Scissors className="w-3.5 h-3.5" />
                        </div>
                        <div className="h-12 w-px bg-gradient-to-b from-indigo-500 via-indigo-500 to-transparent" />
                        <span className="absolute -bottom-6 whitespace-nowrap text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                          SPLIT HERE
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Empty State / Add Page Mock */}
            <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-3 bg-white/2 hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                <Layers className="w-6 h-6 text-slate-600 group-hover:text-slate-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Add Pages</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="h-10 bg-black/40 border-t border-white/5 flex items-center justify-between px-6 text-[9px] font-mono text-slate-600">
        <span>WORKFLOW_NODE: SPLIT_MERGE_ENGINE_V1</span>
        <div className="flex gap-4">
          <span>PAGES: {pages.length}</span>
          <span>SESSIONS: ACTIVE</span>
        </div>
      </footer>
    </div>
  )
}
