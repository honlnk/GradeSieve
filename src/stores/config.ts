import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db, ensureDefaultRule } from '@/db'
import type { Group, Major, ScoreRule } from '@/types'

export const useConfigStore = defineStore('config', () => {
  const groups = ref<Group[]>([])
  const majors = ref<Major[]>([])
  const rule = ref<ScoreRule | null>(null)

  async function load() {
    await ensureDefaultRule()
    groups.value = await db.groups.toArray()
    majors.value = await db.majors.toArray()
    rule.value = (await db.scoreRule.get(1)) ?? null
  }

  // ---- 分组（学校）----
  async function addGroup(data: Omit<Group, 'id' | 'createdAt'>) {
    const id = await db.groups.add({
      ...data,
      createdAt: Date.now(),
    })
    await load()
    return id
  }

  async function updateGroup(id: number, data: Partial<Group>) {
    await db.groups.update(id, data)
    await load()
  }

  async function removeGroup(id: number) {
    await db.transaction('rw', db.groups, db.majors, async () => {
      await db.groups.delete(id)
      await db.majors.where('groupId').equals(id).delete()
    })
    await load()
  }

  // ---- 专业 ----
  async function addMajor(data: Omit<Major, 'id'>) {
    const id = await db.majors.add(data)
    await load()
    return id
  }

  async function updateMajor(id: number, data: Partial<Major>) {
    await db.majors.update(id, data)
    await load()
  }

  async function removeMajor(id: number) {
    await db.majors.delete(id)
    await load()
  }

  // ---- 分数规则 ----
  async function updateRule(data: Partial<ScoreRule>) {
    await db.scoreRule.update(1, data)
    await load()
  }

  function majorsOfGroup(groupId: number) {
    return majors.value.filter((m) => m.groupId === groupId)
  }

  const totalQuota = computed(() =>
    majors.value.reduce((sum, m) => sum + (Number(m.quota) || 0), 0),
  )

  return {
    groups,
    majors,
    rule,
    load,
    addGroup,
    updateGroup,
    removeGroup,
    addMajor,
    updateMajor,
    removeMajor,
    updateRule,
    majorsOfGroup,
    totalQuota,
  }
})
