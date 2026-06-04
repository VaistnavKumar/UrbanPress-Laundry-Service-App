// src/api/axios.js
import axios from 'axios'

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  if (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl
  }
  if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const isLocalIp = /^(?:10\.|127\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/.test(window.location.hostname)
    if (isLocalIp) {
      return envUrl.replace('localhost', window.location.hostname).replace('127.0.0.1', window.location.hostname)
    }
  }
  return envUrl
}

const instance = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
})

// Request interceptor — attach JWT
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default instance
