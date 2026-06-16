<template>
  <div class="page">
    <h1 class="title">数据导入</h1>
    <p class="desc">
      上传一份完整的考生成绩表（.xlsx / .csv）。导入后会覆盖本地现有数据。
    </p>

    <div
      class="dropzone"
      :class="{ dragging, disabled: importing }"
      @click="triggerPick"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        class="hidden-input"
        @change="onPick"
      />
      <div v-if="!importing" class="dropzone-content">
        <div class="upload-icon">
          <Icon name="upload" :size="40" :stroke-width="1.5" />
        </div>
        <div class="upload-text">
          点击选择文件，或拖拽文件到此处
        </div>
        <div class="upload-hint">支持 .xlsx / .xls / .csv</div>
      </div>
      <div v-else class="dropzone-content">
        <div class="spinner" />
        <div class="upload-text">正在导入...</div>
      </div>
    </div>

    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>

    <div v-if="missingFields.length" class="warnings">
      <div class="warnings-title">
        <Icon name="alert" :size="16" /> 以下行存在问题（已用默认值填充）：
      </div>
      <ul>
        <li v-for="(w, i) in missingFields.slice(0, 10)" :key="i">{{ w }}</li>
      </ul>
      <div v-if="missingFields.length > 10" class="warnings-more">
        ……共 {{ missingFields.length }} 处
      </div>
    </div>

    <div v-if="studentStore.count > 0" class="status-card">
      <div class="status-row">
        <div class="status-item">
          <div class="status-label">当前本地数据</div>
          <div class="status-value">{{ studentStore.count }} 条考生记录</div>
        </div>
        <button class="btn btn-danger-outline" @click="onClear">
          清空本地数据
        </button>
      </div>
      <div class="status-actions">
        <RouterLink to="/data" class="btn btn-primary">查看数据 →</RouterLink>
        <RouterLink to="/config" class="btn btn-outline">前往配置</RouterLink>
      </div>
    </div>

    <div class="format-hint">
      <div class="format-title">期望的表头格式：</div>
      <code>排名、姓名、性别、年龄、总分、语文、数学、英语、身份证号、考号</code>
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

<style scoped lang="scss">
.page {
  max-width: 760px;
  margin: 0 auto;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.25rem;
}

.desc {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0 0 1.5rem;
}

.dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 3rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;

  &:hover {
    border-color: var(--color-primary);
    background: #f8FAFC;
  }

  &.dragging {
    border-color: var(--color-primary);
    background: #eff6ff;
  }

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.hidden-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  color: #94a3b8;
  display: inline-flex;
}

.upload-text {
  font-size: 1rem;
  color: #334155;
}

.upload-hint {
  font-size: 0.8rem;
  color: #94a3b8;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;

  &.success {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  &.error {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }
}

.warnings {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #92400e;

  ul {
    margin: 0.5rem 0 0;
    padding-left: 1.25rem;
  }

  li {
    margin: 0.15rem 0;
  }

  &-title {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &-more {
    margin-top: 0.25rem;
    color: #b45309;
  }
}

.status-card {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.status-label {
  font-size: 0.8rem;
  color: #64748b;
}

.status-value {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin-top: 0.15rem;
}

.status-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.format-hint {
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #475569;

  code {
    display: block;
    margin-top: 0.4rem;
    color: #0f172a;
    word-break: break-all;
  }
}

// ===== 通用按钮样式 =====
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  transition: all 0.15s;

  &-primary {
    background: var(--color-primary);
    color: #fff;

    &:hover {
      background: #1d4ed8;
    }
  }

  &-outline {
    background: #fff;
    color: #334155;
    border: 1px solid #cbd5e1;

    &:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
  }

  &-danger-outline {
    background: #fff;
    color: #dc2626;
    border: 1px solid #fecaca;

    &:hover {
      background: #fef2f2;
    }
  }
}
</style>
