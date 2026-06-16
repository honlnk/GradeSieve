<template>
  <div class="max-w-[1200px] mx-auto">
    <div class="flex items-end justify-between mb-5 gap-4 flex-wrap">
      <div>
        <h1 class="text-[1.5rem] font-bold text-slate-900 m-0">数据展示与筛选</h1>
        <p class="text-slate-500 text-[0.88rem] mt-1 m-0">
          共 {{ studentStore.count }} 条考生数据 ·
          分数下限 {{ rule?.minTotalScore ?? '—' }} 分
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          :disabled="!canExport"
          @click="onExportAll"
        >
          <Icon name="download" :size="16" /> 导出全部分组
        </button>
        <RouterLink to="/upload" class="btn btn-outline">导入数据</RouterLink>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-if="!studentStore.count"
      class="text-center py-16 px-4 text-slate-400"
    >
      <div class="text-slate-300 inline-flex">
        <Icon name="list" :size="56" :stroke-width="1.2" />
      </div>
      <div class="my-2 text-base">还没有考生数据</div>
      <RouterLink to="/upload" class="btn btn-primary">前往导入</RouterLink>
    </div>

    <template v-else>
      <!-- 筛选条 -->
      <div
        class="flex gap-4 flex-wrap bg-white border border-slate-200 rounded-[10px]
               px-4 py-3 mb-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500">查看模式</label>
          <select v-model="viewMode" class="input-compact">
            <option value="all">全部考生</option>
            <option value="passed">达标（≥{{ rule?.minTotalScore ?? 180 }}）</option>
            <option value="failed">不达标</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500">目标学校</label>
          <select v-model="selectedGroup" class="input-compact">
            <option :value="0">全部学校</option>
            <option v-for="g in config.groups" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500">姓名/考号</label>
          <input v-model="keyword" class="input-compact" placeholder="搜索..." />
        </div>
      </div>

      <!-- 学校录取概览 -->
      <div
        v-if="config.groups.length"
        class="grid gap-3 mb-5 max-md:gap-2
               grid-cols-[repeat(auto-fill,minmax(180px,1fr))]
               max-md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]"
      >
        <div
          v-for="g in groupAdmissions"
          :key="g.id"
          class="bg-white border border-slate-200 rounded-[10px] py-[0.85rem] px-4
                 cursor-pointer transition-all hover:border-slate-300 max-md:px-3.5 max-md:py-3"
          :class="{
            'border-blue-600 ring-[3px] ring-blue-600/12':
              selectedGroup === g.id,
          }"
          @click="selectedGroup = selectedGroup === g.id ? 0 : g.id"
        >
          <div
            class="text-[0.9rem] font-semibold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {{ g.name }}
          </div>
          <div class="mt-1.5 flex items-baseline gap-1">
            <span class="text-[1.4rem] font-bold text-blue-600">{{ g.admitted }}</span>
            <span class="text-slate-300">/</span>
            <span class="text-slate-400">{{ g.target }}</span>
          </div>
          <div class="mt-2 h-1 bg-slate-100 rounded overflow-hidden">
            <div
              class="h-full bg-blue-600 transition-[width] duration-300"
              :style="{ width: barWidth(g.admitted, g.target) + '%' }"
            />
          </div>
          <div class="mt-1.5 text-xs text-slate-400">达标 {{ g.passed }} 人</div>
        </div>
      </div>

      <!-- 数据表 -->
      <div class="bg-white border border-slate-200 rounded-[10px] overflow-x-auto">
        <table class="data-table w-full border-collapse text-[0.88rem]">
          <thead>
            <tr>
              <th>序号</th>
              <th>姓名</th>
              <th class="col-secondary">性别</th>
              <th class="col-secondary">年龄</th>
              <th class="th-score">总分</th>
              <th class="col-secondary">语文</th>
              <th class="col-secondary">数学</th>
              <th class="col-secondary">英语</th>
              <th class="col-secondary">身份证号</th>
              <th>考号</th>
              <th v-if="selectedGroup">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(s, i) in pagedRows"
              :key="s.examNo || s.idCard || i"
              :class="{ 'row-failed': !isPassed(s) }"
            >
              <td>{{ i + 1 + (page - 1) * pageSize }}</td>
              <td>{{ s.name }}</td>
              <td class="col-secondary">{{ s.gender }}</td>
              <td class="col-secondary">{{ s.age }}</td>
              <td class="th-score">{{ s.totalScore }}</td>
              <td class="col-secondary">{{ s.chinese }}</td>
              <td class="col-secondary">{{ s.math }}</td>
              <td class="col-secondary">{{ s.english }}</td>
              <td class="col-secondary td-mono">{{ s.idCard }}</td>
              <td class="td-mono">{{ s.examNo }}</td>
              <td v-if="selectedGroup">
                <span v-if="!isPassed(s)" class="tag tag-gray">不达标</span>
                <span
                  v-else-if="admissionOf(s.examNo)?.admitted"
                  class="tag tag-green"
                  >录取 #{{ admissionOf(s.examNo)?.rank }}</span
                >
                <span v-else class="tag tag-orange">候补</span>
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td colspan="11" class="text-center text-slate-400 py-8">无匹配数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div
        v-if="totalPages > 1"
        class="mt-4 flex items-center justify-center gap-3"
      >
        <button
          class="btn btn-outline btn-sm"
          :disabled="page === 1"
          @click="page--"
        >
          上一页
        </button>
        <span class="text-[0.88rem] text-slate-600 min-w-[60px] text-center">
          {{ page }} / {{ totalPages }}
        </span>
        <button
          class="btn btn-outline btn-sm"
          :disabled="page === totalPages"
          @click="page++"
        >
          下一页
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useStudentStore } from '@/stores/student'
import { useConfigStore } from '@/stores/config'
import { admitGroup, type AdmissionResult } from '@/utils/admission'
import { exportGroupsAsWorkbooks } from '@/utils/excel'
import type { Student } from '@/types'
import Icon from '@/components/Icon.vue'

