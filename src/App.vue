<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />
    <main class="flex-1 w-full max-w-[1400px] mx-auto p-6 max-md:p-4">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
</script>
