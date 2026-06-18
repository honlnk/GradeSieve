import * as XLSX from 'xlsx'
import type { Admitted, Applicant, School } from '@/types'

/**
 * 三表导入/导出工具。
 *
 * 目标文件为单个工作簿，含三张 sheet（名称宽松匹配）：
 *   - 表1：普职班同报志愿名单（第 0 行大标题，第 1 行表头，第 2 行起数据）
 *   - 表2：普高拟录取名单（结构同表1）
 *   - 表3：招生计划（第 0 行表头：学校名称 / 计划数）
 */

export interface ParseResult {
  applicants: Applicant[]
  admitted: Admitted[]
  schools: School[]
  /** 解析过程中的告警/错误 */
  errors: string[]
}

/** 从 `<3714000002>德州云天…` 中提取学校代码 */
export function extractSchoolCode(raw?: string): string | undefined {
  if (!raw) return undefined
  const m = String(raw).match(/<(\d+)>/)
  return m ? m[1] : undefined
}

/** 解析数值，容错：空/非数字 → 0 */
function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/** 匹配 sheet 名：包含关键词即认为是该表 */
function matchSheet(
  names: string[],
  keywords: string[],
): string | undefined {
  for (const name of names) {
    const lower = name.toLowerCase()
    if (keywords.every((k) => name.includes(k) || lower.includes(k))) return name
  }
  // 单关键词放宽匹配
  for (const name of names) {
    if (keywords.some((k) => name.includes(k))) return name
  }
  return undefined
}

/**
 * 解析表1/表2（共用列结构）。
 * @param rows sheet_to_json(header:1) 的二维数组
 * @param headerRowIdx 表头所在行索引
 * @param dataStartIdx 数据起始行索引
 */
function parseApplicantRows(
  rows: unknown[][],
  headerRowIdx: number,
  dataStartIdx: number,
): Applicant[] {
  if (headerRowIdx >= rows.length) return []

  // 建立列名 → 列索引
  const header = rows[headerRowIdx].map((h) => toStr(h))
  const col = (name: string): number => header.findIndex((h) => h === name)

  const idx = {
    sno: col('序号'),
    district: col('区县'),
    middleSchool: col('就读学校'),
    examNo: col('报名号'),
    name: col('姓名'),
    gender: col('性别'),
    idCard: col('身份证号'),
    ethnicity: col('民族'),
    rollNo: col('学籍号'),
    highSchool1: col('普高1'),
    highSchool2: col('普高2'),
    vocational: col('职教高考班'),
    threePlusFour: col('3+4志愿学校'),
    chinese: col('语文'),
    math: col('数学'),
    english: col('英语'),
    physics: col('物理'),
    chemistry: col('化学'),
  }

  const out: Applicant[] = []
  for (let i = dataStartIdx; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.every((c) => c === null || c === undefined || c === '')) continue

    const idCard = toStr(r[idx.idCard])
    if (!idCard && !toStr(r[idx.name])) continue // 空行跳过

    const chinese = toNum(r[idx.chinese])
    const math = toNum(r[idx.math])
    const english = toNum(r[idx.english])
    const vocational = toStr(r[idx.vocational])

    out.push({
      sno: toNum(r[idx.sno]) || i - dataStartIdx + 1,
      district: toStr(r[idx.district]),
      middleSchool: toStr(r[idx.middleSchool]),
      examNo: toStr(r[idx.examNo]),
      name: toStr(r[idx.name]),
      gender: toStr(r[idx.gender]),
      idCard,
      ethnicity: toStr(r[idx.ethnicity]),
      rollNo: toStr(r[idx.rollNo]),
      highSchool1: toStr(r[idx.highSchool1]) || undefined,
      highSchool2: toStr(r[idx.highSchool2]) || undefined,
      vocationalSchool: vocational || undefined,
      threePlusFour: toStr(r[idx.threePlusFour]) || undefined,
      chinese,
      math,
      english,
      physics: toNum(r[idx.physics]),
      chemistry: toNum(r[idx.chemistry]),
      vocationalCode: extractSchoolCode(vocational) || undefined,
      threeScoreTotal: chinese + math + english,
    })
  }
  return out
}

