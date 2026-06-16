<template>
  <header class="header">
    <div class="header-inner">
      <div class="brand">
        <span class="brand-mark">
          <Icon name="chart" :size="22" :stroke-width="2.2" />
        </span>
        <span class="brand-text">GradeSieve</span>
        <span class="brand-sub">成绩筛分系统</span>
      </div>
      <nav class="nav">
        <RouterLink to="/data" class="nav-link">数据展示</RouterLink>
        <RouterLink to="/upload" class="nav-link">数据导入</RouterLink>
        <RouterLink to="/config" class="nav-link">招生配置</RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'
</script>

<style scoped lang="scss">
.header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;

  &-mark {
    display: inline-flex;
    align-items: center;
    color: var(--color-primary);
  }

  &-text {
    font-weight: 700;
    font-size: 1.1rem;
    color: #0f172a;
  }

  &-sub {
    font-size: 0.8rem;
    color: #64748b;
  }
}

.nav {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #475569;
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  &.router-link-active {
    background: var(--color-primary);
    color: #fff;
  }
}

/* ===== 移动端 (<768px)：精简顶栏 ===== */
@media (max-width: 768px) {
  .header-inner {
    padding: 0 0.75rem;
    height: 50px;
  }

  .brand {
    gap: 0.35rem;

    &-text {
      font-size: 1rem;
    }

    /* 隐藏副标题，避免与导航项挤在一行 */
    &-sub {
      display: none;
    }
  }

  .nav {
    gap: 0.125rem;
  }

  .nav-link {
    padding: 0.35rem 0.55rem;
    font-size: 0.82rem;
  }
}
</style>
