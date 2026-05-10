import { reactive } from 'vue'
import request from '@/utils/request'
import { saveToken, clearTokens, HtySudoToken } from '@/utils/index'
import type { HtyUser, HtyRole } from '@/types'

interface UserState {
  currentUser: HtyUser | null
  currentRole?: string
  roles: HtyRole[]
  loading: boolean
}

const store = reactive<UserState>({
  currentUser: null,
  roles: [],
  loading: false,
})

export default function useUser() {
  async function loginWithPassword(username: string, password: string) {
    store.loading = true
    console.log('[login] calling login_with_password...')
    const res = await request({
      url: '/api/v1/uc/login_with_password',
      method: 'POST',
      data: { username, password },
    })
    console.log('[login] login_with_password response:', JSON.stringify(res))
    store.loading = false
    if (res.r && res.d) {
      console.log('[login] saving token, then calling read()...')
      saveToken(res.d)
      const readResult = await read()
      console.log('[login] read() result:', readResult)
      return readResult
    }
    console.log('[login] login_with_password failed, r=', res.r, 'd=', res.d, 'e=', res.e)
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
    console.log('[login] calling find_user_with_info_by_token...')
    console.log('[login] Authorization token in localStorage:', window.localStorage.getItem('Authorization')?.substring(0, 30) + '...')
    const res = await request({
      url: '/api/v1/uc/find_user_with_info_by_token',
    })
    console.log('[login] find_user_with_info_by_token response:', JSON.stringify(res))
    store.loading = false
    if (res.r && res.d) {
      store.currentUser = res.d as HtyUser
      const userApp = res.d.infos?.[0]
      if (userApp?.roles) {
        store.roles = userApp.roles
      }
      return true
    }
    console.log('[login] read() failed, r=', res.r, 'd=', res.d, 'e=', res.e)
    return false
  }

  function checkRole(roleKey: string): boolean {
    return store.roles.some((r) => r.role_key === roleKey)
  }

  function logout() {
    store.currentUser = null
    store.roles = []
    clearTokens()
    window.location.href = '/login'
  }

  return {
    store,
    loginWithPassword,
    login,
    sudo,
    read,
    checkRole,
    logout,
  }
}
