<template>
  <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2]">
    <div class="bg-surface rounded-2xl p-10 shadow-[0_20px_60px_rgba(0,0,0,0.15)] text-center w-[400px]">
      <h1 class="text-2xl mb-2 text-text">AuthCore 管理后台</h1>
      <p class="text-text-muted mb-6 text-sm">用户管理 / 角色管理</p>
      <div class="flex flex-col gap-3">
        <input v-model="unionid" placeholder="union_id（开发模式）" class="px-4 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
        <div class="flex items-center gap-3 text-text-muted text-xs before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">或</div>
        <input v-model="username" placeholder="用户名" class="px-4 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
        <input v-model="password" type="password" placeholder="密码" class="px-4 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
        <button @click="submit" :disabled="!canLogin"
          class="px-6 py-2.5 rounded-lg text-sm cursor-pointer bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed">登录</button>
      </div>
      <p v-if="error" class="text-danger mt-3 text-sm">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import useUser from '@/store/user'

const { loginWithPassword, login } = useUser()
const router = useRouter()
const unionid = ref('')
const username = ref('')
const password = ref('')
const error = ref('')

const canLogin = computed(() => unionid.value.trim() || (username.value.trim() && password.value.trim()))

async function submit() {
  error.value = ''
  console.log('[login] submit clicked, username=', username.value)
  let ok = false
  if (unionid.value.trim()) {
    ok = await login(unionid.value.trim())
  } else {
    ok = await loginWithPassword(username.value, password.value)
  }
  console.log('[login] submit result ok=', ok)
  if (ok) {
    console.log('[login] redirecting to /')
    router.push('/')
  } else {
    error.value = '登录失败'
  }
}
</script>
