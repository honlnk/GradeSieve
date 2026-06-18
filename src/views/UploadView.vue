<template>
  <div class="max-w-[760px] mx-auto">
    <h1 class="text-[1.5rem] font-bold text-slate-900 mb-1">数据导入</h1>
    <p class="text-slate-500 text-sm mb-6">
      上传包含三张工作表的汇总文件（.xls / .xlsx）：<br />
      <span class="text-slate-400">表1 同报志愿名单、表2 普高拟录取名单、表3 招生计划。</span>
      导入后会覆盖本地现有数据。
    </p>

    <div
      class="border-2 border-dashed border-slate-300 rounded-xl py-12 px-6 text-center
             cursor-pointer transition-all bg-white hover:border-blue-600 hover:bg-slate-50"
      :class="{
        'border-blue-600 bg-blue-50': dragging,
        'opacity-60 cursor-not-allowed': importing,
      }"
      @click="triggerPick"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls"
        class="hidden"
        @change="onPick"
      />
      <div v-if="!importing" class="flex flex-col items-center gap-2">
        <div class="text-slate-400 inline-flex">
          <Icon name="upload" :size="40" :stroke-width="1.5" />
        </div>
        <div class="text-base text-slate-700">点击选择文件，或拖拽文件到此处</div>
        <div class="text-xs text-slate-400">支持 .xls / .xlsx（含三张表）</div>
      </div>
      <div v-else class="flex flex-col items-center gap-2">
        <div
          class="h-7 w-7 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin"
        />
        <div class="text-base text-slate-700">正在解析三表数据...</div>
      </div>
    </div>

    <div
      v-if="message"
      class="mt-4 px-4 py-3 rounded-lg text-sm"
      :class="
        messageType === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      "
    >
      {{ message }}
    </div>

    <div
      v-if="errors.length"
      class="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-[0.85rem] text-amber-700"
    >
      <div class="font-semibold flex items-center gap-1.5">
        <Icon name="alert" :size="16" /> 解析时发现以下问题：
      </div>
      <ul class="mt-2 pl-5">
        <li v-for="(w, i) in errors" :key="i" class="my-[0.15rem]">{{ w }}</li>
      </ul>
    </div>

    <!-- 导入摘要 -->
    <div
      v-if="summary"
      class="mt-6 p-5 bg-white border border-slate-200 rounded-[10px]"
    >
      <div class="text-xs text-slate-500 mb-3">本次导入</div>
      <div class="grid grid-cols-3 gap-4 text-center max-md:grid-cols-3 max-md:gap-2">
        <div>
          <div class="text-[1.6rem] font-bold text-slate-900">
            {{ summary.applicants }}
          </div>
          <div class="text-xs text-slate-500 mt-1">表1 报考</div>
        </div>
        <div>
          <div class="text-[1.6rem] font-bold text-slate-900">
            {{ summary.admitted }}
          </div>
          <div class="text-xs text-slate-500 mt-1">表2 普高录取</div>
        </div>
        <div>
          <div class="text-[1.6rem] font-bold text-slate-900">
            {{ summary.schools }}
          </div>
          <div class="text-xs text-slate-500 mt-1">表3 招生校</div>
        </div>
      </div>
      <div class="mt-5 flex gap-3 flex-wrap">
        <RouterLink to="/data" class="btn btn-primary">查看录取结果 →</RouterLink>
        <RouterLink to="/plan" class="btn btn-outline">招生计划</RouterLink>
      </div>
    </div>

    <!-- 已有数据时显示清空入口 -->
    <div
      v-else-if="dataStore.hasData"
      class="mt-6 p-5 bg-white border border-slate-200 rounded-[10px]"
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-xs text-slate-500">当前本地数据</div>
          <div class="text-base font-semibold text-slate-900 mt-[0.15rem]">
            表1 {{ dataStore.applicants.length }} 人 · 表3
            {{ dataStore.schools.length }} 校
          </div>
        </div>
        <button class="btn btn-danger-outline" @click="onClear">清空本地数据</button>
      </div>
      <div class="mt-4 flex gap-3 flex-wrap">
        <RouterLink to="/data" class="btn btn-primary">查看录取结果 →</RouterLink>
        <RouterLink to="/plan" class="btn btn-outline">招生计划</RouterLink>
      </div>
    </div>

    <div class="mt-6 px-4 py-3 bg-slate-100 rounded-lg text-[0.85rem] text-slate-600">
      <div class="font-medium">工作簿需包含三张表：</div>
      <ul class="mt-1.5 pl-5 list-disc">
        <li>表1 / 表2 列：序号、区县、就读学校、报名号、姓名、性别、身份证号、民族、学籍号、普高1、普高2、职教高考班、3+4志愿学校、语文、数学、英语、物理、化学</li>
        <li>表3 列：学校名称、计划数</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { parseWorkbook } from '@/utils/excel'
import Icon from '@/components/Icon.vue'

const dataStore = useDataStore()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const importing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const errors = ref<string[]>([])
const summary = ref<{ applicants: number; admitted: number; schools: number } | null>(
  null,
)

function triggerPick() {
  if (importing.value) return
  fileInput.value?.click()
}

function onPick(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) handleFile(target.files[0])
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

async function handleFile(file: File) {
  importing.value = true
  message.value = ''
  errors.value = []
  summary.value = null
  try {
    const buf = await file.arrayBuffer()
    const parsed = parseWorkbook(buf)

    if (!parsed.applicants.length && !parsed.schools.length) {
      message.value = '未解析到任何数据，请检查文件内容是否包含三张表。'
      messageType.value = 'error'
      return
    }

    await dataStore.replaceAll(parsed)

    summary.value = {
      applicants: parsed.applicants.length,
      admitted: parsed.admitted.length,
      schools: parsed.schools.length,
    }
    message.value = `成功导入：表1 ${parsed.applicants.length} 人 / 表2 ${parsed.admitted.length} 人 / 表3 ${parsed.schools.length} 校。`
    messageType.value = 'success'
    if (parsed.errors.length) errors.value = parsed.errors
  } catch (err) {
    console.error(err)
    message.value = `导入失败：${(err as Error).message}`
    messageType.value = 'error'
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function onClear() {
  if (!confirm('确定要清空本地全部数据吗？此操作不可撤销。')) return
  await dataStore.clearAll()
  message.value = '已清空本地数据。'
  messageType.value = 'success'
  summary.value = null
}
</script>
