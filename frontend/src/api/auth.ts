import api from './client'
import type { TokenResponse, User } from '@/types/auth'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  refresh: (refresh_token: string) =>
    api.post<{ access_token: string }>('/auth/refresh', { refresh_token }),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),

  me: () => api.get<User>('/auth/me'),
}
