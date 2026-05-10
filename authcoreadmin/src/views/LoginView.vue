<template>
  <div class="login-container">
    <div class="login-card">
      <h1>AuthCore 管理后台</h1>
      <p class="subtitle">用户管理 / 角色管理</p>
      <div class="login-form">
        <input v-model="unionid" placeholder="union_id（开发模式）" class="form-input" />
        <div class="divider"><span>或</span></div>
        <input v-model="username" placeholder="用户名" class="form-input" />
        <input v-model="password" type="password" placeholder="密码" class="form-input" />
        <button @click="submit" :disabled="!canLogin" class="btn btn-primary">登录</button>
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
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

<style scoped>
.login-container {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  background: white; border-radius: 16px; padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); text-align: center; width: 400px;
}
.login-card h1 { font-size: 24px; margin-bottom: 8px; color: #333; }
.subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
.login-form { display: flex; flex-direction: column; gap: 12px; }
.form-input { padding: 10px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
.form-input:focus { border-color: #667eea; }
.divider { display: flex; align-items: center; color: #ccc; font-size: 12px; }
.divider::before, .divider::after { content: ''; flex: 1; border-top: 1px solid #eee; }
.divider span { padding: 0 12px; }
.btn { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-primary { background: #667eea; color: white; }
.btn-primary:hover { background: #5a6fd6; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.error-msg { color: #e74c3c; margin-top: 12px; font-size: 14px; }
</style>
