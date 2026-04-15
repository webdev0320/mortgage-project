import { useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import useWorkspaceStore from '../store/workspaceStore'
import {
  ZoomIn, ZoomOut, RotateCcw, Maximize2,
  ChevronLeft, ChevronRight, Download, MousePointer2,
  Hand
} from 'lucide-react'

const S3_BASE = import.meta.env.VITE_STORAGE_BASE ?? 'http://localhost:3001/storage/pages'

export default function MainCanvas() {
  const { pages, selectedPageId, selectPage, rotatePage } = useWorkspaceStore()
  const [imgError, setImgError] = useState(false)
  const [isPanning, setIsPanning] = useState(true)

  const page = pages.find((p) => p.id === selectedPageId)
  const idx = pages.findIndex((p) => p.id === selectedPageId)

  const prev = () => idx > 0 && selectPage(pages[idx - 1].id)
  const next = () => idx < pages.length - 1 && selectPage(pages[idx + 1].id)

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] relative overflow-hidden">
      {/* Toolbar - Floating & Glassy */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-2 glass rounded-2xl shadow-2xl border-white/10">
        <button className="btn-ghost p-2" onClick={prev} disabled={idx <= 0}>
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-white/10 mx-2" />

        <button className={`p-2 rounded-xl transition-all ${isPanning ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`} onClick={() => setIsPanning(true)}>
          <Hand className="w-4 h-4" />
        </button>
        <button className={`p-2 rounded-xl transition-all ${!isPanning ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`} onClick={() => setIsPanning(false)}>
          <MousePointer2 className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-white/10 mx-2" />

        <button id="zoom-out" className="btn-ghost p-2 text-slate-400 hover:text-white">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button id="zoom-in" className="btn-ghost p-2 text-slate-400 hover:text-white">
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-white/10 mx-2" />

        <button className="btn-ghost p-2 text-slate-400 hover:text-white" onClick={() => rotatePage(page?.id)}>
          <RotateCcw className="w-4 h-4" />
        </button>

        <button className="btn-ghost p-2 text-slate-400 hover:text-white">
          <Download className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-white/10 mx-2" />

        <button className="btn-ghost p-2" onClick={next} disabled={idx >= pages.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-12 mt-12">
        {page ? (
          <TransformWrapper
            initialScale={1}
            minScale={0.2}
            maxScale={5}
            disabled={!isPanning}
            centerOnInit
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* We map the toolbar buttons to these internally if needed, but for now we rely on the library handles */}
                {/* Direct access to buttons for external control requires refs, but library handles +/- keys and scroll automatically */}
                <TransformComponent wrapperClassName="!w-full !h-full" contentClassName="!flex !items-center !justify-center">
                   <div className="relative group p-4">
                      <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative fade-up rounded-sm shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/5 bg-white overflow-hidden">
                        {imgError ? (
                          <div className="w-[600px] aspect-[3/4] flex items-center justify-center bg-surface-900 text-slate-600">
                             Image format error
                          </div>
                        ) : (
                          <img
                            key={page.id}
                            src={`${S3_BASE}/${page.s3Path}`}
                            alt={`Page ${idx + 1}`}
                            style={{
                              transform: `rotate(${page.rotation}deg)`,
                              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            className="block max-w-[80vw] max-h-[80vh] w-auto h-auto select-none pointer-events-none"
                            onLoad={() => setImgError(false)}
                            onError={() => setImgError(true)}
                          />
                        )}
                      </div>

                      {/* AI Ribbon Overlay */}
                      {page.aiLabel && (
                        <div className="absolute top-8 left-8 right-8 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                             <span className="text-sm font-bold text-white tracking-wide">{page.aiLabel}</span>
                           </div>
                           <ConfidenceBadge score={page.confidenceScore} />
                        </div>
                      )}
                   </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-700">
            <Hand className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">Capture a page from the strip to view</p>
          </div>
        )}
      </div>

      {/* Page Selector Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 glass rounded-full text-[11px] font-mono text-slate-400">
         <span>DOCUMENT_FLIGHT_PATH</span>
         <div className="h-3 w-px bg-white/10" />
         <span className="text-white font-bold">{idx + 1} OF {pages.length}</span>
         {page?.filename && (
           <span className="opacity-50 text-[9px] truncate max-w-[100px]">{page.filename}</span>
         )}
      </div>
    </div>
  )
}

function ConfidenceBadge({ score }) {
  const pct = Math.round((score ?? 0) * 100)
  const isHigh = pct >= 80
  return (
    <div className={`
      px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors
      ${isHigh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}
    `}>
      {pct}% AI CONFIDENCE
    </div>
  )
}