const studentStore = useStudentStore()
const config = useConfigStore()

const viewMode = ref<'all' | 'passed' | 'failed'>('all')
const selectedGroup = ref(0)
const keyword = ref('')
const page = ref(1)
const pageSize = 50

const rule = computed(() => config.rule)

// ===== 录取结果（按学校预计算）=====
const groupAdmissions = computed(() => {
  const r = rule.value
  if (!r) return []
  return config.groups.map((g) => {
    const majors = config.majorsOfGroup(g.id!)
    // MVP：每个学校都基于全部考生计算（实际录取匹配规则待定）
    const results = admitGroup(
      studentStore.students,
      r,
      g.targetCount,
      majors,
    )
    const admitted = results.filter((x) => x.admitted).length
    const passed = results.length
    return {
      id: g.id!,
      name: g.name,
      target: g.targetCount,
      admitted,
      passed,
      results,
    }
  })
})

// 选中的学校录取结果 → examNo → result 索引
const selectedAdmissionMap = computed(() => {
  const map = new Map<string, AdmissionResult>()
  if (selectedGroup.value) {
    const g = groupAdmissions.value.find((x) => x.id === selectedGroup.value)
    if (g) {
      for (const r of g.results) {
        const key = r.student.examNo || r.student.idCard
        if (key) map.set(key, r)
      }
    }
  }
  return map
})

function admissionOf(examNo: string) {
  return selectedAdmissionMap.value.get(examNo)
}

function isPassed(s: Student) {
  const min = rule.value?.minTotalScore ?? 180
  return s.totalScore >= min
}

// ===== 筛选 =====
const filteredRows = computed(() => {
  let list = studentStore.students
  const min = rule.value?.minTotalScore ?? 180
  if (viewMode.value === 'passed') list = list.filter((s) => s.totalScore >= min)
  if (viewMode.value === 'failed') list = list.filter((s) => s.totalScore < min)

  const kw = keyword.value.trim()
  if (kw) {
    list = list.filter(
      (s) => s.name.includes(kw) || s.examNo.includes(kw) || s.idCard.includes(kw),
    )
  }

  // 选中学校时，按该校名次排序展示
  if (selectedGroup.value) {
    const g = groupAdmissions.value.find((x) => x.id === selectedGroup.value)
    if (g) {
      const order = new Map<string, number>()
      g.results.forEach((r, i) => {
        const key = r.student.examNo || r.student.idCard
        if (key) order.set(key, i)
      })
      list = [...list].sort((a, b) => {
        const ka = a.examNo || a.idCard
        const kb = b.examNo || b.idCard
        return (order.get(ka) ?? 9999) - (order.get(kb) ?? 9999)
      })
    }
  }
  return list
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredRows.value.length / pageSize)),
)

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})

watch([viewMode, selectedGroup, keyword], () => {
  page.value = 1
})

function barWidth(admitted: number, target: number) {
  if (!target) return 0
  return Math.min(100, Math.round((admitted / target) * 100))
}

// ===== 导出 =====
const canExport = computed(
  () => studentStore.count > 0 && config.groups.length > 0 && !!rule.value,
)

async function onExportAll() {
  const groups = groupAdmissions.value.map((g) => ({
    name: g.name,
    students: g.results.filter((r) => r.admitted).map((r) => r.student),
  }))
  exportGroupsAsWorkbooks(groups, '分组录取结果.xlsx')
}

onMounted(async () => {
  await Promise.all([studentStore.load(), config.load()])
})
</script>

<style scoped lang="scss">
/* 表格内部样式：cell 内边距、hover、sticky 表头、窄屏隐藏次要列 */
.data-table {
  th,
  td {
    @apply px-[0.85rem] py-[0.6rem] text-left border-b border-slate-100 whitespace-nowrap
           max-md:px-[0.6rem] max-md:py-[0.45rem];
  }

  thead th {
    @apply bg-slate-50 text-slate-600 font-semibold text-[0.82rem] sticky top-0;
  }

  tbody tr:hover {
    @apply bg-slate-50;
  }

  .row-failed {
    @apply text-slate-400;
  }

  .th-score {
    @apply font-bold text-blue-600;
  }

  .td-mono {
    @apply font-mono text-[0.82rem];
  }

  /* 窄屏隐藏次要列 */
  .col-secondary {
    @apply max-md:hidden;
  }
}
</style>
