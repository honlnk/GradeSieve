/**
 * 报考考生（表1 / 表2 共用同一套列结构）
 *
 * 对应 Excel 列：
 * 序号、区县、就读学校、报名号、姓名、性别、身份证号、民族、学籍号、
 * 普高1、普高2、职教高考班、3+4志愿学校、语文、数学、英语、物理、化学
 */
export interface Applicant {
  id?: number
  /** 序号 */
  sno: number
  /** 区县 */
  district: string
  /** 就读学校（初中） */
  middleSchool: string
  /** 报名号 */
  examNo: string
  name: string
  /** 性别 */
  gender: string
  /** 身份证号（唯一键，用于判定是否已被普高录取） */
  idCard: string
  /** 民族 */
  ethnicity: string
  /** 学籍号 */
  rollNo: string
  /** 普高志愿 1（原始字符串，可为空） */
  highSchool1?: string
  /** 普高志愿 2（原始字符串，可为空） */
  highSchool2?: string
  /**
   * 职教高考班志愿（原始字符串，形如 `<3714000002>德州云天职业中等专业学校`）。
   * 表1 中全部已填，是考生归属学校的依据。
   */
  vocationalSchool?: string
  /** 3+4 志愿学校（原始字符串，通常为空） */
  threePlusFour?: string
  chinese: number
  math: number
  english: number
  physics: number
  chemistry: number

  // ---- 以下为解析时派生的字段 ----
  /** 从 vocationalSchool 提取的学校代码（如 3714000002），用于匹配表3 计划 */
  vocationalCode?: string
  /** 语数外三科总分（chinese + math + english），门槛与排序均以此为准 */
  threeScoreTotal: number
}

/**
 * 普高已录取考生（表2）。
 * 只需身份证号用于交集判定；保留姓名便于核查导出。
 */
export interface Admitted {
  id?: number
  idCard: string
  name: string
}

/**
 * 招生学校 + 计划数（表3）。
 * 表3 的"学校名称"列格式为 `_3714000001_德州信息工程中等专业学校`，
 * 解析时拆分为 code / name。
 */
export interface School {
  id?: number
  /** 学校代码，如 3714000001 */
  code: string
  /** 学校名称 */
  name: string
  /** 招生计划数 */
  quota: number
}

/**
 * 录取规则（全局单条，id 固定为 1）。
 */
export interface Rule {
  id?: number
  /** 语数外三科总分下限（含），默认 205 */
  minThreeScore: number
  /**
   * 排序科目优先级（降序），按数组顺序从前到后。
   * 取值为 Applicant 中的数值字段名，默认
   * ['threeScoreTotal', 'chinese', 'math', 'english']。
   */
  sortPriority: string[]
}

/** 考生落榜原因 */
export type EliminatedReason = 'high-school' | 'score' | 'overflow'

/**
 * 单个考生的录取结果。
 */
export interface AdmitResult {
  applicant: Applicant
  /** 归属学校代码（来自志愿；若志愿学校不在表3 中，则为该志愿代码但仍参与统计） */
  schoolCode: string
  /** 归属学校名称 */
  schoolName: string
  /** 校内名次（从 1 开始；仅对通过门槛的考生有意义） */
  rank: number
  /** 是否被录取（在该校计划数内） */
  admitted: boolean
  /** 落榜原因（admitted=false 时有值） */
  eliminatedReason?: EliminatedReason
}

/** 录取汇总统计 */
export interface AdmissionStats {
  /** 表1 总报考人数 */
  total: number
  /** 被普高录取而剔除的人数 */
  removedByHighSchool: number
  /** 语数外不达标而剔除的人数 */
  removedByScore: number
  /** 最终录取人数（各校计划数内合计） */
  admitted: number
  /** 候补人数（达标但超出计划） */
  overflow: number
  /** 学校维度统计 */
  schools: SchoolStat[]
}

export interface SchoolStat {
  code: string
  name: string
  /** 计划数 */
  quota: number
  /** 实际录取人数 */
  admitted: number
  /** 达到门槛的候选人数 */
  candidates: number
}
