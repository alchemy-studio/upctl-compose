<template>
  <div class="page">
    <header class="page-header">
      <h1>AuthCore 管理后台</h1>
      <div class="header-actions">
        <nav class="nav-links">
          <router-link to="/" class="nav-link" active-class="active" :exact="true">首页</router-link>
          <router-link to="/users" class="nav-link" active-class="active">用户</router-link>
          <router-link to="/apps" class="nav-link" active-class="active">应用</router-link>
        </nav>
        <span v-if="store.currentUser" class="user-name">👤 {{ store.currentUser.real_name }}</span>
        <button class="btn btn-text" @click="goProfile">个人</button>
        <button class="btn btn-text" @click="logout">退出</button>
      </div>
    </header>

    <div class="info-card">
      <h3>用户信息</h3>
      <div class="info-row"><label>用户名</label><span>{{ store.currentUser?.username || '-' }}</span></div>
      <div class="info-row"><label>姓名</label><span>{{ store.currentUser?.real_name || '-' }}</span></div>
    </div>

    <div class="info-card" v-if="store.roles.length">
      <h3>角色</h3>
      <div class="tags">
        <span v-for="role in store.roles" :key="role.role_key" class="tag">{{ role.role_name || role.role_key }}</span>
      </div>
    </div>

    <div class="quick-links">
      <router-link to="/users" class="quick-card">
        <h3>用户管理</h3>
        <p>审核注册、管理用户信息</p>
      </router-link>
      <router-link to="/apps" class="quick-card">
        <h3>应用管理</h3>
        <p>管理应用配置、角色关联</p>
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

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 0 16px 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; flex-wrap: wrap; gap: 8px; }
.page-header h1 { font-size: 20px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.user-name { color: #666; font-size: 14px; }
.btn-text { background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 14px; padding: 4px 8px; }
.nav-links { display: flex; gap: 4px; margin-right: 8px; }
.nav-link { padding: 6px 14px; border-radius: 6px; font-size: 13px; color: #666; text-decoration: none; }
.nav-link.active { background: #667eea; color: white; }
.info-card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.info-card h3 { font-size: 16px; margin-bottom: 12px; color: #333; }
.info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.info-row:last-child { border-bottom: none; }
.info-row label { width: 80px; color: #999; font-size: 14px; }
.info-row span { color: #333; font-size: 14px; }
.tags { display: flex; gap: 8px; flex-wrap: wrap; }
.tag { display: inline-block; padding: 4px 12px; border-radius: 12px; background: #e8eaf6; color: #3f51b5; font-size: 13px; }
.quick-links { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.quick-card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-decoration: none; color: inherit; transition: box-shadow 0.2s; }
.quick-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.quick-card h3 { font-size: 16px; color: #667eea; margin-bottom: 4px; }
.quick-card p { font-size: 13px; color: #999; }
</style>
