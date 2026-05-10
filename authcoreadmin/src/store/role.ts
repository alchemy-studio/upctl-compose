import { reactive } from 'vue'
import request from '@/utils/request'
import type { HtyRole } from '@/types'

interface RoleState {
  list: HtyRole[]
  loading: boolean
}

const store = reactive<RoleState>({
  list: [],
  loading: false,
})

export default function useRole() {
  async function fetchAll() {
    store.loading = true
    const { r, d } = await request({ url: '/api/v1/uc/find_all_roles' })
    store.loading = false
    if (r && Array.isArray(d)) {
      store.list = d
    } else {
      store.list = []
    }
  }

  return { store, fetchAll }
}
