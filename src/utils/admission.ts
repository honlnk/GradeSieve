import type { Major, ScoreRule, Student } from '@/types'

/**
 * 过滤掉总分不达标的考生。
 * @param students 全部考生
 * @param minTotalScore 总分下限（含）
 */
export function filterByScore(
  students: Student[],
  minTotalScore: number,
): Student[] {
  return students.filter((s) => Number(s.totalScore) >= minTotalScore)
}

/**
 * 按多级优先级降序排序。
 * @param students 考生列表
 * @param sortPriority 排序字段优先级（按数组顺序）
 * @returns 新数组（不修改原数组）
 */
export function sortByPriority(
  students: Student[],
  sortPriority: string[],
): Student[] {
  const fields = sortPriority.length ? sortPriority : ['totalScore']
  return [...students].sort((a, b) => {
    for (const field of fields) {
      const av = Number((a as any)[field]) || 0
      const bv = Number((b as any)[field]) || 0
      if (av !== bv) return bv - av // 降序
    }
    return 0
  })
}

/**
 * 单个考生的录取结果
 */
export interface AdmissionResult {
  student: Student
  /** 该考生在所属分组内的名次（从 1 开始） */
  rank: number
  /** 录取到的专业（按方案 A：仅按学校总名额截取，专业为展示） */
  major?: Major
  /** 是否被录取（在目标人数内） */
  admitted: boolean
}

/**
 * 对单个分组进行录取分配（方案 A）。
 *
 * 规则：
 * 1. 先过滤总分下限；
 * 2. 按多级排序得出名次；
 * 3. 在分组目标人数内截取，超出的标记为未录取。
 *
 * 注：考生数据表无专业志愿字段，专业名额仅作统计展示，
 * 不参与实际分配。若后续需要按志愿匹配，再扩展此函数。
 */
export function admitGroup(
  students: Student[],
  rule: Pick<ScoreRule, 'minTotalScore' | 'sortPriority'>,
  targetCount: number,
  majors: Major[] = [],
): AdmissionResult[] {
  const passed = filterByScore(students, rule.minTotalScore)
  const sorted = sortByPriority(passed, rule.sortPriority)

  // 简单地把专业名额平铺成一个录取序列（仅用于展示分配到哪个专业）
  const majorSlots: Major[] = []
  for (const m of majors) {
    const count = Math.max(0, Number(m.quota) || 0)
    for (let i = 0; i < count; i++) majorSlots.push(m)
  }

  return sorted.map((student, idx) => {
    const rank = idx + 1
    const admitted = rank <= targetCount
    const major = admitted ? majorSlots[idx] : undefined
    return { student, rank, major, admitted }
  })
}
