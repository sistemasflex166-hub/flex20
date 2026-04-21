import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error)

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw new Error('no refresh token')

      const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
      localStorage.setItem('access_token', data.access_token)
      queue.forEach((cb) => cb(data.access_token))
      queue = []
      original.headers.Authorization = `Bearer ${data.access_token}`
      return api(original)
    } catch {
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
