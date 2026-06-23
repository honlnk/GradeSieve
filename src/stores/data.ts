import { defineStore } from 'pinia'
import { computed, ref, toRaw } from 'vue'
import { db, ensureDefaultRule } from '@/db'
import { runAdmission } from '@/utils/admission'
import type { Admitted, Applicant, Rule, School } from '@/types'

/**
 * 递归剥离 Vue 响应式代理，返回可被 IndexedDB 结构化克隆的纯值。
 *
 * Vue 的 reactive/ref 会把对象/数组包装成 Proxy，而结构化克隆算法
 * 无法克隆 Proxy，直接写入 Dexie 会抛 DataCloneError
 * （"could not be cloned"）。写库前必须先还原成普通对象。
 */
function toPlain<T>(value: T): T {
  const raw = toRaw(value) as unknown
  if (Array.isArray(raw)) {
    return raw.map(toPlain) as unknown as T
  }
  if (raw && typeof raw === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(raw)) {
      out[key] = toPlain((raw as Record<string, unknown>)[key])
    }
    return out as unknown as T
  }
  return raw as T
}

export const useDataStore = defineStore('data', () => {
  const applicants = ref<Applicant[]>([])
  const admitted = ref<Admitted[]>([])
  const schools = ref<School[]>([])
  const rule = ref<Rule | null>(null)
  const loaded = ref(false)

  async function load() {
    await ensureDefaultRule()
    applicants.value = await db.applicants.toArray()
    admitted.value = await db.admitted.toArray()
    schools.value = await db.schools.toArray()
    rule.value = (await db.rule.get(1)) ?? null
    loaded.value = true
  }

  /** 一次性写入三表数据（覆盖式） */
  async function replaceAll(data: {
    applicants: Applicant[]
    admitted: Admitted[]
    schools: School[]
  }) {
    await db.transaction(
      'rw',
      db.applicants,
      db.admitted,
      db.schools,
      async () => {
        await db.applicants.clear()
        await db.admitted.clear()
        await db.schools.clear()
        if (data.applicants.length) await db.applicants.bulkAdd(data.applicants)
        if (data.admitted.length) await db.admitted.bulkAdd(data.admitted)
        if (data.schools.length) await db.schools.bulkAdd(data.schools)
      },
    )
    await load()
  }

  async function updateRule(data: Partial<Rule>) {
    // 入参可能来自响应式对象（如 Vue 的 reactive 数组），写库前剥离代理
    await db.rule.update(1, toPlain(data))
    await load()
  }

  async function clearAll() {
    await db.transaction(
      'rw',
      db.applicants,
      db.admitted,
      db.schools,
      async () => {
        await db.applicants.clear()
        await db.admitted.clear()
        await db.schools.clear()
      },
    )
    applicants.value = []
    admitted.value = []
    schools.value = []
    loaded.value = false
  }

  // ===== 录取结果（派生）=====

  /** 表2 身份证号集合 */
  const admittedIdCards = computed(
    () => new Set(admitted.value.map((a) => a.idCard)),
  )

  const admission = computed(() => {
    if (!rule.value) {
      return {
        results: [] as ReturnType<typeof runAdmission>['results'],
        bySchool: new Map<string, ReturnType<typeof runAdmission>['results']>(),
        stats: {
          total: 0,
          removedByHighSchool: 0,
          removedByScore: 0,
          admitted: 0,
          overflow: 0,
          schools: [],
        },
      }
    }
    return runAdmission(
      applicants.value,
      admittedIdCards.value,
      schools.value,
      rule.value,
    )
  })

  const results = computed(() => admission.value.results)
  const stats = computed(() => admission.value.stats)
  const bySchool = computed(() => admission.value.bySchool)

  const hasData = computed(
    () => applicants.value.length > 0 || schools.value.length > 0,
  )

  return {
    applicants,
    admitted,
    schools,
    rule,
    loaded,
    hasData,
    results,
    stats,
    bySchool,
    admittedIdCards,
    load,
    replaceAll,
    updateRule,
    clearAll,
  }
})
