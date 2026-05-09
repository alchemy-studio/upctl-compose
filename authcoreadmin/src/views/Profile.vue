<template>
  <div class="page">
    <header class="page-header">
      <button class="btn btn-text" @click="goBack">← 返回</button>
      <h1>个人中心</h1>
      <button class="btn btn-text" @click="logout">退出</button>
    </header>

    <div v-if="store.currentUser" class="profile-card">
      <div class="avatar">{{ (store.currentUser.real_name || '?')[0] }}</div>
      <h2 class="name">{{ store.currentUser.real_name }}</h2>
      <p class="uid">ID: {{ store.currentUser.hty_id }}</p>
      <p class="unionid" v-if="store.currentUser.union_id">union_id: {{ store.currentUser.union_id }}</p>

      <div class="info-section">
        <h3>角色</h3>
        <div class="roles">
          <span v-for="role in store.roles" :key="role.role_key" class="role-tag">
            {{ role.role_name || role.role_key }}
          </span>
          <span v-if="store.roles.length === 0" class="no-data">无角色</span>
        </div>
      </div>

      <div class="info-section">
        <h3>标签</h3>
        <div class="tags">
          <span v-for="tag in store.currentUser.tags || []" :key="tag.tag_id" class="tag-item">
            {{ tag.tag_name }}
          </span>
          <span v-if="!store.currentUser.tags?.length" class="no-data">无标签</span>
        </div>
      </div>
    </div>

    <div v-else class="loading">加载中...</div>
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

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 0 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
.page-header h1 { font-size: 20px; }
.btn-text { background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 14px; padding: 4px 8px; }

.profile-card { background: white; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 600; margin: 0 auto 12px; }
.name { font-size: 20px; margin-bottom: 4px; }
.uid, .unionid { color: #999; font-size: 13px; margin-bottom: 4px; }

.info-section { text-align: left; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
.info-section h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
.roles, .tags { display: flex; gap: 6px; flex-wrap: wrap; }
.role-tag { padding: 4px 12px; border-radius: 12px; font-size: 12px; background: #e8f0fe; color: #1a73e8; }
.tag-item { padding: 4px 12px; border-radius: 12px; font-size: 12px; background: #f3e8fd; color: #7c3aed; }
.no-data { color: #ccc; font-size: 13px; }
.loading { text-align: center; padding: 40px; color: #999; }
</style>
