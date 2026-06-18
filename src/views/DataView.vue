<template>
  <div class="max-w-[1400px] mx-auto">
    <div class="flex items-end justify-between mb-5 gap-4 flex-wrap">
      <div>
        <h1 class="text-[1.5rem] font-bold text-slate-900 m-0">录取结果</h1>
        <p class="text-slate-500 text-[0.88rem] mt-1 m-0" v-if="dataStore.hasData">
          共 {{ stats.total }} 人报考 · 录取 {{ stats.admitted }} 人 · 候补
          {{ stats.overflow }} 人 · 语数外门槛
          {{ dataStore.rule?.minThreeScore ?? '—' }} 分
        </p>
      </div>
      <div class="flex items-center gap-4 flex-wrap">
        <!-- 导出范围开关 -->
        <label
          class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none"
          :class="{ 'opacity-50 cursor-not-allowed': !canExport }"
        >
          <input
            type="checkbox"
            class="toggle"
            v-model="exportIncludeCandidates"
            :disabled="!canExport"
          />
          含候补
        </label>
        <button class="btn btn-primary" :disabled="!canExport" @click="onExportAll">
          <Icon name="download" :size="16" />
          {{ exportIncludeCandidates ? '导出各校录取+候补名单' : '导出各校录取名单' }}
        </button>
        <RouterLink to="/upload" class="btn btn-outline">导入数据</RouterLink>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-if="!dataStore.hasData"
      class="text-center py-16 px-4 text-slate-400"
    >
      <div class="text-slate-300 inline-flex">
        <Icon name="list" :size="56" :stroke-width="1.2" />
      </div>
      <div class="my-2 text-base">还没有数据</div>
      <RouterLink to="/upload" class="btn btn-primary">前往导入</RouterLink>
    </div>

    <template v-else>
      <!-- 流程摘要 -->
      <div
        class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5
               bg-white border border-slate-200 rounded-[10px] p-4"
      >
        <div class="stat">
          <div class="stat-num">{{ stats.total }}</div>
          <div class="stat-label">表1 报考</div>
        </div>
        <div class="stat">
          <div class="stat-num text-rose-600">−{{ stats.removedByHighSchool }}</div>
          <div class="stat-label">普高已录取</div>
        </div>
        <div class="stat">
          <div class="stat-num text-amber-600">−{{ stats.removedByScore }}</div>
          <div class="stat-label">语数外不达标</div>
        </div>
        <div class="stat">
          <div class="stat-num text-emerald-600">{{ stats.admitted }}</div>
          <div class="stat-label">最终录取</div>
        </div>
        <div class="stat">
          <div class="stat-num text-slate-500">{{ stats.overflow }}</div>
          <div class="stat-label">候补</div>
        </div>
      </div>

      <!-- 筛选条 -->
      <div
        class="flex gap-4 flex-wrap bg-white border border-slate-200 rounded-[10px]
               px-4 py-3 mb-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500">查看模式</label>
          <select v-model="viewMode" class="input-compact">
            <option value="all">全部</option>
            <option value="admitted">仅录取</option>
            <option value="overflow">候补</option>
            <option value="eliminated">已剔除</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500">学校</label>
          <select v-model="selectedSchool" class="input-compact">
            <option value="">全部学校</option>
            <option v-for="s in dataStore.schools" :key="s.code" :value="s.code">
              {{ s.name }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500">姓名/身份证/报名号</label>
          <input v-model="keyword" class="input-compact" placeholder="搜索..." />
        </div>
      </div>

      <!-- 学校录取概览卡片 -->
      <div
        class="grid gap-3 mb-5 max-md:gap-2
               grid-cols-[repeat(auto-fill,minmax(200px,1fr))]
               max-md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
      >
        <div
          v-for="s in stats.schools"
          :key="s.code"
          class="bg-white border border-slate-200 rounded-[10px] py-[0.85rem] px-4
                 cursor-pointer transition-all hover:border-slate-300 max-md:px-3.5 max-md:py-3"
          :class="{
            'border-blue-600 ring-[3px] ring-blue-600/12':
              selectedSchool === s.code,
          }"
          @click="selectedSchool = selectedSchool === s.code ? '' : s.code"
        >
          <div
            class="text-[0.9rem] font-semibold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis"
            :title="s.name"
          >
            {{ s.name }}
          </div>
          <div class="mt-1.5 flex items-baseline gap-1">
            <span class="text-[1.4rem] font-bold text-blue-600">{{ s.admitted }}</span>
            <span class="text-slate-300">/</span>
            <span class="text-slate-400">{{ s.quota }}</span>
          </div>
          <div class="mt-2 h-1 bg-slate-100 rounded overflow-hidden">
            <div
              class="h-full bg-blue-600 transition-[width] duration-300"
              :style="{ width: barWidth(s.admitted, s.quota) + '%' }"
            />
          </div>
          <div class="mt-1.5 text-xs text-slate-400">达标候选 {{ s.candidates }} 人</div>
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
              <th class="col-secondary">区县</th>
              <th class="col-secondary">就读学校</th>
              <th class="th-score">语数外</th>
              <th class="col-secondary">语文</th>
              <th class="col-secondary">数学</th>
              <th class="col-secondary">英语</th>
              <th class="col-secondary">物理</th>
              <th class="col-secondary">化学</th>
              <th>志愿学校</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in pagedRows"
              :key="r.applicant.idCard || r.applicant.examNo || i"
              :class="{
                'row-eliminated':
                  r.eliminatedReason === 'high-school' ||
                  r.eliminatedReason === 'score',
              }"
            >
              <td>{{ i + 1 + (page - 1) * pageSize }}</td>
              <td>{{ r.applicant.name }}</td>
              <td class="col-secondary">{{ r.applicant.gender }}</td>
              <td class="col-secondary">{{ r.applicant.district }}</td>
              <td class="col-secondary td-clamp">{{ r.applicant.middleSchool }}</td>
              <td class="th-score">{{ r.applicant.threeScoreTotal }}</td>
              <td class="col-secondary">{{ r.applicant.chinese }}</td>
              <td class="col-secondary">{{ r.applicant.math }}</td>
              <td class="col-secondary">{{ r.applicant.english }}</td>
              <td class="col-secondary">{{ r.applicant.physics }}</td>
              <td class="col-secondary">{{ r.applicant.chemistry }}</td>
              <td class="td-clamp" :title="r.schoolName">{{ r.schoolName }}</td>
              <td>
                <span v-if="r.admitted" class="tag tag-green"
                  >录取 #{{ r.rank }}</span
                >
                <span v-else-if="r.eliminatedReason === 'overflow'" class="tag tag-orange"
                  >候补 #{{ r.rank }}</span
                >
                <span v-else-if="r.eliminatedReason === 'score'" class="tag tag-gray"
                  >不达标</span
                >
                <span v-else-if="r.eliminatedReason === 'high-school'" class="tag tag-gray"
                  >普高录取</span
                >
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td colspan="13" class="text-center text-slate-400 py-8">无匹配数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-3">
        <button class="btn btn-outline btn-sm" :disabled="page === 1" @click="page--">
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
import { useDataStore } from '@/stores/data'
import { exportSchoolsAsWorkbook } from '@/utils/excel'
import type { AdmitResult } from '@/types'
import Icon from '@/components/Icon.vue'

