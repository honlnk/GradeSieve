/**
 * 考生记录（与导入 Excel 的列结构对应）
 */
export interface Student {
  id?: number
  /** 导入表中的原始排名 */
  rank: number
  name: string
  gender: string
  age: number
  /** 总分：参与下限过滤与排序 */
  totalScore: number
  /** 语文 */
  chinese: number
  /** 数学 */
  math: number
  /** 英语 */
  english: number
  /** 身份证号 */
  idCard: string
  /** 考号 */
  examNo: string
}

/**
 * 专业（隶属于某个分组/学校）
 */
export interface Major {
  id?: number
  /** 所属分组 id */
  groupId: number
  name: string
  /** 招收人数 */
  quota: number
}

/**
 * 分组（= 一所目标学校的招生计划）
 */
export interface Group {
  id?: number
  /** 目标学校名称 */
  name: string
  /** 招收目标人数 */
  targetCount: number
  /** 备注 */
  remark?: string
  /** 创建时间 */
  createdAt: number
}

/**
 * 分数规则配置（单条，全局唯一，id 固定为 1）
 */
export interface ScoreRule {
  id?: number
  /** 总分下限 */
  minTotalScore: number
  /**
   * 排序科目优先级，按数组顺序从前到后。
   * 取值为 Student 中的数值字段名。
   */
  sortPriority: string[]
}
