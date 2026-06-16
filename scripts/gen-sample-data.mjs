/**
 * 生成 GradeSieve 测试用 Excel。
 *
 * 用法：node scripts/gen-sample-data.mjs [行数] [输出文件名]
 *   默认：30 行 -> test-data.xlsx
 *
 * 产出的表头与 src/utils/excel.ts 的 HEADER_MAP 完全对齐：
 *   排名、姓名、性别、年龄、总分、语文、数学、英语、身份证号、考号
 *
 * 故意混入了几种边界数据，方便测试过滤 / 排序 / 必填警告等逻辑：
 *   - 大部分考生总分 >= 180（参与录取）
 *   - 少量考生总分 < 180（应被下限过滤）
 *   - 少量考生缺某科成绩（触发"必填缺失"警告）
 */
import XLSX from 'xlsx'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROWS = Number(process.argv[2]) || 30
const OUT = resolve(process.argv[3] || 'test-data.xlsx')

const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张'
const GIVEN = [
  '伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋',
  '勇', '艳', '杰', '娟', '涛', '明', '超', '秀', '霞', '平',
  '刚', '桂', '英', '华', '慧',
]

function pickName(i) {
  const s = SURNAMES[i % SURNAMES.length]
  const g = GIVEN[(i * 7) % GIVEN.length]
  return s + g
}

function idCard(i) {
  // 18 位，前 6 位地区码，中间出生日期，后 3 位顺序码，末位校验位（仅占位，不做真实校验）
  const base = `1101012007010${String(i + 1).padStart(2, '0')}`
  const tail = String(1000 + i).padStart(4, '0').slice(-4)
  return base + tail + 'X'
}

function examNo(i) {
  return '202600' + String(i + 1).padStart(3, '0')
}

// header 定义（与解析端一致）
const HEADERS = [
  '排名', '姓名', '性别', '年龄', '总分',
  '语文', '数学', '英语', '身份证号', '考号',
]

const rows = []
for (let i = 0; i < ROWS; i++) {
  const name = pickName(i)
  const gender = i % 2 === 0 ? '男' : '女'
  const age = 18 + (i % 3) // 18~20

  // 单科 60~99
  const chinese = 60 + Math.floor(Math.random() * 40)
  const math = 60 + Math.floor(Math.random() * 40)
  const english = 60 + Math.floor(Math.random() * 40)

  // 让 ~15% 的考生总分 < 180（被下限过滤），其余正常
  const lowFlag = Math.random() < 0.15
  let totalScore = chinese + math + english
  if (lowFlag) {
    // 强制压低：单科改成 20~59
    const low = () => 20 + Math.floor(Math.random() * 40)
    const c2 = low(), m2 = low(), e2 = low()
    rows.push({
      排名: i + 1, 姓名: name, 性别: gender, 年龄: age,
      总分: c2 + m2 + e2, 语文: c2, 数学: m2, 英语: e2,
      身份证号: idCard(i), 考号: examNo(i),
    })
    continue
  }

  const row = {
    排名: i + 1, 姓名: name, 性别: gender, 年龄: age,
    总分: totalScore, 语文: chinese, 数学: math, 英语: english,
    身份证号: idCard(i), 考号: examNo(i),
  }

  // 让 ~10% 的考生故意缺一科（触发"必填字段缺失"警告）
  if (Math.random() < 0.1) {
    const dropKey = ['语文', '数学', '英语'][i % 3]
    delete row[dropKey]
  }

  rows.push(row)
}

// 构造 worksheet
const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS })

// 关键：身份证号、考号按文本写入，避免长数字被科学计数法吞精度
// SheetJS 没有直接的 cell 类型逐个设置 API，这里通过 force string 重写
;['!cols'] // 占位，避免 lint
const range = XLSX.utils.decode_range(ws['!ref'])
const colIndexOf = (label) => HEADERS.indexOf(label)
for (const label of ['身份证号', '考号']) {
  const col = colIndexOf(label)
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: col })
    if (ws[addr]) {
      ws[addr].t = 's' // string
      ws[addr].v = String(ws[addr].v)
    }
  }
}

// 列宽
ws['!cols'] = [
  { wch: 6 }, { wch: 8 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
  { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 22 }, { wch: 12 },
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, '成绩表')

const outDir = dirname(OUT)
if (outDir && !existsSync(outDir)) mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT)

console.log(`✅ 生成完成`)
console.log(`   行数: ${rows.length}`)
console.log(`   文件: ${OUT}`)

// 统计
const lowCount = rows.filter(r => Number(r.总分) < 180).length
const missingSubject = rows.filter(r => r.语文 === undefined || r.数学 === undefined || r.英语 === undefined).length
console.log(`   其中 总分<180(应被过滤): ${lowCount} 人`)
console.log(`   其中 缺单科(触发警告): ${missingSubject} 人`)
