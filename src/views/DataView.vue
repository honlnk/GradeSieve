<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="title">数据展示与筛选</h1>
        <p class="desc">
          共 {{ studentStore.count }} 条考生数据 ·
          分数下限 {{ rule?.minTotalScore ?? '—' }} 分
        </p>
      </div>
      <div class="head-actions">
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
    <div v-if="!studentStore.count" class="empty-state">
      <div class="empty-icon">
        <Icon name="list" :size="56" :stroke-width="1.2" />
      </div>
      <div class="empty-text">还没有考生数据</div>
      <RouterLink to="/upload" class="btn btn-primary">前往导入</RouterLink>
    </div>

    <template v-else>
      <!-- 筛选条 -->
      <div class="toolbar">
        <div class="filter">
          <label class="filter-label">查看模式</label>
          <select v-model="viewMode" class="input input-sm">
            <option value="all">全部考生</option>
            <option value="passed">达标（≥{{ rule?.minTotalScore ?? 180 }}）</option>
            <option value="failed">不达标</option>
          </select>
        </div>
        <div class="filter">
          <label class="filter-label">目标学校</label>
          <select v-model="selectedGroup" class="input input-sm">
            <option :value="0">全部学校</option>
            <option v-for="g in config.groups" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
        </div>
        <div class="filter">
          <label class="filter-label">姓名/考号</label>
          <input
            v-model="keyword"
            class="input input-sm"
            placeholder="搜索..."
          />
        </div>
      </div>

      <!-- 学校录取概览 -->
      <div v-if="config.groups.length" class="overview">
        <div
          v-for="g in groupAdmissions"
          :key="g.id"
          class="overview-card"
          :class="{ active: selectedGroup === g.id }"
          @click="selectedGroup = selectedGroup === g.id ? 0 : g.id"
        >
          <div class="overview-name">{{ g.name }}</div>
          <div class="overview-nums">
            <span class="num-strong">{{ g.admitted }}</span>
            <span class="num-sep">/</span>
            <span class="num-weak">{{ g.target }}</span>
          </div>
          <div class="overview-bar">
            <div
              class="overview-bar-fill"
              :style="{ width: barWidth(g.admitted, g.target) + '%' }"
            />
          </div>
          <div class="overview-hint">达标 {{ g.passed }} 人</div>
        </div>
      </div>

      <!-- 数据表 -->
      <div class="table-wrap">
        <table class="data-table">
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
                <span
                  v-if="!isPassed(s)"
                  class="tag tag-gray"
                >不达标</span>
                <span
                  v-else-if="admissionOf(s.examNo)?.admitted"
                  class="tag tag-green"
                >录取 #{{ admissionOf(s.examNo)?.rank }}</span>
                <span v-else class="tag tag-orange">候补</span>
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td colspan="11" class="table-empty">无匹配数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <button class="btn btn-outline btn-sm" :disabled="page === 1" @click="page--">
          上一页
        </button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
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
    students: g.results
      .filter((r) => r.admitted)
      .map((r) => r.student),
  }))
  exportGroupsAsWorkbooks(groups, '分组录取结果.xlsx')
}

onMounted(async () => {
  await Promise.all([studentStore.load(), config.load()])
})
</script>

<style scoped lang="scss">
.page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.desc {
  color: #64748b;
  font-size: 0.88rem;
  margin: 0.2rem 0 0;
}

.head-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #94a3b8;
}

.empty-icon {
  color: #cbd5e1;
  display: inline-flex;
}

.empty-text {
  margin: 0.5rem 0 1.25rem;
  font-size: 1rem;
}

.toolbar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.filter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-label {
  font-size: 0.75rem;
  color: #64748b;
}

.overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.overview-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #cbd5e1;
  }

  &.active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
}

.overview-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-nums {
  margin-top: 0.35rem;
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}

.num-strong {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
}

.num-sep {
  color: #cbd5e1;
}

.num-weak {
  color: #94a3b8;
}

.overview-bar {
  margin-top: 0.5rem;
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
}

.overview-bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s;
}

.overview-hint {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.table-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;

  th,
  td {
    padding: 0.6rem 0.85rem;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
    white-space: nowrap;
  }

  thead th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    font-size: 0.82rem;
    position: sticky;
    top: 0;
  }

  tbody tr:hover {
    background: #f8fafc;
  }

  .row-failed {
    color: #94a3b8;
  }

  .th-score {
    font-weight: 700;
    color: var(--color-primary);
  }

  .td-mono {
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.82rem;
  }
}

.table-empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 0 !important;
}

.tag {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;

  &-green {
    background: #dcfce7;
    color: #166534;
  }

  &-orange {
    background: #ffedd5;
    color: #9a3412;
  }

  &-gray {
    background: #f1f5f9;
    color: #64748b;
  }
}

.pagination {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.page-info {
  font-size: 0.88rem;
  color: #475569;
  min-width: 60px;
  text-align: center;
}

// ===== 通用 =====
.input {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.88rem;
  outline: none;
  background: #fff;

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  &-sm {
    width: auto;
    min-width: 120px;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  transition: all 0.15s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &-sm {
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
  }

  &-primary {
    background: var(--color-primary);
    color: #fff;

    &:hover:not(:disabled) {
      background: #1d4ed8;
    }
  }

  &-outline {
    background: #fff;
    color: #334155;
    border: 1px solid #cbd5e1;

    &:hover:not(:disabled) {
      background: #f8fafc;
    }
  }
}

/* ===== 移动端 (<768px) ===== */
@media (max-width: 768px) {
  .title {
    font-size: 1.25rem;
  }

  /* 概览卡片：缩小最小宽度，让一行能放 2 张 */
  .overview {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
  }

  /* 表格：隐藏次要列（性别/年龄/语文/数学/英语/身份证号）
     保留 序号/姓名/总分/考号/状态，仍可横向滚动查看隐藏列 */
  .col-secondary {
    display: none;
  }

  /* 表头/单元格内边距收窄 */
  .data-table th,
  .data-table td {
    padding: 0.45rem 0.6rem;
  }

  /* 筛选输入框：窄屏收窄最小宽度，避免单行被撑开 */
  .input-sm {
    min-width: 100px;
  }
}
</style>
