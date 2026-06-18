import type {
  AdmitResult,
  AdmissionStats,
  Applicant,
  Rule,
  School,
} from '@/types'

/**
 * 按多级优先级降序排序（不修改原数组）。
 * @param list 待排序列表
 * @param sortPriority 排序字段优先级（按数组顺序），空则回退到 threeScoreTotal
 */
export function sortByPriority<T>(list: T[], sortPriority: string[]): T[] {
  const fields = sortPriority.length ? sortPriority : ['threeScoreTotal']
  return [...list].sort((a, b) => {
    for (const field of fields) {
      const av = Number((a as Record<string, unknown>)[field]) || 0
      const bv = Number((b as Record<string, unknown>)[field]) || 0
      if (av !== bv) return bv - av // 降序
    }
    return 0
  })
}

/**
 * 三表录取主流程（纯函数）。
 *
 * 算法：
 * 1. 表1 − 表2：身份证号在普高录取集合中的考生直接剔除（eliminatedReason = 'high-school'）；
 * 2. 剩余考生过语数外门槛（< minThreeScore 剔除，reason = 'score'）；
 * 3. 按志愿学校代码（vocationalCode）分组；
 * 4. 每组内按 sortPriority 降序，前 quota 名录取，其余候补（reason = 'overflow'）。
 *
 * @param applicants 表1 全量报考考生
 * @param admittedIdCards 表2 普高已录取的身份证号集合
 * @param schools 表3 招生计划
 * @param rule 录取规则（门槛 + 排序优先级）
 */
export function runAdmission(
  applicants: Applicant[],
  admittedIdCards: Set<string>,
  schools: School[],
  rule: Pick<Rule, 'minThreeScore' | 'sortPriority'>,
): {
  results: AdmitResult[]
  bySchool: Map<string, AdmitResult[]>
  stats: AdmissionStats
} {
  const minScore = rule.minThreeScore
  const schoolByCode = new Map<string, School>()
  for (const s of schools) schoolByCode.set(s.code, s)

  // 分组：vocationalCode -> 达标考生（未在普高录取名单、且语数外达标）
  const grouped = new Map<string, Applicant[]>()
  const results: AdmitResult[] = []

  let removedByHighSchool = 0
  let removedByScore = 0

  for (const a of applicants) {
    const code = a.vocationalCode ?? ''
    const school = schoolByCode.get(code)
    const schoolName = school?.name ?? a.vocationalSchool ?? code

    // 1. 已被普高录取 → 剔除
    if (admittedIdCards.has(a.idCard)) {
      removedByHighSchool++
      results.push({
        applicant: a,
        schoolCode: code,
        schoolName,
        rank: 0,
        admitted: false,
        eliminatedReason: 'high-school',
      })
      continue
    }

    // 2. 语数外不达标 → 剔除
    if (Number(a.threeScoreTotal) < minScore) {
      removedByScore++
      results.push({
        applicant: a,
        schoolCode: code,
        schoolName,
        rank: 0,
        admitted: false,
        eliminatedReason: 'score',
      })
      continue
    }

    // 3. 入组（志愿学校无论是否在表3 中都入组，统计时体现）
    if (!grouped.has(code)) grouped.set(code, [])
    grouped.get(code)!.push(a)
  }

  // 4. 每组排序 + 按计划数截取
  const bySchool = new Map<string, AdmitResult[]>()
  let admittedTotal = 0
  let overflowTotal = 0

  for (const [code, list] of grouped) {
    const school = schoolByCode.get(code)
    const schoolName = school?.name ?? list[0]?.vocationalSchool ?? code
    const quota = school ? Math.max(0, Number(school.quota) || 0) : 0

    const sorted = sortByPriority(list, rule.sortPriority)
    const groupResults: AdmitResult[] = sorted.map((applicant, idx) => {
      const rank = idx + 1
      const admitted = rank <= quota
      if (admitted) admittedTotal++
      else overflowTotal++
      return {
        applicant,
        schoolCode: code,
        schoolName,
        rank,
        admitted,
        eliminatedReason: admitted ? undefined : 'overflow',
      }
    })
    bySchool.set(code, groupResults)
    results.push(...groupResults)
  }

  // 学校维度统计（以表3 学校为准，含计划为 0 或无候选的也在列）
  const schoolStats = schools.map((s) => {
    const list = bySchool.get(s.code) ?? []
    return {
      code: s.code,
      name: s.name,
      quota: s.quota,
      admitted: list.filter((r) => r.admitted).length,
      candidates: list.length,
    }
  })

  const stats: AdmissionStats = {
    total: applicants.length,
    removedByHighSchool,
    removedByScore,
    admitted: admittedTotal,
    overflow: overflowTotal,
    schools: schoolStats,
  }

  return { results, bySchool, stats }
}
