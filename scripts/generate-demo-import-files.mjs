import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import ExcelJS from 'exceljs';

const root = process.cwd();
const outDir = join(root, 'demo-import-files');

const files = [
  {
    name: 'demo-production-plan.xlsx',
    sheet: '生产计划',
    headers: ['计划日期', '周计划编号', '销售', '客户', '产品编号', '产品名称', '产品版本', '工序段', '计划数量', '完成数量', '生产状态', '负责人', '备注'],
    rows: [
      ['2026-06-15', 'W26-C-001', '演示销售A', '演示新能源', 'HL-DEMO-2001', '演示电池采样线束', 'Rev.A', '通用', 800, 0, '待生产', '前段一组 / 后段一组', '演示数据 / 非真实客户资料'],
      ['2026-06-15', 'W26-C-002', '演示销售B', '演示智造', 'HL-DEMO-2101', '演示控制器信号线束', 'Rev.B', '前段', 520, 120, '生产中', '前段二组', '演示数据 / 非真实客户资料'],
      ['2026-06-16', 'W26-C-003', '演示销售C', '演示储能', 'HL-DEMO-2201', '演示储能通讯线束', 'Rev.A', '后段', 360, 0, '待生产', '后段三组', '演示数据 / 非真实客户资料'],
    ],
  },
  {
    name: 'demo-customer-product.xlsx',
    sheet: '客户产品',
    headers: ['销售', '客户', '产品编号', '产品名称', '产品版本', '产品类别', '备注'],
    rows: [
      ['演示销售A', '演示新能源', 'HL-DEMO-2001', '演示电池采样线束', 'Rev.A', '高压采样', '演示数据 / 非真实客户资料'],
      ['演示销售B', '演示智造', 'HL-DEMO-2101', '演示控制器信号线束', 'Rev.B', '低压信号', '演示数据 / 非真实客户资料'],
    ],
  },
  {
    name: 'demo-front-parameter.xlsx',
    sheet: '前段参数',
    headers: ['客户', '产品编号', '产品版本', '裁线长度', '剥皮长度', '端子型号', '拉力标准', '压接高度', '图纸版本', '参数状态', '备注'],
    rows: [
      ['演示新能源', 'HL-DEMO-2001', 'Rev.A', '820 mm / 1260 mm', '5.0 mm', 'DEMO-TER-01', '>= 80 N', '1.42 +/- 0.03 mm', 'DRW-DEMO-A', '当前有效', '演示数据 / 非真实客户资料'],
      ['演示智造', 'HL-DEMO-2101', 'Rev.B', '460 mm', '4.5 mm', 'DEMO-TER-02', '>= 55 N', '1.18 +/- 0.03 mm', 'DRW-DEMO-B', '待确认', '演示数据 / 非真实客户资料'],
    ],
  },
  {
    name: 'demo-back-package.xlsx',
    sheet: '后段资料包',
    headers: ['客户', '产品编号', '产品版本', '连接器型号', '连接器装配说明书', '插接孔位图', '作业流程SOP', '成品细节图数量', '图纸版本', 'SOP版本', '资料状态', '备注'],
    rows: [
      ['演示新能源', 'HL-DEMO-2001', 'Rev.A', 'DEMO-32P', 'DEMO-32P 连接器装配说明书', 'DEMO-32P 插接孔位图', '后段插接与导通测试 SOP', 6, 'DRW-DEMO-A', 'SOP-DEMO-A', '当前有效', '演示数据 / 非真实客户资料'],
      ['演示储能', 'HL-DEMO-2201', 'Rev.A', 'DEMO-16P', 'DEMO-16P 连接器说明书', 'DEMO-16P 孔位图', '储能通讯线束 SOP', 4, 'DRW-DEMO-C', 'SOP-DEMO-C', '待确认', '演示数据 / 非真实客户资料'],
    ],
  },
  {
    name: 'demo-production-plan-invalid.xlsx',
    sheet: '错误计划',
    headers: ['计划日期', '周计划编号', '销售', '客户', '产品编号', '产品名称', '产品版本', '工序段', '计划数量', '完成数量', '生产状态', '负责人', '备注'],
    rows: [
      ['', 'W26-ERR-001', '演示销售', '', 'HL-ERR-001', '错误演示计划', '', '总装', '八百', 'A', '暂停', '', '演示错误行 / 非真实客户资料'],
    ],
  },
];

async function writeWorkbook(file) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '线束车间生产计划资料管控系统 V2.0';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(file.sheet);
  sheet.addRow(file.headers);
  for (const row of file.rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true, color: { argb: 'FF7C2D12' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
  sheet.columns = file.headers.map((header) => ({ header, key: header, width: Math.max(16, header.length * 2 + 6) }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  await workbook.xlsx.writeFile(join(outDir, file.name));
}

await mkdir(outDir, { recursive: true });
for (const file of files) await writeWorkbook(file);

console.log(`Demo import files generated in ${outDir}`);
for (const file of files) console.log(`- ${file.name}`);