const dataStore = useDataStore()

const viewMode = ref<'all' | 'admitted' | 'overflow' | 'eliminated'>('all')
const selectedSchool = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = 50

/** 导出范围：false=仅录取，true=录取+候补 */
const exportIncludeCandidates = ref(false)

const stats = computed(() => dataStore.stats)

const filteredRows = computed<AdmitResult[]>(() => {
  let list = dataStore.results

  if (viewMode.value === 'admitted') list = list.filter((r) => r.admitted)
  else if (viewMode.value === 'overflow')
    list = list.filter((r) => r.eliminatedReason === 'overflow')
  else if (viewMode.value === 'eliminated')
    list = list.filter(
      (r) => r.eliminatedReason === 'high-school' || r.eliminatedReason === 'score',
    )

  if (selectedSchool.value) {
    list = list.filter((r) => r.schoolCode === selectedSchool.value)
  }

  const kw = keyword.value.trim()
  if (kw) {
    list = list.filter(
      (r) =>
        r.applicant.name.includes(kw) ||
        r.applicant.idCard.includes(kw) ||
        r.applicant.examNo.includes(kw),
    )
  }

  // 选了学校时按校内名次排序；否则按 录取→候补→剔除 顺序
  if (selectedSchool.value) {
    list = [...list].sort((a, b) => a.rank - b.rank)
  } else {
    const order = (r: AdmitResult) =>
      r.admitted ? 0 : r.eliminatedReason === 'overflow' ? 1 : 2
    list = [...list].sort((a, b) => order(a) - order(b))
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

watch([viewMode, selectedSchool, keyword], () => {
  page.value = 1
})

function barWidth(admitted: number, target: number) {
  if (!target) return 0
  return Math.min(100, Math.round((admitted / target) * 100))
}

const canExport = computed(
  () => dataStore.hasData && dataStore.schools.length > 0,
)

function onExportAll() {
  const includeCandidates = exportIncludeCandidates.value
  const schoolExports = dataStore.schools.map((s) => {
    const list = dataStore.bySchool.get(s.code) ?? []
    const filtered = includeCandidates
      ? list.filter(
          (r) => r.admitted || r.eliminatedReason === 'overflow',
        )
      : list.filter((r) => r.admitted)
    return {
      name: s.name,
      rows: filtered.map((r) => ({
        applicant: r.applicant,
        rank: r.rank,
        admitted: r.admitted,
      })),
    }
  })
  exportSchoolsAsWorkbook(schoolExports, {
    includeCandidates,
    fileName: includeCandidates ? '各校录取及候补名单.xlsx' : '各校录取名单.xlsx',
  })
}

onMounted(async () => {
  await dataStore.load()
})
</script>

<style scoped lang="scss">
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

  .row-eliminated {
    @apply text-slate-400;
  }

  .th-score {
    @apply font-bold text-blue-600;
  }

  /* 长文本列省略号 */
  .td-clamp {
    @apply max-w-[180px] overflow-hidden text-ellipsis;
  }

  /* 窄屏隐藏次要列 */
  .col-secondary {
    @apply max-md:hidden;
  }
}

.stat {
  @apply text-center;
  .stat-num {
    @apply text-[1.5rem] font-bold text-slate-900 leading-none max-md:text-[1.25rem];
  }
  .stat-label {
    @apply text-xs text-slate-500 mt-1.5;
  }
}

/* 导出范围开关：原生 checkbox 伪装成 toggle */
.toggle {
  @apply appearance-none w-9 h-5 rounded-full bg-slate-300 relative
         cursor-pointer transition-colors duration-200 outline-none;

  &::after {
    content: '';
    @apply absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white
           shadow transition-transform duration-200;
  }

  &:checked {
    @apply bg-blue-600;
    &::after {
      @apply translate-x-4;
    }
  }

  &:disabled {
    @apply opacity-60 cursor-not-allowed;
  }
}
</style>
