import * as XLSX from 'xlsx'
import type { Student } from '@/types'

/**
 * 导入表表头 → Student 字段的映射。
 * 支持常见中文表头写法。
 */
const HEADER_MAP: Record<string, keyof Student> = {
  排名: 'rank',
  姓名: 'name',
  性别: 'gender',
  年龄: 'age',
  总分: 'totalScore',
  总成绩: 'totalScore',
  语文: 'chinese',
  数学: 'math',
  英语: 'english',
  身份证号: 'idCard',
  身份证: 'idCard',
  考号: 'examNo',
  准考证号: 'examNo',
}

/** 导入时表头必须包含的字段 */
const REQUIRED_FIELDS: (keyof Student)[] = [
  'name',
  'totalScore',
  'chinese',
  'math',
  'english',
]

export interface ParseResult {
  students: Student[]
  /** 被识别但缺失必填字段的行号（从 1 开始，表头为 0） */
  missingFields: string[]
}

/**
 * 从 ArrayBuffer 解析 Excel/CSV，返回标准化考生数据。
 */
export function parseStudentsFromBuffer(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  })

  const missingFields: string[] = []
  const students: Student[] = rows.map((row, idx) => {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const mapped = HEADER_MAP[key.trim()]
      if (mapped) normalized[mapped] = value
    }

    // 校验必填字段
    for (const field of REQUIRED_FIELDS) {
      const v = normalized[field]
      if (v === '' || v === null || v === undefined) {
        missingFields.push(`第 ${idx + 2} 行缺少 ${field}`)
      }
    }

    return {
      rank: Number(normalized.rank) || idx + 1,
      name: String(normalized.name ?? '').trim(),
      gender: String(normalized.gender ?? '').trim(),
      age: Number(normalized.age) || 0,
      totalScore: Number(normalized.totalScore) || 0,
      chinese: Number(normalized.chinese) || 0,
      math: Number(normalized.math) || 0,
      english: Number(normalized.english) || 0,
      idCard: String(normalized.idCard ?? '').trim(),
      examNo: String(normalized.examNo ?? '').trim(),
    }
  })

  return { students, missingFields }
}

/** 导出表列顺序（与导入表一致） */
const EXPORT_COLUMNS: { key: keyof Student; label: string }[] = [
  { key: 'rank', label: '排名' },
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别' },
  { key: 'age', label: '年龄' },
  { key: 'totalScore', label: '总分' },
  { key: 'chinese', label: '语文' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'idCard', label: '身份证号' },
  { key: 'examNo', label: '考号' },
]

/**
 * 将单个分组的考生导出为 worksheet。
 */
export function studentsToWorksheet(students: Student[]): XLSX.WorkSheet {
  const aoa: unknown[][] = [EXPORT_COLUMNS.map((c) => c.label)]
  for (const s of students) {
    aoa.push(EXPORT_COLUMNS.map((c) => (s as any)[c.key]))
  }
  return XLSX.utils.aoa_to_sheet(aoa)
}

/**
 * 将多个分组各自导出为一个 .xlsx 文件，每校一个 sheet。
 */
export function exportGroupsAsWorkbooks(
  groups: { name: string; students: Student[] }[],
  fileName = '分组录取结果.xlsx',
) {
  const wb = XLSX.utils.book_new()
  for (const group of groups) {
    const ws = studentsToWorksheet(group.students)
    // sheet 名最长 31 字符，避免重名
    const safeName = sanitizeSheetName(group.name)
    XLSX.utils.book_append_sheet(wb, ws, safeName)
  }
  XLSX.writeFile(wb, fileName)
}

function sanitizeSheetName(name: string): string {
  // Excel sheet 名禁止字符: : \ / ? * [ ]
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_')
  return cleaned.slice(0, 31) || 'Sheet1'
}
