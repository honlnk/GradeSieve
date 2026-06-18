<template>
  <div class="max-w-[1100px] mx-auto">
    <h1 class="text-[1.5rem] font-bold text-slate-900 mb-1">招生计划与规则</h1>
    <p class="text-slate-500 text-sm mb-6">
      招生计划来源于导入文件的表3，仅展示。下方可调整录取规则。
    </p>

    <!-- 招生计划表 -->
    <div
      class="bg-white border border-slate-200 rounded-[10px] overflow-hidden mb-6"
    >
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div class="font-semibold text-slate-800">招生计划（表3）</div>
        <div class="text-sm text-slate-500">
          共 {{ dataStore.schools.length }} 校 · 计划合计
          <span class="font-bold text-slate-800">{{ totalQuota }}</span> 人
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="plan-table w-full border-collapse text-[0.88rem]">
          <thead>
            <tr>
              <th class="w-16">序号</th>
              <th>学校代码</th>
              <th>学校名称</th>
              <th class="text-right">计划数</th>
              <th class="text-right">达标候选</th>
              <th class="text-right">录取</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in dataStore.schools" :key="s.code">
              <td>{{ i + 1 }}</td>
              <td class="td-mono">{{ s.code }}</td>
              <td>{{ s.name }}</td>
              <td class="text-right font-semibold">{{ s.quota }}</td>
              <td class="text-right text-slate-500">{{ candidatesOf(s.code) }}</td>
              <td class="text-right">
                <span
                  :class="admittedOf(s.code) >= s.quota ? 'text-emerald-600 font-semibold' : 'text-amber-600'"
                >
                  {{ admittedOf(s.code) }}
                </span>
              </td>
            </tr>
            <tr v-if="!dataStore.schools.length">
              <td colspan="6" class="text-center text-slate-400 py-8">
                暂无招生计划数据，请先导入
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 录取规则 -->
    <div
      v-if="rule"
      class="bg-white border border-slate-200 rounded-[10px] p-5"
    >
      <div class="font-semibold text-slate-800 mb-4">录取规则</div>
      <div class="grid gap-5 max-md:gap-4">
        <!-- 语数外门槛 -->
        <div class="flex items-center gap-4 max-md:flex-col max-md:items-start">
          <label class="text-sm text-slate-600 w-40 shrink-0">语数外总分下限</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="ruleForm.minThreeScore"
              type="number"
              min="0"
              max="300"
              class="input-compact w-24"
            />
            <span class="text-sm text-slate-400">分（含）</span>
          </div>
          <span class="text-xs text-slate-400 max-md:ml-0 ml-auto">
            低于此分的考生不参与录取
          </span>
        </div>

        <!-- 排序科目优先级 -->
        <div class="flex items-start gap-4 max-md:flex-col max-md:items-start">
          <label class="text-sm text-slate-600 w-40 shrink-0 pt-1.5">
            排序科目优先级
          </label>
          <div class="flex flex-wrap gap-2 items-center">
            <template v-for="(field, i) in SORTABLE_FIELDS" :key="field.key">
              <span
                v-if="i > 0"
                class="text-slate-300 text-sm select-none"
                >→</span
              >
              <span
                class="px-2.5 py-1 rounded-md text-sm bg-slate-100 text-slate-700"
                >{{ field.label }}</span
              >
            </template>
          </div>
        </div>
        <p class="text-xs text-slate-400 max-md:ml-0 ml-40 -mt-2">
          每所学校内按此顺序降序排序，前 N 名录取。
        </p>
      </div>

      <div class="mt-6 flex items-center gap-3">
        <button
          class="btn btn-primary"
          :disabled="!dirty || saving"
          @click="onSave"
        >
          {{ saving ? '保存中...' : '保存并重算' }}
        </button>
        <button
          class="btn btn-outline"
          :disabled="!dirty"
          @click="resetForm"
        >
          恢复
        </button>
        <span v-if="message" :class="messageType === 'success' ? 'text-emerald-600' : 'text-rose-600'" class="text-sm">
          {{ message }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useDataStore } from '@/stores/data'
import { DEFAULT_RULE } from '@/db'

const dataStore = useDataStore()

const SORTABLE_FIELDS = [
  { key: 'threeScoreTotal', label: '语数外总分' },
  { key: 'chinese', label: '语文' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
] as const

const rule = computed(() => dataStore.rule)

const ruleForm = reactive<{ minThreeScore: number }>({
  minThreeScore: DEFAULT_RULE.minThreeScore,
})

const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const dirty = ref(false)

function resetForm() {
  if (!rule.value) return
  ruleForm.minThreeScore = rule.value.minThreeScore
  dirty.value = false
  message.value = ''
}

// 规则加载后同步到表单
watch(rule, (r) => {
  if (r) ruleForm.minThreeScore = r.minThreeScore
  dirty.value = false
})

watch(ruleForm, () => {
  if (rule.value) {
    dirty.value = ruleForm.minThreeScore !== rule.value.minThreeScore
  }
})

const totalQuota = computed(() =>
  dataStore.schools.reduce((sum, s) => sum + (Number(s.quota) || 0), 0),
)

function candidatesOf(code: string) {
  return dataStore.stats.schools.find((s) => s.code === code)?.candidates ?? 0
}
function admittedOf(code: string) {
  return dataStore.stats.schools.find((s) => s.code === code)?.admitted ?? 0
}

async function onSave() {
  if (!rule.value) return
  saving.value = true
  message.value = ''
  try {
    await dataStore.updateRule({
      minThreeScore: ruleForm.minThreeScore,
      // 排序优先级当前固定，保留原值
      sortPriority: rule.value.sortPriority,
    })
    message.value = '规则已更新，录取结果已重算。'
    messageType.value = 'success'
    dirty.value = false
  } catch (err) {
    message.value = `保存失败：${(err as Error).message}`
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await dataStore.load()
})
</script>

<style scoped lang="scss">
.plan-table {
  th,
  td {
    @apply px-4 py-[0.6rem] text-left border-b border-slate-100 whitespace-nowrap;
  }
  thead th {
    @apply bg-slate-50 text-slate-600 font-semibold text-[0.82rem];
  }
  tbody tr:hover {
    @apply bg-slate-50;
  }
  .td-mono {
    @apply font-mono text-[0.82rem] text-slate-500;
  }
}
</style>
