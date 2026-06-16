import Dexie, { type Table } from 'dexie'
import type { Group, Major, ScoreRule, Student } from '@/types'

/**
 * 应用本地数据库（IndexedDB）
 * 存储考生原始数据 + 招生计划配置
 */
export class AppDB extends Dexie {
  students!: Table<Student, number>
  groups!: Table<Group, number>
  majors!: Table<Major, number>
  scoreRule!: Table<ScoreRule, number>

  constructor() {
    super('GradeSieveDB')
    this.version(1).stores({
      // 主键自增；常用筛选字段建索引
      students: '++id, examNo, idCard, totalScore',
      groups: '++id, name, createdAt',
      majors: '++id, groupId, name',
      // 全局单条配置
      scoreRule: '++id',
    })
  }
}

export const db = new AppDB()

/** 默认分数规则 */
export const DEFAULT_SCORE_RULE: Omit<ScoreRule, 'id'> = {
  minTotalScore: 180,
  sortPriority: ['totalScore', 'chinese', 'math', 'english'],
}

/**
 * 初始化默认分数规则（仅首次）
 */
export async function ensureDefaultRule() {
  const existing = await db.scoreRule.get(1)
  if (!existing) {
    await db.scoreRule.put({ ...DEFAULT_SCORE_RULE, id: 1 })
  }
}
