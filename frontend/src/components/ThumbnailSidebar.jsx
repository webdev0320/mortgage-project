import { useRef, useEffect } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useWorkspaceStore from '../store/workspaceStore'
import { Scissors, Flag, RotateCw, GripVertical, AlertTriangle } from 'lucide-react'

const S3_BASE = import.meta.env.VITE_STORAGE_BASE ?? 'http://localhost:3001/storage/pages'

export default function ThumbnailSidebar() {
  const {
    pages, selectedPageIds, selectPage, splitAfterPage,
    rotatePage, staplePages, reorderPages, selectNext, selectPrev
  } = useWorkspaceStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) reorderPages(active.id, over.id)
  }

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'arrowdown') selectNext?.()
      if (key === 'arrowup') selectPrev?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectNext, selectPrev])

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] border-r border-white/5 shadow-2xl">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Capture Strip ({pages.length})
        </h3>
        {selectedPageIds.length > 1 && (
          <button
            onClick={staplePages}
            className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg shadow-lg hover:bg-indigo-500 transition-all animate-in fade-in slide-in-from-top-2"
          >
            <GripVertical className="w-3 h-3" /> Staple ({selectedPageIds.length})
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pt-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
             <div className="space-y-4">
               {pages.map((page, index) => (
                 <SortableItem 
                   key={page.id} 
                   page={page} 
                   index={index} 
                 />
               ))}
             </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="p-3 bg-surface-800 border-t border-white/5 flex gap-2">
         <ActionBtn icon={<RotateCw className="w-4 h-4" />} tip="Rotate Selected" onClick={() => rotatePage()} />
         <ActionBtn icon={<Flag className="w-4 h-4" />} tip="Flag Selected" onClick={() => rotatePage()} />
      </div>
    </div>
  )
}

function SortableItem({ page, index }) {
  const {
    pages, selectedPageIds, selectPage, splitAfterPage
  } = useWorkspaceStore()

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: page.id })

  const itemStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
    padding: '0 8px'
  }

  const isSelected = selectedPageIds.includes(page.id)
  const isLast = index === pages.length - 1
  const lowConfidence = (page.confidenceScore ?? 0) < 0.85

  return (
    <div ref={setNodeRef} style={itemStyle} className="flex flex-col gap-1">
      <div
        onClick={(e) => selectPage(page.id, e.metaKey || e.ctrlKey || e.shiftKey)}
        {...attributes}
        {...listeners}
        className={`
          group relative rounded-xl border-2 transition-all duration-200 cursor-grab active:cursor-grabbing overflow-hidden
          ${isSelected ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 bg-indigo-500/20' : 'border-white/5 hover:border-white/20 bg-surface-800'}
          ${lowConfidence ? 'ring-2 ring-red-500/50 ring-inset' : ''}
        `}
      >
        <img
          src={`${S3_BASE}/${page.s3Path}`}
          alt={`Page ${index + 1}`}
          style={{ transform: `rotate(${page.rotation}deg)` }}
          className="w-full aspect-[3/4] object-cover bg-surface-700 pointer-events-none"
        />

        <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
           <span className="bg-black/80 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded font-mono border border-white/10">
            {index + 1}
          </span>
          {page.isFlagged && (
            <span className="bg-red-500 text-white p-0.5 rounded shadow-lg">
              <AlertTriangle className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {isSelected && (
          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-lg border border-indigo-500">
             <div className="w-2 h-2 bg-indigo-600 rounded-full" />
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-2 pt-6 pointer-events-none">
           <p className="text-[10px] font-bold text-white truncate uppercase tracking-tight">
             {page.aiLabel || 'Classifying...'}
           </p>
           <div className="flex items-center gap-1.5 mt-1">
             <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
               <div
                 className={`h-full rounded-full transition-all duration-500 ${lowConfidence ? 'bg-red-500' : 'bg-indigo-400'}`}
                 style={{ width: `${(page.confidenceScore ?? 0) * 100}%` }}
               />
             </div>
             <span className={`text-[9px] font-mono font-bold ${lowConfidence ? 'text-red-400' : 'text-slate-400'}`}>
               {Math.round((page.confidenceScore || 0) * 100)}%
             </span>
           </div>
        </div>
      </div>

      {!isLast && (
        <button
          onClick={(e) => { e.stopPropagation(); splitAfterPage(page.id) }}
          className="
            relative h-6 w-full flex items-center justify-center
            hover:bg-indigo-500/10 rounded-md transition-all
          "
        >
          <div className="absolute inset-x-2 h-px bg-white/10 group-hover:bg-indigo-500/50" />
          <div className="
            z-10 scale-90 hover:scale-110 transition-all
            bg-indigo-600/80 text-white p-1 rounded-full shadow-lg border border-white/10
          ">
            <Scissors className="w-3.5 h-3.5" />
          </div>
        </button>
      )}
    </div>
  )
}

function ActionBtn({ icon, tip, onClick }) {
  return (
    <button
      title={tip}
      onClick={onClick}
      className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all shadow-lg active:scale-95"
    >
      {icon}
    </button>
  )
}
