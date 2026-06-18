import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/data',
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/views/UploadView.vue'),
    meta: { title: '数据导入' },
  },
  {
    path: '/data',
    name: 'data',
    component: () => import('@/views/DataView.vue'),
    meta: { title: '数据展示' },
  },
  {
    path: '/plan',
    name: 'plan',
    component: () => import('@/views/PlanView.vue'),
    meta: { title: '招生计划' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
