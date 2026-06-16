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
    path: '/config',
    name: 'config',
    component: () => import('@/views/ConfigView.vue'),
    meta: { title: '招生配置' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
