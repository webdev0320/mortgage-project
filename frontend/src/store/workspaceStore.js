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
    const { documents, blob } = get()

    // 1. Find the document that currently contains this page
    const sourceDoc = documents.find(doc => doc.pages.some(dp => dp.pageId === pageId))
    if (!sourceDoc) return

    // 2. Identify the pages in that document that come AFTER the split point
    const docPages = sourceDoc.pages // These are already ordered by 'order' from the backend
    const splitIndex = docPages.findIndex(dp => dp.pageId === pageId)

    // If it's the last page of the document, there's nothing to split "after"
    if (splitIndex < 0 || splitIndex >= docPages.length - 1) return

    const movingPages = docPages.slice(splitIndex + 1).map(dp => dp.pageId)

    // 3. Move only those subsequent pages to a new document
    const { data } = await splitDocument({
      blobId: blob.id,
      pageIds: movingPages,
      documentType: sourceDoc.documentType,
      name: sourceDoc.name
    })

    // 4. Update state with the fresh list of documents from the backend
    set({ documents: data.allDocuments })
  },

  staplePages: async () => {
    const { selectedPageIds, pages, blob } = get()
    if (selectedPageIds.length < 2) return
    const selected = pages.filter(p => selectedPageIds.includes(p.id))
    const label = selected[0]?.aiLabel || 'Stapled Document'
    const { data } = await splitDocument({ blobId: blob.id, pageIds: selectedPageIds, documentType: label, name: label })

    // Use allDocuments to ensure consistency
    set({
      documents: data.allDocuments,
      selectedPageIds: [],
      selectedDocumentId: data.data.id
    })
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
