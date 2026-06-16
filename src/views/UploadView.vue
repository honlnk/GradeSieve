<template>
  <div class="max-w-[760px] mx-auto">
    <h1 class="text-[1.5rem] font-bold text-slate-900 mb-1">数据导入</h1>
    <p class="text-slate-500 text-sm mb-6">
      上传一份完整的考生成绩表（.xlsx / .csv）。导入后会覆盖本地现有数据。
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
        accept=".xlsx,.xls,.csv"
        class="hidden"
        @change="onPick"
      />
      <div v-if="!importing" class="flex flex-col items-center gap-2">
        <div class="text-slate-400 inline-flex">
          <Icon name="upload" :size="40" :stroke-width="1.5" />
        </div>
        <div class="text-base text-slate-700">点击选择文件，或拖拽文件到此处</div>
        <div class="text-xs text-slate-400">支持 .xlsx / .xls / .csv</div>
      </div>
      <div v-else class="flex flex-col items-center gap-2">
        <div
          class="h-7 w-7 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin"
        />
        <div class="text-base text-slate-700">正在导入...</div>
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
      v-if="missingFields.length"
      class="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-[0.85rem] text-amber-700"
    >
      <div class="font-semibold flex items-center gap-1.5">
        <Icon name="alert" :size="16" /> 以下行存在问题（已用默认值填充）：
      </div>
      <ul class="mt-2 pl-5">
        <li v-for="(w, i) in missingFields.slice(0, 10)" :key="i" class="my-[0.15rem]">
          {{ w }}
        </li>
      </ul>
      <div v-if="missingFields.length > 10" class="mt-1 text-amber-600">
        ……共 {{ missingFields.length }} 处
      </div>
    </div>

    <div
      v-if="studentStore.count > 0"
      class="mt-6 p-5 bg-white border border-slate-200 rounded-[10px]"
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-xs text-slate-500">当前本地数据</div>
          <div class="text-base font-semibold text-slate-900 mt-[0.15rem]">
            {{ studentStore.count }} 条考生记录
          </div>
        </div>
        <button class="btn btn-danger-outline" @click="onClear">清空本地数据</button>
      </div>
      <div class="mt-4 flex gap-3 flex-wrap">
        <RouterLink to="/data" class="btn btn-primary">查看数据 →</RouterLink>
        <RouterLink to="/config" class="btn btn-outline">前往配置</RouterLink>
      </div>
    </div>

    <div class="mt-6 px-4 py-3 bg-slate-100 rounded-lg text-[0.85rem] text-slate-600">
      <div class="font-medium">期望的表头格式：</div>
      <code class="block mt-1.5 text-slate-900 break-all">
        排名、姓名、性别、年龄、总分、语文、数学、英语、身份证号、考号
      </code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useStudentStore } from '@/stores/student'
import { parseStudentsFromBuffer } from '@/utils/excel'
import Icon from '@/components/Icon.vue'

const studentStore = useStudentStore()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const importing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const missingFields = ref<string[]>([])

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
  missingFields.value = []
  try {
    const buf = await file.arrayBuffer()
    const { students, missingFields: mf } = parseStudentsFromBuffer(buf)
    if (!students.length) {
      message.value = '未解析到任何数据，请检查文件内容。'
      messageType.value = 'error'
      return
    }
    await studentStore.replaceAll(students)
    missingFields.value = mf
    message.value = `成功导入 ${students.length} 条记录。`
    messageType.value = 'success'
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
  if (!confirm('确定要清空本地全部考生数据吗？此操作不可撤销。')) return
  await studentStore.clear()
  message.value = '已清空本地数据。'
  messageType.value = 'success'
}
</script>
