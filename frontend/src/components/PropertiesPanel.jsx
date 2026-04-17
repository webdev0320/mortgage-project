import { useState, useEffect } from 'react'
import { fetchConfiguredDocTypes } from '../api/client'
import useWorkspaceStore from '../store/workspaceStore'
import { CheckCircle2, ChevronDown, FileText, Layers, Merge, AlertTriangle } from 'lucide-react'

const DOCUMENT_TYPES = [
  'W-2', '1099-NEC', 'Paystub', 'Bank Statement', 'Mortgage Statement',
  'Tax Return (1040)', "Driver's License", 'Social Security Card',
  'Insurance Declaration', 'Unknown',
]

export default function PropertiesPanel() {
  const {
    pages, documents, selectedPageId, selectedDocumentId,
    selectDocument, verifyDocument, renameDocument, mergeDocuments,
  } = useWorkspaceStore()

  const page = pages.find((p) => p.id === selectedPageId)
  const doc = documents.find((d) => d.id === selectedDocumentId)

  const [docType, setDocType] = useState('')
  const [docName, setDocName] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [availableTypes, setAvailableTypes] = useState([])

  useEffect(() => {
    fetchConfiguredDocTypes().then(({ data }) => setAvailableTypes(data.data))
  }, [])

  useEffect(() => {
    if (doc) { setDocType(doc.documentType || ''); setDocName(doc.name || '') }
  }, [doc?.id])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleVerify = async () => {
    if (!doc) return
    setBusy(true)
    try {
      await verifyDocument(doc.id, docType, docName)
      showToast('Document verified ✓')
    } catch { showToast('Verify failed', 'error') }
    finally { setBusy(false) }
  }

  const handleRename = async () => {
    if (!doc) return
    setBusy(true)
    try {
      await renameDocument(doc.id, docName, docType)
      showToast('Document renamed ✓')
    } catch { showToast('Rename failed', 'error') }
    finally { setBusy(false) }
  }

  const handleMerge = async () => {
    if (!doc || !mergeTarget || mergeTarget === doc.id) return
    setBusy(true)
    try {
      await mergeDocuments(doc.id, mergeTarget)
      showToast('Documents merged ✓')
      setMergeTarget('')
    } catch { showToast('Merge failed', 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span>AI Properties</span>
        {doc && (
          <StatusBadge status={doc.status} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        {/* ── LOW CONFIDENCE BANNER ── */}
        {page && (page.confidenceScore < 0.85 || (page.anomalyFlags && JSON.parse(page.anomalyFlags).length > 0)) && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Attention Required</p>
              <p className="text-xs text-red-200/70 mt-0.5">
                {page.confidenceScore < 0.85 ? 'Low AI confidence.' : ''} 
                {page.anomalyFlags && JSON.parse(page.anomalyFlags).join(', ')} detected.
              </p>
            </div>
          </div>
        )}

        {/* ── Current Page Info ── */}
        {page && (
          <Section title="Current Page" icon={<FileText className="w-3.5 h-3.5" />}>
            <InfoRow label="AI Label" value={page.aiLabel || '—'} />
            <InfoRow label="Confidence" value={(page.confidenceScore !== null && page.confidenceScore !== undefined) ? `${(page.confidenceScore * 100).toFixed(1)}%` : '—'} />
            <InfoRow label="Index" value={`Page ${(pages.findIndex(p => p.id === page.id)) + 1}`} />
            {page.isFlagged && (
              <div className="flex items-center gap-1.5 text-xs text-red-300 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Flagged for review
              </div>
            )}
          </Section>
        )}

        {/* ── Extracted Data (The Reader) ── */}
        {page && page.extractedData && (
          <Section title="Extracted Entities" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}>
             <div className="space-y-2">
               {Object.entries(JSON.parse(page.extractedData)).map(([k, v]) => (
                 <div key={k} className="bg-white/5 rounded-lg p-3 border border-white/5 group hover:border-indigo-500/30 transition-all">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{k.replace('_', ' ')}</p>
                    <p className="text-sm font-mono text-indigo-200 mt-1">{v}</p>
                 </div>
               ))}
             </div>
          </Section>
        )}
        <Section title="Documents" icon={<Layers className="w-3.5 h-3.5" />}>
          <div className="space-y-1">
            {documents.map((d) => (
              <button
                key={d.id}
                id={`doc-select-${d.id}`}
                onClick={() => selectDocument(d.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 border
                  ${d.id === selectedDocumentId
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                    : 'bg-surface-700 border-white/5 text-slate-300 hover:border-white/20'}
                `}
              >
                <p className="font-medium truncate">{d.name}</p>
                <p className="text-slate-500 mt-0.5">{d.documentType} · {d.pages?.length ?? 0}p</p>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Document Editor ── */}
        {doc && (
          <Section title="Edit Document" icon={<FileText className="w-3.5 h-3.5" />}>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Classification</label>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative">
                <select
                  id="doc-type-select"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="
                    w-full bg-[#13161e] border border-white/10 rounded-xl px-4 py-3 pr-10
                    text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50
                    cursor-pointer transition-all
                  "
                >
                  <optgroup label="AI BEST GUESS" className="text-indigo-400">
                    <option value={doc.documentType} className="bg-indigo-900/40">{doc.documentType} (Confident)</option>
                  </optgroup>
                  <optgroup label="COMMON MORTGAGE TYPES" className="text-slate-500">
                    {availableTypes.filter(t => t.code !== doc.documentType).map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
               <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Internal Name</label>
                  <input
                    id="doc-name-input"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Auto-generated name..."
                    className="
                      w-full bg-[#13161e] border border-white/10 rounded-xl px-4 py-3
                      text-sm text-white placeholder-slate-700
                      focus:outline-none focus:border-indigo-500/50 transition-all
                    "
                  />
               </div>

               <div className="flex gap-2">
                 <button
                   id="verify-doc-btn"
                   className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   onClick={handleVerify}
                   disabled={busy}
                 >
                   <CheckCircle2 className="w-4 h-4" />
                   {busy ? 'SYNCHRONIZING...' : 'VERIFY & LOCK'}
                 </button>
               </div>
            </div>
          </Section>
        )}

        {/* ── Merge ── */}
        {doc && documents.length > 1 && (
          <Section title="Merge Into" icon={<Merge className="w-3.5 h-3.5" />}>
            <p className="text-xs text-slate-500 mb-2">Merge current document into another:</p>
            <div className="relative">
              <select
                id="merge-target-select"
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                className="
                  w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 pr-8
                  text-sm text-white appearance-none focus:outline-none focus:border-indigo-500
                "
              >
                <option value="">Select target…</option>
                {documents.filter((d) => d.id !== doc.id).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <button
              id="merge-doc-btn"
              className="btn-danger w-full mt-2 text-xs justify-center"
              onClick={handleMerge}
              disabled={!mergeTarget || busy}
            >
              <Merge className="w-3.5 h-3.5" /> Merge Documents
            </button>
          </Section>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`
          absolute bottom-4 left-4 right-4 px-4 py-3 rounded-xl text-xs font-medium
          flex items-center gap-2 shadow-xl border fade-up
          ${toast.type === 'error'
            ? 'bg-red-600/20 border-red-500/30 text-red-200'
            : 'bg-green-600/20 border-green-500/30 text-green-200'}
        `}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-200 font-mono">{value}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'HUMAN_VERIFIED') return <span className="badge-verified">Verified</span>
  if (status === 'AI_CLASSIFIED') return <span className="badge-ai">AI</span>
  return null
}
