import { reactive } from 'vue'
import request from '@/utils/request'
import type { HtyApp, HtyRole, HtyGonggao } from '@/types'

interface AppState {
  list: HtyApp[]
  loading: boolean
}

const store = reactive<AppState>({
  list: [],
  loading: false,
})

export default function useApp() {
  async function fetchAll() {
    store.loading = true
    const { r, d } = await request({ url: '/api/v1/uc/find_all_apps_with_roles' })
    store.loading = false
    if (r && Array.isArray(d)) {
      store.list = d.sort((a: HtyApp, b: HtyApp) => a.app_id.localeCompare(b.app_id))
    } else {
      store.list = []
    }
  }

  async function save(app: HtyApp) {
    const payload = { ...app }
    delete (payload as any).gonggaos
    payload.role_ids = (app.roles || []).map((r: HtyRole) => r.hty_role_id)
    if (!payload.app_id) delete (payload as any).app_id

    const { r } = await request({
      url: '/api/v1/uc/create_or_update_apps_with_roles',
      method: 'POST',
      data: payload,
    })
    if (r) await fetchAll()
    return r
  }

  async function toggleStatus(app: HtyApp, status: string) {
    return save({ ...app, app_status: status })
  }

  async function toggleWx(app: HtyApp, is_wx_app: boolean) {
    return save({ ...app, is_wx_app })
  }

  async function generateKeypair(app: HtyApp) {
    const { r, d } = await request({ url: '/api/v1/uc/generate_key_pair' })
    if (r && d) {
      return save({ ...app, ...d })
    }
    return false
  }

  async function toggleNeedsRefresh(app_id: string, needs_refresh: boolean) {
    const { r } = await request({
      url: '/api/v1/uc/update_needs_refresh_for_app',
      method: 'POST',
      data: { app_id, needs_refresh },
    })
    return r
  }

  async function createGonggao(data: HtyGonggao) {
    const { r } = await request({
      url: '/api/v1/uc/create_hty_gonggao',
      method: 'POST',
      data,
    })
    if (r) await fetchAll()
    return r
  }

  async function updateGonggao(data: HtyGonggao) {
    const { r } = await request({
      url: '/api/v1/uc/update_hty_gonggao',
      method: 'POST',
      data,
    })
    if (r) await fetchAll()
    return r
  }

  return {
    store,
    fetchAll,
    save,
    toggleStatus,
    toggleWx,
    generateKeypair,
    toggleNeedsRefresh,
    createGonggao,
    updateGonggao,
  }
}
