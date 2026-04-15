import { create } from 'zustand'
import { fetchBlob, updatePage, splitDocument, mergeDocuments, verifyDocument, renameDocument } from '../api/client'

const useWorkspaceStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  blob: null,
  pages: [],
  documents: [],
  selectedPageId: null,
  selectedPageIds: [], // Added for multi-select
  selectedDocumentId: null,
  zoom: 1,
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────
  loadBlob: async (blobId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await fetchBlob(blobId)
      const firstPageId = data.data.pages[0]?.id ?? null
      set({
        blob: data.data,
        pages: data.data.pages,
        documents: data.data.documents,
        loading: false,
        selectedPageId: firstPageId,
        selectedPageIds: firstPageId ? [firstPageId] : [],
        selectedDocumentId: data.data.documents[0]?.id ?? null,
      })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  selectPage: (pageId, multi = false) => {
    const { selectedPageIds } = get()
    if (multi) {
      const nextIds = selectedPageIds.includes(pageId)
        ? selectedPageIds.filter(id => id !== pageId)
        : [...selectedPageIds, pageId]
      set({ selectedPageIds: nextIds, selectedPageId: pageId })
    } else {
      set({ selectedPageId: pageId, selectedPageIds: [pageId] })
    }
  },

  selectDocument: (docId) => set({ selectedDocumentId: docId }),

  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.25, zoom)) }),

  reorderPages: (activeId, overId) => {
    const { pages } = get()
    const oldIndex = pages.findIndex(p => p.id === activeId)
    const newIndex = pages.findIndex(p => p.id === overId)
    if (oldIndex === newIndex) return
    const newPages = [...pages]
    const [movedItem] = newPages.splice(oldIndex, 1)
    newPages.splice(newIndex, 0, movedItem)
    set({ pages: newPages })
  },

  rotatePage: async (pageId) => {
    const { pages, selectedPageIds } = get()
    const ids = pageId ? [pageId] : selectedPageIds
    const newPages = pages.map(p => {
      if (ids.includes(p.id)) {
        const nextRot = (p.rotation + 90) % 360
        updatePage(p.id, { rotation: nextRot })
        return { ...p, rotation: nextRot }
      }
      return p
    })
    set({ pages: newPages })
  },

  flagPage: async (pageId, isFlagged) => {
    const { pages, selectedPageIds } = get()
    const ids = pageId ? [pageId] : selectedPageIds
    const nextPages = pages.map(p => {
      if (ids.includes(p.id)) {
        updatePage(p.id, { isFlagged })
        return { ...p, isFlagged }
      }
      return p
    })
    set({ pages: nextPages })
  },

  splitAfterPage: async (pageId) => {
    const { pages, blob, documents } = get()
    const idx = pages.findIndex((p) => p.id === pageId)
    if (idx < 0 || idx >= pages.length - 1) return

    const firstGroup = pages.slice(0, idx + 1)
    const secondGroup = pages.slice(idx + 1)

    const label1 = firstGroup[0]?.aiLabel || 'Document'
    const label2 = secondGroup[0]?.aiLabel || 'Document'

    const [r1, r2] = await Promise.all([
      splitDocument({ blobId: blob.id, pageIds: firstGroup.map((p) => p.id), documentType: label1, name: label1 }),
      splitDocument({ blobId: blob.id, pageIds: secondGroup.map((p) => p.id), documentType: label2, name: label2 }),
    ])

    set({ documents: [r1.data.data, r2.data.data] })
  },

  staplePages: async () => {
    const { selectedPageIds, pages, blob, documents } = get()
    if (selectedPageIds.length < 2) return
    const selected = pages.filter(p => selectedPageIds.includes(p.id))
    const label = selected[0]?.aiLabel || 'Stapled Document'
    const { data } = await splitDocument({ blobId: blob.id, pageIds: selectedPageIds, documentType: label, name: label })
    set({ documents: [...documents, data.data], selectedPageIds: [], selectedDocumentId: data.data.id })
  },

  mergeDocuments: async (sourceId, targetId) => {
    const { blob, documents } = get()
    const { data } = await mergeDocuments({ sourceDocumentId: sourceId, targetDocumentId: targetId, blobId: blob.id })
    set({
      documents: documents.filter((d) => d.id !== sourceId).map((d) => (d.id === targetId ? data.data : d)),
      selectedDocumentId: targetId,
    })
  },

  verifyDocument: async (docId, documentType, name) => {
    const { blob, documents } = get()
    const { data } = await verifyDocument(docId, { documentType, name, blobId: blob.id })
    set({ documents: documents.map((d) => (d.id === docId ? { ...d, ...data.data } : d)) })
  },

  renameDocument: async (docId, name, documentType) => {
    const { blob, documents } = get()
    const { data } = await renameDocument(docId, { name, documentType, blobId: blob.id })
    set({ documents: documents.map((d) => (d.id === docId ? { ...d, ...data.data } : d)) })
  },

  selectNext: () => {
    const { pages, selectedPageId } = get()
    const idx = pages.findIndex(p => p.id === selectedPageId)
    if (idx < pages.length - 1) set({ selectedPageId: pages[idx + 1].id, selectedPageIds: [pages[idx + 1].id] })
  },

  selectPrev: () => {
    const { pages, selectedPageId } = get()
    const idx = pages.findIndex(p => p.id === selectedPageId)
    if (idx > 0) set({ selectedPageId: pages[idx - 1].id, selectedPageIds: [pages[idx - 1].id] })
  },
}))

export default useWorkspaceStore