/** 解析表3 招生计划：校名 `_代码_名称` → 拆分 code/name */
function parsePlanRows(rows: unknown[][]): School[] {
  const schools: School[] = []
  // 第 0 行表头，第 1 行起数据
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue
    const rawName = toStr(r[0])
    const quota = toNum(r[1])
    if (!rawName) continue

    // 格式 _3714000001_德州信息工程中等专业学校
    const m = rawName.match(/^_(\d+)_(.+)$/)
    if (m) {
      schools.push({ code: m[1], name: m[2].trim(), quota })
    } else {
      // 兜底：无代码格式，用整串当 name、空 code（后续无法与志愿匹配）
      schools.push({ code: rawName, name: rawName, quota })
    }
  }
  return schools
}

/**
 * 从 ArrayBuffer 解析整个工作簿，返回三表标准化数据。
 */
export function parseWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' })
  const errors: string[] = []
  const names = wb.SheetNames

  // 定位三张 sheet
  const t1Name = matchSheet(names, ['表1']) ?? matchSheet(names, ['同报'])
  const t2Name = matchSheet(names, ['表2']) ?? matchSheet(names, ['普高'])
  const t3Name = matchSheet(names, ['表3']) ?? matchSheet(names, ['计划'])

  if (!t1Name) errors.push('未找到"表1（同报志愿名单）"工作表')
  if (!t2Name) errors.push('未找到"表2（普高拟录取名单）"工作表')
  if (!t3Name) errors.push('未找到"表3（招生计划）"工作表')

  let applicants: Applicant[] = []
  let admitted: Admitted[] = []
  let schools: School[] = []

  if (t1Name) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(
      wb.Sheets[t1Name],
      { header: 1, raw: true, defval: null },
    )
    // 第 0 行是大标题，第 1 行表头，第 2 行起数据
    applicants = parseApplicantRows(rows, 1, 2)
    if (!applicants.length) errors.push('表1 未解析到考生数据')
  }

  if (t2Name) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(
      wb.Sheets[t2Name],
      { header: 1, raw: true, defval: null },
    )
    const list = parseApplicantRows(rows, 1, 2)
    admitted = list.map((a) => ({ idCard: a.idCard, name: a.name }))
  }

  if (t3Name) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(
      wb.Sheets[t3Name],
      { header: 1, raw: true, defval: null },
    )
    schools = parsePlanRows(rows)
    if (!schools.length) errors.push('表3 未解析到招生计划')
  }

  return { applicants, admitted, schools, errors }
}

// ===== 导出 =====

/** 导出表列顺序 */
const EXPORT_COLUMNS: {
  key: keyof Applicant | 'threeScoreTotal' | 'rank'
  label: string
}[] = [
  { key: 'rank', label: '校内名次' },
  { key: 'sno', label: '序号' },
  { key: 'district', label: '区县' },
  { key: 'middleSchool', label: '就读学校' },
  { key: 'examNo', label: '报名号' },
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别' },
  { key: 'idCard', label: '身份证号' },
  { key: 'ethnicity', label: '民族' },
  { key: 'chinese', label: '语文' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'physics', label: '物理' },
  { key: 'chemistry', label: '化学' },
  { key: 'threeScoreTotal', label: '语数外总分' },
]

export interface SchoolExport {
  name: string
  rows: { applicant: Applicant; rank: number; admitted: boolean }[]
}

/**
 * 将多所学校各自导出为一个 .xlsx，每校一个 sheet。
 *
 * @param includeCandidates false（默认）= 仅导出录取者；
 *                          true = 录取 + 候补，并追加一列"录取/候补"标记。
 */
export function exportSchoolsAsWorkbook(
  schools: SchoolExport[],
  opts: { includeCandidates?: boolean; fileName?: string } = {},
) {
  const { includeCandidates = false, fileName = '录取结果.xlsx' } = opts
  const wb = XLSX.utils.book_new()

  // 含候补时追加一列状态
  const columns = includeCandidates
    ? [...EXPORT_COLUMNS, { key: 'status', label: '状态' }]
    : EXPORT_COLUMNS

  for (const s of schools) {
    const aoa: unknown[][] = [columns.map((c) => c.label)]
    for (const row of s.rows) {
      aoa.push(
        columns.map((c) => {
          if (c.key === 'rank') return row.rank
          if (c.key === 'threeScoreTotal') return row.applicant.threeScoreTotal
          if (c.key === 'status') return row.admitted ? '录取' : '候补'
          return (row.applicant as unknown as Record<string, unknown>)[c.key]
        }),
      )
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(s.name))
  }
  XLSX.writeFile(wb, fileName)
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_')
  return cleaned.slice(0, 31) || 'Sheet1'
}
