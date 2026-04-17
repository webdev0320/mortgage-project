import axios from 'axios'

const api = axios.create({ 
  baseURL: '/api',
  withCredentials: true 
})

export const uploadBlob = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded / e.total) * 100)),
  })
}

export const fetchBlobs = () => api.get('/blobs')
export const fetchBlob = (id) => api.get(`/blobs/${id}`)
export const deleteBlob = (id) => api.delete(`/blobs/${id}`)
export const updatePage = (id, data) => api.patch(`/pages/${id}`, data)
export const splitDocument = (payload) => api.post('/documents/split', payload)
export const mergeDocuments = (payload) => api.post('/documents/merge', payload)
export const verifyDocument = (id, payload) => api.patch(`/documents/${id}/verify`, payload)
export const renameDocument = (id, payload) => api.patch(`/documents/${id}/rename`, payload)

// Admin
export const fetchUsers = () => api.get('/admin/users')
export const createUser = (data) => api.post('/auth/register', data) // For creating user accounts
export const updateUser = (id, data) => api.patch(`/admin/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/admin/users/${id}`)

export const fetchConfiguredDocTypes = () => api.get('/admin/doc-types')
export const createConfiguredDocType = (data) => api.post('/admin/doc-types', data)
export const deleteConfiguredDocType = (id) => api.delete(`/admin/doc-types/${id}`)
