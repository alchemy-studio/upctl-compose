import { reactive } from 'vue'
import request from '@/utils/request'
import type { Project } from '@/types'

interface ProjectState {
  list: Project[]
  loading: boolean
}

const store = reactive<ProjectState>({
  list: [],
  loading: false,
})

export default function useProject() {
  async function fetchAll() {
    store.loading = true
    const { r, d } = await request({
      url: '/api/v2/upctl/api/projects',
    })
    store.loading = false
    if (r && Array.isArray(d)) {
      store.list = d
    } else {
      store.list = []
    }
  }

  async function create(data: { name: string; repo_url?: string; memory_doc?: string; is_open_source?: boolean }) {
    const { r, d } = await request({
      url: '/api/v2/upctl/api/projects',
      method: 'POST',
      data,
    })
    if (r) await fetchAll()
    return { r, d }
  }

  async function update(id: string, data: { name?: string; repo_url?: string; memory_doc?: string }) {
    const { r } = await request({
      url: `/api/v2/upctl/api/projects/${id}`,
      method: 'PATCH',
      data,
    })
    if (r) await fetchAll()
    return r
  }

  async function remove(id: string) {
    const { r } = await request({
      url: `/api/v2/upctl/api/projects/${id}`,
      method: 'DELETE',
    })
    if (r) await fetchAll()
    return r
  }

  return { ...store, store, fetchAll, create, update, remove }
}
