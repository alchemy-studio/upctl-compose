<template>
  <div class="max-w-4xl mx-auto px-4 pb-6">
    <header class="flex items-center justify-between py-4">
      <h1 class="text-xl text-text font-semibold">应用管理</h1>
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 rounded text-sm bg-primary text-white hover:bg-primary-dark cursor-pointer border-0" @click="openCreate">新增应用</button>
      </div>
    </header>

    <div class="mb-4">
      <input v-model="keyword" placeholder="搜索应用 ID / 域名 / 描述..." class="w-full px-4 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
    </div>

    <div v-if="appStore.store.loading" class="text-center py-10 text-text-muted">加载中...</div>

    <div v-else-if="filteredList.length === 0" class="text-center py-10 text-text-muted">暂无数据</div>
    <div v-else class="flex flex-col gap-3">
      <div v-for="app in filteredList" :key="app.app_id" class="bg-surface rounded-xl shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 bg-[#fafafa] border-b border-border">
          <span class="text-base font-semibold text-text">{{ app.app_id }}</span>
          <span :class="['inline-block px-2 py-0.5 rounded-full text-xs', app.app_status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500']">
            {{ app.app_status === 'ACTIVE' ? '已启用' : '已禁用' }}
          </span>
        </div>
        <div class="px-4 py-3">
          <div class="flex gap-2 text-xs mb-1.5">
            <span class="text-text-muted shrink-0 w-12">域名</span>
            <span class="text-text break-all">{{ app.domain || '-' }}</span>
          </div>
          <div class="flex gap-2 text-xs mb-1.5" v-if="app.app_desc">
            <span class="text-text-muted shrink-0 w-12">描述</span>
            <span class="text-text">{{ app.app_desc }}</span>
          </div>
          <div class="flex gap-2 text-xs mb-1.5" v-if="app.is_wx_app">
            <span class="text-text-muted shrink-0 w-12">微信</span>
            <span class="text-text">微信ID: {{ app.wx_id || '-' }} | 密钥: {{ app.wx_secret ? '****' : '-' }}</span>
          </div>
          <div class="flex gap-2 text-xs mb-1.5">
            <span class="text-text-muted shrink-0 w-12">角色</span>
            <div class="flex gap-1 flex-wrap">
              <span v-for="role in (app.roles || [])" :key="role.hty_role_id" class="inline-block px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                {{ role.role_key }}
              </span>
              <span v-if="!app.roles?.length" class="text-text-muted">-</span>
            </div>
          </div>
          <div class="flex gap-2 text-xs" v-if="app.pubkey || app.privkey">
            <span class="text-text-muted shrink-0 w-12">密钥</span>
            <span class="font-mono text-xs text-text-muted">Pub: {{ app.pubkey?.slice(0, 30) }}...</span>
          </div>
        </div>
        <div class="flex gap-1.5 px-4 py-2.5 border-t border-border">
          <button class="px-3 py-1.5 rounded text-xs border border-border cursor-pointer hover:bg-bg" @click="openEdit(app)">编辑</button>
          <button v-if="app.app_status === 'ACTIVE'" class="px-3 py-1.5 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer border-0" @click="toggleStatus(app, 'DELETED')">禁用</button>
          <button v-if="app.app_status === 'DELETED'" class="px-3 py-1.5 rounded text-xs bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer border-0" @click="toggleStatus(app, 'ACTIVE')">启用</button>
          <button class="px-3 py-1.5 rounded text-xs border border-border cursor-pointer hover:bg-bg" @click="refreshKeypair(app)">密钥</button>
          <button class="px-3 py-1.5 rounded text-xs border border-border cursor-pointer hover:bg-bg" @click="openGonggao(app)">公告</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" @click.self="closeModal">
      <div class="bg-white rounded-xl p-6 w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-medium text-text mb-4">{{ isEditing ? '编辑应用' : '新增应用' }}</h3>
        <div class="mb-3.5">
          <label class="block text-xs font-semibold text-text mb-1">应用 ID</label>
          <input v-model="form.app_id" class="w-full px-3 py-2 border border-border rounded text-sm outline-none focus:border-primary" :readonly="isEditing" :placeholder="isEditing ? '不可修改' : '唯一标识'" />
        </div>
        <div class="mb-3.5">
          <label class="block text-xs font-semibold text-text mb-1">描述</label>
          <input v-model="form.app_desc" class="w-full px-3 py-2 border border-border rounded text-sm outline-none focus:border-primary" placeholder="应用描述" />
        </div>
        <div class="mb-3.5">
          <label class="block text-xs font-semibold text-text mb-1">域名</label>
          <input v-model="form.domain" class="w-full px-3 py-2 border border-border rounded text-sm outline-none focus:border-primary" placeholder="关联域名" />
        </div>
        <div class="mb-3.5">
          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" v-model="form.is_wx_app" />
            微信应用
          </label>
        </div>
        <template v-if="form.is_wx_app">
          <div class="mb-3.5">
            <label class="block text-xs font-semibold text-text mb-1">微信 ID</label>
            <input v-model="form.wx_id" class="w-full px-3 py-2 border border-border rounded text-sm outline-none focus:border-primary" placeholder="wx..." />
          </div>
          <div class="mb-3.5">
            <label class="block text-xs font-semibold text-text mb-1">微信密钥</label>
            <input v-model="form.wx_secret" class="w-full px-3 py-2 border border-border rounded text-sm outline-none focus:border-primary" placeholder="微信 secret" />
          </div>
        </template>
        <div class="mb-3.5">
          <label class="block text-xs font-semibold text-text mb-1">状态</label>
          <div class="flex gap-3 text-sm">
            <label class="flex items-center gap-1 cursor-pointer"><input type="radio" v-model="form.app_status" value="ACTIVE" /> 启用</label>
            <label class="flex items-center gap-1 cursor-pointer"><input type="radio" v-model="form.app_status" value="DELETED" /> 禁用</label>
          </div>
        </div>
        <div class="mb-3.5">
          <label class="block text-xs font-semibold text-text mb-1">关联角色</label>
          <div class="flex gap-3 flex-wrap text-sm">
            <label v-for="role in roleStore.store.list" :key="role.hty_role_id" class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" :value="role.hty_role_id"
                :checked="selectedRoleIds.has(role.hty_role_id)"
                @change="toggleRole(role.hty_role_id)" />
              {{ role.role_key }}
            </label>
            <div v-if="roleStore.store.loading" class="text-text-muted">加载中...</div>
            <div v-else-if="roleStore.store.list.length === 0" class="text-text-muted">暂无角色</div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="px-4 py-2 rounded text-sm border border-border cursor-pointer hover:bg-bg" @click="closeModal">取消</button>
          <button class="px-4 py-2 rounded text-sm bg-primary text-white cursor-pointer hover:bg-primary-dark disabled:opacity-50" @click="submit" :disabled="!form.app_id?.trim()">保存</button>
        </div>
      </div>
    </div>

    <!-- Gonggao modal -->
    <div v-if="showGonggaoModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" @click.self="showGonggaoModal = false">
      <div class="bg-white rounded-xl p-6 w-[90%] max-w-[500px]">
        <h3 class="text-base font-medium text-text mb-3">发布公告 — {{ gonggaoForm.app_id }}</h3>
        <div class="mb-3.5">
          <label class="block text-xs font-semibold text-text mb-1">公告内容</label>
          <textarea v-model="gonggaoForm.content" rows="4" class="w-full px-3 py-2 border border-border rounded text-sm outline-none focus:border-primary font-inherit resize-y" placeholder="输入公告内容..."></textarea>
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <button class="px-4 py-2 rounded text-sm border border-border cursor-pointer hover:bg-bg" @click="showGonggaoModal = false">取消</button>
          <button class="px-4 py-2 rounded text-sm bg-primary text-white cursor-pointer hover:bg-primary-dark disabled:opacity-50" @click="submitGonggao" :disabled="!gonggaoForm.content?.trim()">发布</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import useApp from '@/store/app'
