import axios from 'axios'
import { getToken } from '../utils/storage.js'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Normalises axios/network failures into a single error shape for the UI. */
export const toApiError = (error) => {
  const data = error?.response?.data
  return {
    status: error?.response?.status ?? 0,
    message: data?.message || 'Unable to reach the server. Please try again.',
    errors: data?.errors || null,
  }
}

export default apiClient
