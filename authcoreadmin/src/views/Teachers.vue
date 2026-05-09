<template>
  <div class="page">
    <header class="page-header">
      <h1>教师认证管理</h1>
      <div class="header-actions">
        <span v-if="store.currentUser" class="user-name">👤 {{ store.currentUser.real_name }}</span>
        <button class="btn btn-text" @click="goProfile">个人</button>
        <button class="btn btn-text" @click="logout">退出</button>
      </div>
    </header>

    <div class="tab-bar">
      <button :class="['tab', { active: activeTab === 'Approved' }]" @click="activeTab = 'Approved'">
        已认证 <span class="tab-count">{{ approvedList.length }}</span>
      </button>
      <button :class="['tab', { active: activeTab === 'Waiting' }]" @click="activeTab = 'Waiting'">
        待审核 <span class="tab-count">{{ waitingList.length }}</span>
      </button>
      <button :class="['tab', { active: activeTab === 'Rejected' }]" @click="activeTab = 'Rejected'">
        已驳回 <span class="tab-count">{{ rejectedList.length }}</span>
      </button>
    </div>

    <div class="search-bar" v-if="activeTab === 'Approved'">
      <input v-model="keyword" placeholder="搜索教师姓名..." class="search-input" />
    </div>

    <div class="list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="filteredList.length === 0" class="empty">暂无数据</div>
      <div v-for="item in filteredList" :key="item.hty_id" class="card">
        <div class="card-left">
          <div class="avatar">{{ (item.real_name || '?')[0] }}</div>
        </div>
        <div class="card-body">
          <div class="card-name">{{ item.real_name }}<span v-if="item.meta?.nickName" class="nickname"> ({{ item.meta.nickName }})</span></div>
          <div class="card-meta">
            <span class="tag" :class="item.enabled ? 'tag-active' : 'tag-disabled'">
              {{ item.enabled ? '已启用' : '未启用' }}
            </span>
          </div>
        </div>
        <div class="card-actions" v-if="activeTab === 'Waiting'">
          <button class="btn btn-sm btn-approve" :disabled="!item.enabled" @click="approve(item.hty_id)">通过</button>
          <button class="btn btn-sm btn-reject" :disabled="!item.enabled" @click="startReject(item.hty_id)">驳回</button>
        </div>
      </div>
    </div>

    <!-- Reject dialog -->
    <div v-if="showRejectDialog" class="dialog-overlay" @click.self="cancelReject">
      <div class="dialog">
        <h3>请输入驳回原因</h3>
        <textarea v-model="rejectReason" rows="3" placeholder="驳回原因..." class="dialog-textarea"></textarea>
        <div class="dialog-actions">
          <button class="btn" @click="cancelReject">取消</button>
          <button class="btn btn-primary" @click="confirmReject" :disabled="!rejectReason.trim()">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import useUser from '@/store/user'

const { store, getAllTeachers, approveTeacher, rejectTeacher, logout } = useUser()
const router = useRouter()
const activeTab = ref('Approved')
const keyword = ref('')
const loading = ref(false)
const showRejectDialog = ref(false)
const rejectReason = ref('')
const rejectTargetId = ref('')

const approvedList = computed(() => store.teachers.filter(x => x.is_registered))
const waitingList = computed(() => store.teachers.filter(x => !x.is_registered && !x.reject_reason))
const rejectedList = computed(() => store.teachers.filter(x => !x.is_registered && !!x.reject_reason))

const filteredList = computed(() => {
  let list = activeTab.value === 'Approved' ? approvedList.value
    : activeTab.value === 'Waiting' ? waitingList.value
    : rejectedList.value
  if (keyword.value && activeTab.value === 'Approved') {
    list = list.filter(x => x.real_name?.includes(keyword.value))
  }
  return list
})

async function fetchData() {
  loading.value = true
  await getAllTeachers()
  loading.value = false
}

async function approve(id: string) {
  await approveTeacher(id)
}

function startReject(id: string) {
  rejectTargetId.value = id
  rejectReason.value = ''
  showRejectDialog.value = true
}

function cancelReject() {
  showRejectDialog.value = false
  rejectTargetId.value = ''
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejectReason.value.trim()) return
  await rejectTeacher(rejectTargetId.value, rejectReason.value.trim())
  cancelReject()
}

function goProfile() {
  router.push('/profile')
}

onMounted(() => {
  if (!store.currentUser) {
    router.push('/login')
    return
  }
  fetchData()
})
</script>

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 0 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
.page-header h1 { font-size: 20px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.user-name { color: #666; font-size: 14px; }
.btn-text { background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 14px; padding: 4px 8px; }
.tab-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.tab { padding: 8px 20px; border: 1px solid #ddd; border-radius: 20px; background: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.tab.active { background: #667eea; color: white; border-color: #667eea; }
.tab-count { font-size: 12px; opacity: 0.8; }
.search-bar { margin-bottom: 12px; }
.search-input { width: 100%; padding: 10px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
.search-input:focus { border-color: #667eea; }
.list { display: flex; flex-direction: column; gap: 8px; padding-bottom: 20px; }
.card { background: white; border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.card-left { flex-shrink: 0; }
.avatar { width: 44px; height: 44px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; }
.card-body { flex: 1; min-width: 0; }
.card-name { font-size: 15px; font-weight: 500; }
.nickname { color: #999; font-size: 13px; }
.card-meta { margin-top: 4px; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.tag-active { background: #e8f5e9; color: #2e7d32; }
.tag-disabled { background: #f5f5f5; color: #999; }
.card-actions { display: flex; gap: 6px; flex-shrink: 0; }
.btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-sm { padding: 6px 14px; font-size: 12px; }
.btn-primary { background: #667eea; color: white; }
.btn-approve { background: #e8f5e9; color: #2e7d32; }
.btn-reject { background: #fce4ec; color: #c62828; }
.loading, .empty { text-align: center; padding: 40px; color: #999; }

.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 400px; }
.dialog h3 { font-size: 16px; margin-bottom: 12px; }
.dialog-textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; resize: vertical; font-family: inherit; outline: none; }
.dialog-textarea:focus { border-color: #667eea; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
</style>
