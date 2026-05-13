<template>
  <div class="max-w-3xl mx-auto px-4">
    <header class="flex items-center justify-between py-4">
      <h1 class="text-xl text-text font-semibold">用户管理</h1>
      <div class="flex items-center gap-2">
        <nav class="flex items-center gap-1 mr-3">
          <router-link to="/users" class="px-3 py-1.5 rounded text-sm text-text-muted hover:bg-bg no-underline" active-class="bg-primary text-white">用户</router-link>
          <router-link to="/apps" class="px-3 py-1.5 rounded text-sm text-text-muted hover:bg-bg no-underline" active-class="bg-primary text-white">应用</router-link>
        </nav>
        <span v-if="store.currentUser" class="text-sm text-text-muted">{{ store.currentUser.real_name }}</span>
        <button class="text-sm text-primary bg-transparent border-0 cursor-pointer hover:underline px-1" @click="goProfile">个人</button>
        <button class="text-sm text-primary bg-transparent border-0 cursor-pointer hover:underline px-1" @click="logout">退出</button>
      </div>
    </header>

    <div class="flex gap-2 mb-3">
      <button :class="['px-5 py-2 border border-border rounded-full text-sm cursor-pointer', activeTab === 'Approved' ? 'bg-primary text-white' : 'text-text hover:bg-bg']"
        @click="activeTab = 'Approved'">
        已认证 <span class="text-xs opacity-80">({{ approvedList.length }})</span>
      </button>
      <button :class="['px-5 py-2 border border-border rounded-full text-sm cursor-pointer', activeTab === 'Waiting' ? 'bg-primary text-white' : 'text-text hover:bg-bg']"
        @click="activeTab = 'Waiting'">
        待审核 <span class="text-xs opacity-80">({{ waitingList.length }})</span>
      </button>
      <button :class="['px-5 py-2 border border-border rounded-full text-sm cursor-pointer', activeTab === 'Rejected' ? 'bg-primary text-white' : 'text-text hover:bg-bg']"
        @click="activeTab = 'Rejected'">
        已驳回 <span class="text-xs opacity-80">({{ rejectedList.length }})</span>
      </button>
    </div>

    <div class="mb-3" v-if="activeTab === 'Approved'">
      <input v-model="keyword" placeholder="搜索用户姓名..." class="w-full px-4 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
    </div>

    <div class="flex gap-2 mb-3">
      <span class="text-xs font-semibold text-text-muted self-center">排序:</span>
      <button :class="['px-3 py-1 rounded text-xs border border-border cursor-pointer',
        sortBy === 'name' ? 'bg-primary text-white' : 'text-text hover:bg-bg']"
        @click="toggleSort('name')">
        姓名 {{ sortBy === 'name' ? (sortAsc ? '↑' : '↓') : '' }}
      </button>
      <button :class="['px-3 py-1 rounded text-xs border border-border cursor-pointer',
        sortBy === 'created_at' ? 'bg-primary text-white' : 'text-text hover:bg-bg']"
        @click="toggleSort('created_at')">
        创建时间 {{ sortBy === 'created_at' ? (sortAsc ? '↑' : '↓') : '' }}
      </button>
      <button :class="['px-3 py-1 rounded text-xs border border-border cursor-pointer',
        sortBy === 'status' ? 'bg-primary text-white' : 'text-text hover:bg-bg']"
        @click="toggleSort('status')">
        审核状态 {{ sortBy === 'status' ? (sortAsc ? '↑' : '↓') : '' }}
      </button>
    </div>

    <div class="flex flex-col gap-2 pb-5">
      <div v-if="loading" class="text-center py-10 text-text-muted">加载中...</div>
      <div v-else-if="filteredList.length === 0" class="text-center py-10 text-text-muted">暂无数据</div>
      <div v-for="item in filteredList" :key="item.hty_id" class="bg-surface rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
        <div class="shrink-0 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold">{{ (item.real_name || '?')[0] }}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-text">{{ item.real_name }}<span v-if="item.meta?.nickName" class="text-text-muted text-xs ml-1">({{ item.meta.nickName }})</span></div>
          <div class="mt-1">
            <span :class="['inline-block px-2 py-0.5 rounded-full text-xs', item.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500']">
              {{ item.enabled ? '已启用' : '未启用' }}
            </span>
          </div>
        </div>
        <div class="flex gap-1.5 shrink-0" v-if="activeTab === 'Waiting'">
          <button class="px-3 py-1.5 rounded text-xs cursor-pointer border-0 bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40" :disabled="!item.enabled" @click="approve(item.hty_id)">通过</button>
          <button class="px-3 py-1.5 rounded text-xs cursor-pointer border-0 bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40" :disabled="!item.enabled" @click="startReject(item.hty_id)">驳回</button>
        </div>
      </div>
    </div>

    <!-- Reject dialog -->
    <div v-if="showRejectDialog" class="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" @click.self="cancelReject">
      <div class="bg-white rounded-xl p-6 w-[90%] max-w-[400px]">
        <h3 class="text-base font-medium text-text mb-3">请输入驳回原因</h3>
        <textarea v-model="rejectReason" rows="3" placeholder="驳回原因..." class="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-primary font-inherit resize-y"></textarea>
        <div class="flex justify-end gap-2 mt-3">
          <button class="px-4 py-2 rounded text-sm border border-border cursor-pointer hover:bg-bg" @click="cancelReject">取消</button>
          <button class="px-4 py-2 rounded text-sm bg-primary text-white cursor-pointer hover:bg-primary-dark disabled:opacity-50" @click="confirmReject" :disabled="!rejectReason.trim()">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import useUser from '@/store/user'

