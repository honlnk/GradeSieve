<template>
  <div class="max-w-[960px] mx-auto">
    <h1 class="text-[1.5rem] font-bold text-slate-900 m-0 max-md:text-[1.25rem]">
      招生配置
    </h1>
    <p class="text-slate-500 text-[0.88rem] mt-1 mb-6 m-0">
      配置目标学校（分组）、专业名额与分数规则。数据保存在本地浏览器。
    </p>

    <!-- 分数规则 -->
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">分数规则</h2>
      </div>
      <div class="card-body">
        <div class="flex items-center gap-3 py-1.5 max-md:flex-wrap">
          <label class="w-[100px] text-[0.9rem] text-slate-600">总分下限</label>
          <input
            v-model.number="ruleForm.minTotalScore"
            type="number"
            class="input max-w-[120px]"
            min="0"
            @change="saveRule"
          />
          <span class="text-[0.8rem] text-slate-400">低于此分数的考生将被过滤</span>
        </div>
        <div class="flex items-center gap-3 py-1.5 max-md:flex-wrap">
          <label class="w-[100px] text-[0.9rem] text-slate-600">排序优先级</label>
          <span class="font-semibold text-blue-600">{{ rulePriorityLabel }}</span>
          <span class="text-[0.8rem] text-slate-400">
            （总分 → 语文 → 数学 → 英语，暂不支持调整）
          </span>
        </div>
      </div>
    </section>

    <!-- 目标学校 / 分组 -->
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">目标学校（{{ config.groups.length }}）</h2>
        <button class="btn btn-primary btn-sm" @click="openGroupDialog()">
          + 新增学校
        </button>
      </div>
      <div class="card-body">
        <div v-if="!config.groups.length" class="text-center text-slate-400 py-8 text-[0.9rem]">
          还没有目标学校，点击右上角新增。
        </div>
        <div
          v-for="g in config.groups"
          :key="g.id"
          class="border border-slate-200 rounded-[10px] p-4 px-[1.1rem] mb-4 last:mb-0 max-md:p-[0.85rem_0.9rem]"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="font-semibold text-slate-900 text-base">{{ g.name }}</span>
              <span class="badge">目标 {{ g.targetCount }} 人</span>
            </div>
            <div class="flex gap-1.5">
              <button class="btn btn-outline btn-xs" @click="openGroupDialog(g)">
                编辑
              </button>
              <button class="btn btn-danger-outline btn-xs" @click="removeGroup(g)">
                删除
              </button>
            </div>
          </div>

          <!-- 专业列表 -->
          <div class="mt-[0.85rem]">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[0.85rem] text-slate-500">专业与名额</span>
              <button class="btn btn-outline btn-xs" @click="openMajorDialog(g)">
                + 添加专业
              </button>
            </div>
            <div
              v-if="!config.majorsOfGroup(g.id!).length"
              class="text-[0.85rem] text-slate-400 py-2"
            >
              暂无专业
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="m in config.majorsOfGroup(g.id!)"
                :key="m.id"
                class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[0.85rem]"
              >
                <span class="text-slate-800">{{ m.name }}</span>
                <span class="text-slate-500">{{ m.quota }} 人</span>
                <button
                  class="icon-btn"
                  title="编辑"
                  @click="openMajorDialog(g, m)"
                >
                  <Icon name="edit" :size="14" />
                </button>
                <button
                  class="icon-btn icon-btn-danger"
                  title="删除"
                  @click="removeMajor(m)"
                >
                  <Icon name="close" :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 学校编辑弹窗 -->
    <div
      v-if="groupDialog.visible"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50"
      @mousedown.self="groupDialog.visible = false"
    >
      <div class="bg-white rounded-xl p-6 w-[90%] max-w-[420px]">
        <div class="text-[1.1rem] font-semibold text-slate-900 mb-4">
          {{ groupDialog.id ? '编辑学校' : '新增学校' }}
        </div>
        <div class="mb-[0.9rem]">
          <label class="block text-[0.85rem] text-slate-600 mb-1.5">学校名称</label>
          <input v-model="groupDialog.name" class="input" placeholder="如：北京大学" />
        </div>
        <div class="mb-[0.9rem]">
          <label class="block text-[0.85rem] text-slate-600 mb-1.5">招收目标人数</label>
          <input
            v-model.number="groupDialog.targetCount"
            type="number"
            min="0"
            class="input"
          />
        </div>
        <div class="mb-[0.9rem]">
          <label class="block text-[0.85rem] text-slate-600 mb-1.5">备注</label>
          <input v-model="groupDialog.remark" class="input" placeholder="选填" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <button class="btn btn-outline" @click="groupDialog.visible = false">
            取消
          </button>
          <button class="btn btn-primary" @click="saveGroup">保存</button>
        </div>
      </div>
    </div>

    <!-- 专业编辑弹窗 -->
    <div
      v-if="majorDialog.visible"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50"
      @mousedown.self="majorDialog.visible = false"
    >
      <div class="bg-white rounded-xl p-6 w-[90%] max-w-[420px]">
        <div class="text-[1.1rem] font-semibold text-slate-900 mb-4">
          {{ majorDialog.id ? '编辑专业' : '新增专业' }}
        </div>
        <div class="mb-[0.9rem]">
          <label class="block text-[0.85rem] text-slate-600 mb-1.5">专业名称</label>
          <input v-model="majorDialog.name" class="input" placeholder="如：计算机" />
        </div>
        <div class="mb-[0.9rem]">
          <label class="block text-[0.85rem] text-slate-600 mb-1.5">招收人数</label>
          <input
            v-model.number="majorDialog.quota"
            type="number"
            min="0"
            class="input"
          />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <button class="btn btn-outline" @click="majorDialog.visible = false">
            取消
          </button>
          <button class="btn btn-primary" @click="saveMajor">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import type { Group, Major, ScoreRule } from '@/types'