import useRole from '@/store/role'
import type { HtyApp, HtyGonggao } from '@/types'

const appStore = useApp()
const roleStore = useRole()
const keyword = ref('')
const showModal = ref(false)
const showGonggaoModal = ref(false)
const isEditing = ref(false)
const form = reactive<Partial<HtyApp>>({ app_status: 'ACTIVE', is_wx_app: false })
const selectedRoleIds = ref<Set<string>>(new Set())
const gonggaoForm = reactive<Partial<HtyGonggao>>({ app_id: '', content: '' })

const filteredList = computed(() => {
  let list = appStore.store.list
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(a =>
      a.app_id.toLowerCase().includes(kw) ||
      a.domain?.toLowerCase().includes(kw) ||
      a.app_desc?.toLowerCase().includes(kw)
    )
  }
  return list
})

function openCreate() {
  isEditing.value = false
  Object.assign(form, { app_id: '', app_desc: '', domain: '', app_status: 'ACTIVE', is_wx_app: false, wx_id: '', wx_secret: '' })
  selectedRoleIds.value = new Set()
  showModal.value = true
  roleStore.fetchAll()
}

function openEdit(app: HtyApp) {
  isEditing.value = true
  Object.assign(form, {
    app_id: app.app_id,
    app_desc: app.app_desc,
    domain: app.domain,
    app_status: app.app_status,
    is_wx_app: app.is_wx_app,
    wx_id: app.wx_id,
    wx_secret: app.wx_secret,
  })
  selectedRoleIds.value = new Set((app.roles || []).map(r => r.hty_role_id))
  showModal.value = true
  roleStore.fetchAll()
}

function closeModal() {
  showModal.value = false
}

function toggleRole(roleId: string) {
  const s = selectedRoleIds.value
  if (s.has(roleId)) s.delete(roleId)
  else s.add(roleId)
}

async function submit() {
  const appData: Partial<HtyApp> = {
    ...form,
    roles: roleStore.store.list.filter(r => selectedRoleIds.value.has(r.hty_role_id)),
  }
  const ok = await appStore.save(appData as HtyApp)
  if (ok) closeModal()
}

async function toggleStatus(app: HtyApp, status: string) {
  await appStore.toggleStatus(app, status)
}

async function refreshKeypair(app: HtyApp) {
  if (app.pubkey && app.privkey && !confirm('重新生成密钥对会覆盖已有数据，确认？')) return
  await appStore.generateKeypair(app)
}

function openGonggao(app: HtyApp) {
  gonggaoForm.app_id = app.app_id
  gonggaoForm.content = ''
  showGonggaoModal.value = true
}

async function submitGonggao() {
  await appStore.createGonggao(gonggaoForm as HtyGonggao)
  showGonggaoModal.value = false
}

onMounted(() => {
  appStore.fetchAll()
})
</script>