const { store, getAllUsers, approveUser, rejectUser, logout } = useUser()
const router = useRouter()
const activeTab = ref('Approved')
const keyword = ref('')
const loading = ref(false)
const showRejectDialog = ref(false)
const rejectReason = ref('')
const rejectTargetId = ref('')
const sortBy = ref<'name' | 'created_at' | 'status'>('name')
const sortAsc = ref(true)

function toggleSort(field: 'name' | 'created_at' | 'status') {
  if (sortBy.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortBy.value = field
    sortAsc.value = true
  }
}

const approvedList = computed(() => store.users.filter(x => x.is_registered))
const waitingList = computed(() => store.users.filter(x => !x.is_registered && !x.reject_reason))
const rejectedList = computed(() => store.users.filter(x => !x.is_registered && !!x.reject_reason))

const filteredList = computed(() => {
  let list = activeTab.value === 'Approved' ? approvedList.value
    : activeTab.value === 'Waiting' ? waitingList.value
    : rejectedList.value
  if (keyword.value && activeTab.value === 'Approved') {
    list = list.filter(x => x.real_name?.includes(keyword.value))
  }
  // apply sorting
  const sorted = [...list]
  const dir = sortAsc.value ? 1 : -1
  switch (sortBy.value) {
    case 'name':
      sorted.sort((a, b) => dir * (a.real_name || '').localeCompare(b.real_name || '', 'zh-CN'))
      break
    case 'created_at':
      sorted.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return dir * (ta - tb)
      })
      break
    case 'status':
      sorted.sort((a, b) => {
        const scoreA = (a.enabled ? 2 : 0) + (a.is_registered ? 1 : 0)
        const scoreB = (b.enabled ? 2 : 0) + (b.is_registered ? 1 : 0)
        return dir * (scoreB - scoreA)
      })
      break
  }
  return sorted
})

async function fetchData() {
  loading.value = true
  await getAllUsers()
  loading.value = false
}

async function approve(id: string) {
  await approveUser(id)
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
  await rejectUser(rejectTargetId.value, rejectReason.value.trim())
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
