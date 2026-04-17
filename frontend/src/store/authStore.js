import { create } from 'zustand'
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
})

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      set({ user: data.data })
      return true
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed' })
      return false
    }
  },

  register: async (email, password, name) => {
    set({ error: null })
    try {
      const { data } = await api.post('/auth/register', { email, password, name })
      set({ user: data.data })
      return true
    } catch (err) {
      set({ error: err.response?.data?.message || 'Registration failed' })
      return false
    }
  },

  logout: async () => {
    await api.post('/auth/logout')
    set({ user: null })
    window.location.href = '/login'
  }
}))

export default useAuthStore
