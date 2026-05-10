import { reactive } from 'vue'
import request from '@/utils/request'
import { saveToken, clearTokens, HtySudoToken } from '@/utils/index'
import type { HtyUser, HtyRole, HtyApp } from '@/types'

interface UserState {
  currentUser: HtyUser | null
  currentRole?: string
  roles: HtyRole[]
  loading: boolean
  users: HtyUser[]
}

const store = reactive<UserState>({
  currentUser: null,
  roles: [],
  loading: false,
  users: [],
})

export default function useUser() {
  async function loginWithPassword(username: string, password: string) {
    store.loading = true
    const { r, d, e } = await request({
      url: '/api/v1/uc/login_with_password',
      method: 'POST',
      data: { username, password },
    })
    store.loading = false
    if (r && d) {
      saveToken(d)
      await sudo()
      return await read()
    }
    return false
  }

  async function login(unionid: string) {
    store.loading = true
    const { r, d, e } = await request({
      url: '/api/v1/uc/login2_with_unionid',
      headers: { Unionid: unionid },
    })
    store.loading = false
    if (r && d) {
      saveToken(d)
      // Try sudo, but always read user profile
      await sudo()
      await read()
      return true
    }
    return false
  }

  async function sudo() {
    store.loading = true
    const { r, d, e } = await request({
      url: '/api/v1/uc/sudo',
      method: 'POST',
    })
    store.loading = false
    if (r && d) {
      window.localStorage.setItem(HtySudoToken, d)
      return true
    }
    return false
  }

  async function read() {
    store.loading = true
    const { r, d, e } = await request({
      url: '/api/v1/uc/find_user_with_info_by_token',
    })
    store.loading = false
    if (r && d) {
      store.currentUser = d as HtyUser
      const userApp = d.infos?.[0]
      if (userApp?.roles) {
        store.roles = userApp.roles
      }
      return true
    }
    return false
  }

  async function getAllUsers() {
    const { r, d, e } = await request({
      url: '/api/v1/uc/find_users_with_info_by_role/TEACHER',
    })
    if (r && Array.isArray(d)) {
      store.users = d.map((u: HtyUser) => ({
        ...u,
        ...(u.infos?.[0] || {}),
      }))
    } else {
      store.users = []
    }
  }

  async function getAppByDomain(): Promise<HtyApp | undefined> {
    const { r, d, e } = await request({ url: '/api/v1/uc/find_app_by_domain' })
    if (r && d) return d as HtyApp
    return undefined
  }

  async function verify(userId: string, validate: boolean, rejectReason?: string) {
    const app = await getAppByDomain()
    if (!app) return false
    const { r, d, e } = await request({
      url: '/api/v1/uc/register/verify',
      method: 'POST',
      data: { hty_id: userId, app_id: app.app_id, validate, reject_reason: rejectReason },
    })
    return r
  }

  async function approveUser(userId: string) {
    const ok = await verify(userId, true)
    if (ok) await getAllUsers()
    return ok
  }

  async function rejectUser(userId: string, reason: string) {
    const ok = await verify(userId, false, reason)
    if (ok) await getAllUsers()
    return ok
  }

  function checkRole(roleKey: string): boolean {
    return store.roles.some((r) => r.role_key === roleKey)
  }

  function logout() {
    store.currentUser = null
    store.roles = []
    store.users = []
    clearTokens()
    window.location.href = '/login'
  }

  return {
    store,
    loginWithPassword,
    login,
    sudo,
    read,
    getAllUsers,
    approveUser,
    rejectUser,
    checkRole,
    logout,
  }
}
