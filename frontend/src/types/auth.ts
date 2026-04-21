export type UserRole = 'platform_admin' | 'office_admin' | 'office_user' | 'business_owner'

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  tenant_id: number | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}