import Icon from '@/components/Icon.vue'

const config = useConfigStore()

// ===== 分数规则 =====
const ruleForm = reactive<Pick<ScoreRule, 'minTotalScore'>>({
  minTotalScore: config.rule?.minTotalScore ?? 180,
})

// 同步外部更新
const rulePriorityLabel = computed(() => {
  const p = config.rule?.sortPriority ?? []
  const labels: Record<string, string> = {
    totalScore: '总分',
    chinese: '语文',
    math: '数学',
    english: '英语',
  }
  return p.map((f) => labels[f] ?? f).join(' → ')
})

async function saveRule() {
  await config.updateRule({ minTotalScore: ruleForm.minTotalScore })
}

// ===== 学校弹窗 =====
const groupDialog = reactive({
  visible: false,
  id: undefined as number | undefined,
  name: '',
  targetCount: 0,
  remark: '',
})

function openGroupDialog(group?: Group) {
  groupDialog.visible = true
  if (group) {
    groupDialog.id = group.id
    groupDialog.name = group.name
    groupDialog.targetCount = group.targetCount
    groupDialog.remark = group.remark ?? ''
  } else {
    groupDialog.id = undefined
    groupDialog.name = ''
    groupDialog.targetCount = 0
    groupDialog.remark = ''
  }
}

async function saveGroup() {
  if (!groupDialog.name.trim()) {
    alert('请输入学校名称')
    return
  }
  if (groupDialog.id) {
    await config.updateGroup(groupDialog.id, {
      name: groupDialog.name.trim(),
      targetCount: groupDialog.targetCount,
      remark: groupDialog.remark,
    })
  } else {
    await config.addGroup({
      name: groupDialog.name.trim(),
      targetCount: groupDialog.targetCount,
      remark: groupDialog.remark,
    })
  }
  groupDialog.visible = false
}

async function removeGroup(g: Group) {
  if (!confirm(`确定删除学校「${g.name}」及其所有专业吗？`)) return
  await config.removeGroup(g.id!)
}

// ===== 专业弹窗 =====
const majorDialog = reactive({
  visible: false,
  id: undefined as number | undefined,
  groupId: undefined as number | undefined,
  name: '',
  quota: 0,
})

function openMajorDialog(group: Group, major?: Major) {
  majorDialog.visible = true
  majorDialog.groupId = group.id
  if (major) {
    majorDialog.id = major.id
    majorDialog.name = major.name
    majorDialog.quota = major.quota
  } else {
    majorDialog.id = undefined
    majorDialog.name = ''
    majorDialog.quota = 0
  }
}

async function saveMajor() {
  if (!majorDialog.name.trim()) {
    alert('请输入专业名称')
    return
  }
  if (majorDialog.id) {
    await config.updateMajor(majorDialog.id, {
      name: majorDialog.name.trim(),
      quota: majorDialog.quota,
    })
  } else {
    await config.addMajor({
      groupId: majorDialog.groupId!,
      name: majorDialog.name.trim(),
      quota: majorDialog.quota,
    })
  }
  majorDialog.visible = false
}

async function removeMajor(m: Major) {
  if (!confirm(`确定删除专业「${m.name}」吗？`)) return
  await config.removeMajor(m.id!)
}

// 初次进入加载
const inited = ref(false)
if (!inited.value) {
  inited.value = true
  config.load().then(() => {
    ruleForm.minTotalScore = config.rule?.minTotalScore ?? 180
  })
}
</script>
