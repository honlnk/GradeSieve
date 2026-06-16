<template>
  <div class="page">
    <h1 class="title">招生配置</h1>
    <p class="desc">
      配置目标学校（分组）、专业名额与分数规则。数据保存在本地浏览器。
    </p>

    <!-- 分数规则 -->
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">分数规则</h2>
      </div>
      <div class="card-body">
        <div class="rule-row">
          <label class="rule-label">总分下限</label>
          <input
            v-model.number="ruleForm.minTotalScore"
            type="number"
            class="input input-sm"
            min="0"
            @change="saveRule"
          />
          <span class="rule-hint">低于此分数的考生将被过滤</span>
        </div>
        <div class="rule-row">
          <label class="rule-label">排序优先级</label>
          <span class="rule-priority">
            {{ rulePriorityLabel }}
          </span>
          <span class="rule-hint">（总分 → 语文 → 数学 → 英语，暂不支持调整）</span>
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
        <div v-if="!config.groups.length" class="empty">
          还没有目标学校，点击右上角新增。
        </div>
        <div v-for="g in config.groups" :key="g.id" class="group-block">
          <div class="group-head">
            <div class="group-title">
              <span class="group-name">{{ g.name }}</span>
              <span class="badge">目标 {{ g.targetCount }} 人</span>
            </div>
            <div class="group-actions">
              <button class="btn btn-outline btn-xs" @click="openGroupDialog(g)">
                编辑
              </button>
              <button class="btn btn-danger-outline btn-xs" @click="removeGroup(g)">
                删除
              </button>
            </div>
          </div>

          <!-- 专业列表 -->
          <div class="major-area">
            <div class="major-head">
              <span class="major-title">专业与名额</span>
              <button class="btn btn-outline btn-xs" @click="openMajorDialog(g)">
                + 添加专业
              </button>
            </div>
            <div v-if="!config.majorsOfGroup(g.id!).length" class="major-empty">
              暂无专业
            </div>
            <div class="major-grid">
              <div
                v-for="m in config.majorsOfGroup(g.id!)"
                :key="m.id"
                class="major-item"
              >
                <span class="major-name">{{ m.name }}</span>
                <span class="major-quota">{{ m.quota }} 人</span>
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
    <div v-if="groupDialog.visible" class="modal-mask" @click.self="groupDialog.visible = false">
      <div class="modal">
        <div class="modal-title">
          {{ groupDialog.id ? '编辑学校' : '新增学校' }}
        </div>
        <div class="form-row">
          <label class="form-label">学校名称</label>
          <input v-model="groupDialog.name" class="input" placeholder="如：北京大学" />
        </div>
        <div class="form-row">
          <label class="form-label">招收目标人数</label>
          <input
            v-model.number="groupDialog.targetCount"
            type="number"
            min="0"
            class="input"
          />
        </div>
        <div class="form-row">
          <label class="form-label">备注</label>
          <input v-model="groupDialog.remark" class="input" placeholder="选填" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="groupDialog.visible = false">
            取消
          </button>
          <button class="btn btn-primary" @click="saveGroup">保存</button>
        </div>
      </div>
    </div>

    <!-- 专业编辑弹窗 -->
    <div v-if="majorDialog.visible" class="modal-mask" @click.self="majorDialog.visible = false">
      <div class="modal">
        <div class="modal-title">
          {{ majorDialog.id ? '编辑专业' : '新增专业' }}
        </div>
        <div class="form-row">
          <label class="form-label">专业名称</label>
          <input v-model="majorDialog.name" class="input" placeholder="如：计算机" />
        </div>
        <div class="form-row">
          <label class="form-label">招收人数</label>
          <input
            v-model.number="majorDialog.quota"
            type="number"
            min="0"
            class="input"
          />
        </div>
        <div class="modal-actions">
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

<style scoped lang="scss">
.page {
  max-width: 960px;
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

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 1.25rem;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.card-body {
  padding: 1.25rem;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
}

.rule-label {
  width: 100px;
  font-size: 0.9rem;
  color: #475569;
}

.rule-priority {
  font-weight: 600;
  color: var(--color-primary);
}

.rule-hint {
  font-size: 0.8rem;
  color: #94a3b8;
}

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 0;
  font-size: 0.9rem;
}

.group-block {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem 1.1rem;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.group-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 1rem;
}

.badge {
  background: #eff6ff;
  color: var(--color-primary);
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.group-actions {
  display: flex;
  gap: 0.4rem;
}

.major-area {
  margin-top: 0.85rem;
}

.major-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.major-title {
  font-size: 0.85rem;
  color: #64748b;
}

.major-empty {
  font-size: 0.85rem;
  color: #94a3b8;
  padding: 0.5rem 0;
}

.major-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.major-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  font-size: 0.85rem;
}

.major-name {
  color: #1e293b;
}

.major-quota {
  color: #64748b;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  padding: 0.15rem;

  &:hover {
    color: var(--color-primary);
  }

  &-danger:hover {
    color: #dc2626;
  }
}

// ===== 弹窗 =====
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 420px;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 1rem;
}

.form-row {
  margin-bottom: 0.9rem;
}

.form-label {
  display: block;
  font-size: 0.85rem;
  color: #475569;
  margin-bottom: 0.3rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

// ===== 通用表单 =====
.input {
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  &-sm {
    width: 90px;
  }
}

// ===== 按钮 =====
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
  transition: all 0.15s;

  &-sm {
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
  }

  &-xs {
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
  }

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
