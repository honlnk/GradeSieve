<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-10">
    <div
      class="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between
             max-md:px-3 max-md:h-[50px]"
    >
      <div class="flex items-baseline gap-2 max-md:gap-[0.35rem]">
        <span class="inline-flex items-center text-blue-600">
          <Icon name="chart" :size="22" :stroke-width="2.2" />
        </span>
        <span class="font-bold text-[1.1rem] text-slate-900 max-md:text-base">
          GradeSieve
        </span>
        <span class="text-[0.8rem] text-slate-500 max-md:hidden">
          成绩筛分系统
        </span>
      </div>
      <nav class="flex gap-1 max-md:gap-0.5">
        <RouterLink to="/data" class="nav-link">录取结果</RouterLink>
        <RouterLink to="/upload" class="nav-link">数据导入</RouterLink>
        <RouterLink to="/plan" class="nav-link">招生计划</RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'
</script>

<style scoped lang="scss">
.nav-link {
  @apply px-3.5 py-1.5 rounded-md text-sm text-slate-600 no-underline transition-all
         hover:bg-slate-100 hover:text-slate-900
         max-md:px-[0.55rem] max-md:py-[0.35rem] max-md:text-[0.82rem];
}
</style>
