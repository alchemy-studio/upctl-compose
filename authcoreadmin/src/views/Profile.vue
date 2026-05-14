<template>
  <div class="max-w-3xl mx-auto px-4">
    <header class="flex items-center justify-between py-4">
      <button class="text-sm text-primary bg-transparent border-0 cursor-pointer hover:underline px-1" @click="goBack">← 返回</button>
      <h1 class="text-xl text-text font-semibold">个人中心</h1>
      <button class="text-sm text-primary bg-transparent border-0 cursor-pointer hover:underline px-1" @click="logout">退出</button>
    </header>

    <div v-if="store.currentUser" class="bg-surface rounded-xl p-8 text-center mb-4 shadow-sm">
      <div class="w-[72px] h-[72px] rounded-full bg-primary text-white flex items-center justify-center text-3xl font-semibold mx-auto mb-3">{{ (store.currentUser.real_name || '?')[0] }}</div>
      <h2 class="text-xl text-text mb-1">{{ store.currentUser.real_name }}</h2>
      <p class="text-xs text-text-muted mb-1">ID: {{ store.currentUser.hty_id }}</p>
      <p v-if="store.currentUser.union_id" class="text-xs text-text-muted mb-1">union_id: {{ store.currentUser.union_id }}</p>

      <div class="text-left mt-6 pt-4 border-t border-border">
        <h3 class="text-sm text-text-muted font-medium mb-2">角色</h3>
        <div class="flex gap-1.5 flex-wrap">
          <span v-for="role in store.roles" :key="role.role_key" class="inline-block px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-600">
            {{ role.role_name || role.role_key }}
          </span>
          <span v-if="store.roles.length === 0" class="text-text-muted text-xs">无角色</span>
        </div>
      </div>

      <div class="text-left mt-4 pt-4 border-t border-border">
        <h3 class="text-sm text-text-muted font-medium mb-2">标签</h3>
        <div class="flex gap-1.5 flex-wrap">
          <span v-for="tag in store.currentUser.tags || []" :key="tag.tag_id" class="inline-block px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700">
            {{ tag.tag_name }}
          </span>
          <span v-if="!store.currentUser.tags?.length" class="text-text-muted text-xs">无标签</span>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-10 text-text-muted">加载中...</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import useUser from '@/store/user'

const { store, logout } = useUser()
const router = useRouter()

function goBack() {
  router.push('/')
}

onMounted(() => {
  if (!store.currentUser) {
    router.push('/login')
  }
})
</script>
