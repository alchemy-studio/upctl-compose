<template>
  <div class="page">
    <header class="page-header">
      <h1>应用管理</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="openCreate">新增应用</button>
      </div>
    </header>

    <!-- Search -->
    <div class="search-bar">
      <input v-model="keyword" placeholder="搜索应用 ID / 域名 / 描述..." class="search-input" />
    </div>

    <!-- Loading -->
    <div v-if="appStore.store.loading" class="loading">加载中...</div>

    <!-- App cards -->
    <div v-else-if="filteredList.length === 0" class="empty">暂无数据</div>
    <div v-else class="app-list">
      <div v-for="app in filteredList" :key="app.app_id" class="app-card">
        <div class="app-card-header">
          <span class="app-id">{{ app.app_id }}</span>
          <span :class="['status-badge', app.app_status === 'ACTIVE' ? 'active' : 'disabled']">
            {{ app.app_status === 'ACTIVE' ? '已启用' : '已禁用' }}
          </span>
        </div>
        <div class="app-card-body">
          <div class="app-detail">
            <label>域名</label>
            <span>{{ app.domain || '-' }}</span>
          </div>
          <div class="app-detail" v-if="app.app_desc">
            <label>描述</label>
            <span>{{ app.app_desc }}</span>
          </div>
          <div class="app-detail" v-if="app.is_wx_app">
            <label>微信应用</label>
            <span>微信ID: {{ app.wx_id || '-' }} | 密钥: {{ app.wx_secret ? '****' : '-' }}</span>
          </div>
          <div class="app-detail">
            <label>角色</label>
            <div class="role-tags">
              <span v-for="role in (app.roles || [])" :key="role.hty_role_id" class="role-tag">
                {{ role.role_key }}
              </span>
              <span v-if="!app.roles?.length" class="text-muted">-</span>
            </div>
          </div>
          <div class="app-detail" v-if="app.pubkey || app.privkey">
            <label>密钥</label>
            <span class="key-text">Pub: {{ app.pubkey?.slice(0, 30) }}...</span>
          </div>
        </div>
        <div class="app-card-actions">
          <button class="btn btn-sm" @click="openEdit(app)">编辑</button>
          <button v-if="app.app_status === 'ACTIVE'" class="btn btn-sm btn-danger" @click="toggleStatus(app, 'DELETED')">禁用</button>
          <button v-if="app.app_status === 'DELETED'" class="btn btn-sm btn-success" @click="toggleStatus(app, 'ACTIVE')">启用</button>
          <button class="btn btn-sm" @click="refreshKeypair(app)">密钥</button>
          <button class="btn btn-sm" @click="openGonggao(app)">公告</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <div v-if="showModal" class="dialog-overlay" @click.self="closeModal">
      <div class="dialog dialog-wide">
        <h3>{{ isEditing ? '编辑应用' : '新增应用' }}</h3>
        <div class="form-group">
          <label class="form-label">应用 ID</label>
          <input v-model="form.app_id" class="form-input" :readonly="isEditing" :placeholder="isEditing ? '不可修改' : '唯一标识'" />
        </div>
        <div class="form-group">
          <label class="form-label">描述</label>
          <input v-model="form.app_desc" class="form-input" placeholder="应用描述" />
        </div>
        <div class="form-group">
          <label class="form-label">域名</label>
          <input v-model="form.domain" class="form-input" placeholder="关联域名" />
        </div>
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" v-model="form.is_wx_app" />
            微信应用
          </label>
        </div>
        <template v-if="form.is_wx_app">
          <div class="form-group">
            <label class="form-label">微信 ID</label>
            <input v-model="form.wx_id" class="form-input" placeholder="wx..." />
          </div>
          <div class="form-group">
            <label class="form-label">微信密钥</label>
            <input v-model="form.wx_secret" class="form-input" placeholder="微信 secret" />
          </div>
        </template>
        <div class="form-group">
          <label class="form-label">状态</label>
          <div class="radio-group">
            <label><input type="radio" v-model="form.app_status" value="ACTIVE" /> 启用</label>
            <label><input type="radio" v-model="form.app_status" value="DELETED" /> 禁用</label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">关联角色</label>
          <div class="checkbox-group">
            <label v-for="role in roleStore.store.list" :key="role.hty_role_id" class="checkbox-label">
              <input type="checkbox" :value="role.hty_role_id"
                :checked="selectedRoleIds.has(role.hty_role_id)"
                @change="toggleRole(role.hty_role_id)" />
              {{ role.role_key }}
            </label>
            <div v-if="roleStore.store.loading" class="text-muted">加载中...</div>
            <div v-else-if="roleStore.store.list.length === 0" class="text-muted">暂无角色</div>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="submit" :disabled="!form.app_id?.trim()">保存</button>
        </div>
      </div>
    </div>

    <!-- Gonggao modal -->
    <div v-if="showGonggaoModal" class="dialog-overlay" @click.self="showGonggaoModal = false">
      <div class="dialog">
        <h3>发布公告 — {{ gonggaoForm.app_id }}</h3>
        <div class="form-group">
          <label class="form-label">公告内容</label>
          <textarea v-model="gonggaoForm.content" rows="4" class="form-textarea" placeholder="输入公告内容..."></textarea>
        </div>
        <div class="dialog-actions">
          <button class="btn" @click="showGonggaoModal = false">取消</button>
          <button class="btn btn-primary" @click="submitGonggao" :disabled="!gonggaoForm.content?.trim()">发布</button>
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

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 0 16px 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
.page-header h1 { font-size: 20px; }
.header-actions { display: flex; gap: 8px; }
.search-bar { margin-bottom: 16px; }
.search-input { width: 100%; padding: 10px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
.search-input:focus { border-color: #667eea; }
.app-list { display: flex; flex-direction: column; gap: 12px; }
.loading, .empty { text-align: center; padding: 40px; color: #999; }
.app-card { background: white; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
.app-card-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
.app-id { font-size: 16px; font-weight: 600; color: #333; }
.status-badge { padding: 2px 10px; border-radius: 10px; font-size: 12px; }
.status-badge.active { background: #e8f5e9; color: #2e7d32; }
.status-badge.disabled { background: #f5f5f5; color: #999; }
.app-card-body { padding: 12px 16px; }
.app-detail { display: flex; gap: 8px; font-size: 13px; margin-bottom: 6px; }
.app-detail label { color: #999; min-width: 48px; flex-shrink: 0; }
.app-detail span { color: #444; word-break: break-all; }
.role-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.role-tag { padding: 1px 8px; background: #e3f2fd; color: #1565c0; border-radius: 8px; font-size: 12px; }
.key-text { font-family: monospace; font-size: 12px; color: #666; }
.text-muted { color: #999; }
.app-card-actions { display: flex; gap: 6px; padding: 10px 16px; border-top: 1px solid #f0f0f0; }
.btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; background: #f0f0f0; color: #333; }
.btn-sm { padding: 5px 12px; font-size: 12px; }
.btn-primary { background: #667eea; color: white; }
.btn-success { background: #e8f5e9; color: #2e7d32; }
.btn-danger { background: #fce4ec; color: #c62828; }
.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.dialog-wide { max-width: 600px; }
.dialog h3 { font-size: 16px; margin-bottom: 16px; }
.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 4px; }
.form-input, .form-textarea { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; font-family: inherit; }
.form-input:focus, .form-textarea:focus { border-color: #667eea; }
.form-input[readonly] { background: #f5f5f5; color: #999; }
.form-checkbox { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
.radio-group, .checkbox-group { display: flex; gap: 12px; flex-wrap: wrap; }
.radio-group label, .checkbox-label { display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
