<template>
  <div class="max-w-3xl mx-auto px-4 pb-6">
    <header class="flex items-center justify-between py-4 flex-wrap gap-2">
      <h1 class="text-xl text-text font-semibold">AuthCore 管理后台</h1>
      <div class="flex items-center gap-2">
        <nav class="flex items-center gap-1 mr-2">
          <router-link to="/" class="px-3 py-1.5 rounded text-sm text-text-muted hover:bg-bg no-underline" active-class="bg-primary text-white hover:bg-primary-dark" :exact="true">首页</router-link>
          <router-link to="/users" class="px-3 py-1.5 rounded text-sm text-text-muted hover:bg-bg no-underline" active-class="bg-primary text-white hover:bg-primary-dark">用户</router-link>
          <router-link to="/apps" class="px-3 py-1.5 rounded text-sm text-text-muted hover:bg-bg no-underline" active-class="bg-primary text-white hover:bg-primary-dark">应用</router-link>
        </nav>
        <span v-if="store.currentUser" class="text-sm text-text-muted">👤 {{ store.currentUser.real_name }}</span>
        <button class="text-sm text-primary bg-transparent border-0 cursor-pointer hover:underline px-1" @click="goProfile">个人</button>
        <button class="text-sm text-primary bg-transparent border-0 cursor-pointer hover:underline px-1" @click="logout">退出</button>
      </div>
    </header>

    <div class="bg-surface rounded-xl p-5 mb-3 shadow-sm">
      <h3 class="text-base font-medium text-text mb-3">用户信息</h3>
      <div class="flex py-2 border-b border-border last:border-b-0">
        <span class="w-20 text-sm text-text-muted shrink-0">用户名</span>
        <span class="text-sm text-text">{{ store.currentUser?.username || '-' }}</span>
      </div>
      <div class="flex py-2 border-b border-border last:border-b-0">
        <span class="w-20 text-sm text-text-muted shrink-0">姓名</span>
        <span class="text-sm text-text">{{ store.currentUser?.real_name || '-' }}</span>
      </div>
    </div>

    <div v-if="store.roles.length" class="bg-surface rounded-xl p-5 mb-3 shadow-sm">
      <h3 class="text-base font-medium text-text mb-3">角色</h3>
      <div class="flex gap-2 flex-wrap">
        <span v-for="role in store.roles" :key="role.role_key" class="inline-block px-3 py-1 rounded-full text-xs bg-[#e8eaf6] text-[#3f51b5]">
          {{ role.role_name || role.role_key }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 mt-4">
      <router-link to="/users" class="block bg-surface rounded-xl p-5 shadow-sm no-underline text-inherit hover:shadow-md transition-shadow">
        <h3 class="text-base text-primary font-medium mb-1">用户管理</h3>
        <p class="text-xs text-text-muted">审核注册、管理用户信息</p>
      </router-link>
      <router-link to="/apps" class="block bg-surface rounded-xl p-5 shadow-sm no-underline text-inherit hover:shadow-md transition-shadow">
        <h3 class="text-base text-primary font-medium mb-1">应用管理</h3>
        <p class="text-xs text-text-muted">管理应用配置、角色关联</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import useUser from '@/store/user'

const { store, logout } = useUser()
const router = useRouter()

function goProfile() {
  router.push('/profile')
}

onMounted(() => {
  if (!store.currentUser) {
    router.push('/login')
  }
})
</script>
