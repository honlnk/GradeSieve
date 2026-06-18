import Dexie, { type Table } from 'dexie'
import type { Admitted, Applicant, Rule, School } from '@/types'

/**
 * 应用本地数据库（IndexedDB）。
 *
 * v1（已废弃）：students / groups / majors / scoreRule —— 基于假设的"总分排序"业务。
 * v2（当前）  ：applicants / admitted / schools / rule  —— 基于真实三表录取业务。
 *
 * 升级到 v2 时清空全部 v1 表（schema 不兼容，MVP 阶段数据可弃，用户需重新导入）。
 */
export class AppDB extends Dexie {
  applicants!: Table<Applicant, number>
  admitted!: Table<Admitted, number>
  schools!: Table<School, number>
  rule!: Table<Rule, number>

  constructor() {
    super('GradeSieveDB')

    this.version(1).stores({
      students: '++id, examNo, idCard, totalScore',
      groups: '++id, name, createdAt',
      majors: '++id, groupId, name',
      scoreRule: '++id',
    })

    this.version(2).stores({
      // 删除旧表（Dexie：置 null 表示删除该 object store）
      students: null,
      groups: null,
      majors: null,
      scoreRule: null,
      // 新表
      applicants: '++id, idCard, vocationalCode, examNo',
      admitted: '++id, idCard',
      schools: '++id, code, name',
      // 全局单条规则
      rule: '++id',
    })
  }
}

export const db = new AppDB()

/** 默认录取规则 */
export const DEFAULT_RULE: Omit<Rule, 'id'> = {
  minThreeScore: 205,
  sortPriority: ['threeScoreTotal', 'chinese', 'math', 'english'],
}

/**
 * 初始化默认规则（仅首次）。
 */
export async function ensureDefaultRule() {
  const existing = await db.rule.get(1)
  if (!existing) {
    await db.rule.put({ ...DEFAULT_RULE, id: 1 })
  }
}
