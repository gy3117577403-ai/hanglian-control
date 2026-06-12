import type { ImportTemplateDefinition, ImportType } from '../common/types/production.types';

export const importTypeLabels: Record<ImportType, string> = {
  production_plan: '生产计划',
  customer_product: '客户产品',
  front_parameter: '前段参数',
  back_package: '后段资料包',
};

export const importTemplates: ImportTemplateDefinition[] = [
  {
    type: 'production_plan',
    label: importTypeLabels.production_plan,
    description: '导入本周或今日生产计划，自动补齐客户和产品基础资料。',
    fields: [
      { field: '计划日期', required: true, description: '格式建议 YYYY-MM-DD', example: '2026-06-15' },
      { field: '周计划编号', required: false, description: '生产周计划编号', example: 'W26-C-001' },
      { field: '销售', required: false, description: '销售或客户经理', example: '演示销售' },
      { field: '客户', required: true, description: '客户简称或全称', example: '演示新能源' },
      { field: '产品编号', required: true, description: '线束产品编号', example: 'HL-DEMO-2001' },
      { field: '产品名称', required: true, description: '线束产品名称', example: '演示电池采样线束' },
      { field: '产品版本', required: false, description: '为空默认 Rev.A', example: 'Rev.A' },
      { field: '工序段', required: true, description: '前段 / 后段 / 通用', example: '通用' },
      { field: '计划数量', required: true, description: '必须是数字', example: 800 },
      { field: '完成数量', required: false, description: '必须是数字，空则 0', example: 0 },
      { field: '生产状态', required: false, description: '待生产 / 生产中 / 已完成 / 异常', example: '待生产' },
      { field: '负责人', required: false, description: '为空默认组长演示账号', example: '前段一组 / 后段二组' },
      { field: '备注', required: false, description: '导入备注', example: '演示数据 / 非真实客户资料' },
    ],
  },
  {
    type: 'customer_product',
    label: importTypeLabels.customer_product,
    description: '导入客户与产品基础资料，同客户 + 产品编号视为同一产品。',
    fields: [
      { field: '销售', required: false, description: '销售或客户经理', example: '演示销售' },
      { field: '客户', required: true, description: '客户简称或全称', example: '演示智造' },
      { field: '产品编号', required: true, description: '线束产品编号', example: 'HL-DEMO-2101' },
      { field: '产品名称', required: true, description: '产品名称', example: '演示控制器信号线束' },
      { field: '产品版本', required: false, description: '为空默认 Rev.A', example: 'Rev.A' },
      { field: '产品类别', required: false, description: '产品分类', example: '低压信号线束' },
      { field: '备注', required: false, description: '导入备注', example: '演示数据 / 非真实客户资料' },
    ],
  },
  {
    type: 'front_parameter',
    label: importTypeLabels.front_parameter,
    description: '导入前段裁线、剥皮、端子、拉力、压接等工艺参数。',
    fields: [
      { field: '客户', required: true, description: '客户简称或全称', example: '演示新能源' },
      { field: '产品编号', required: true, description: '线束产品编号', example: 'HL-DEMO-2001' },
      { field: '产品版本', required: false, description: '为空默认 Rev.A', example: 'Rev.A' },
      { field: '裁线长度', required: false, description: '建议填写', example: '820 mm' },
      { field: '剥皮长度', required: false, description: '建议填写', example: '5.0 mm' },
      { field: '端子型号', required: false, description: '建议填写', example: 'DEMO-TER-01' },
      { field: '拉力标准', required: false, description: '建议填写', example: '>= 80 N' },
      { field: '压接高度', required: false, description: '建议填写', example: '1.42 +/- 0.03 mm' },
      { field: '图纸版本', required: false, description: '为空默认 Rev.A', example: 'DRW-Rev.A' },
      { field: '参数状态', required: false, description: '当前有效 / 待确认 / 已失效 / 不一致', example: '待确认' },
      { field: '备注', required: false, description: '导入备注', example: '演示数据 / 非真实客户资料' },
    ],
  },
  {
    type: 'back_package',
    label: importTypeLabels.back_package,
    description: '导入连接器、装配说明书、孔位图、SOP、成品细节图等后段资料包信息。',
    fields: [
      { field: '客户', required: true, description: '客户简称或全称', example: '演示新能源' },
      { field: '产品编号', required: true, description: '线束产品编号', example: 'HL-DEMO-2001' },
      { field: '产品版本', required: false, description: '为空默认 Rev.A', example: 'Rev.A' },
      { field: '连接器型号', required: false, description: '建议填写', example: 'DEMO-32P' },
      { field: '连接器装配说明书', required: false, description: '说明书名称', example: 'DEMO-32P 装配说明书' },
      { field: '插接孔位图', required: false, description: '孔位图名称', example: 'DEMO-32P 孔位图' },
      { field: '作业流程SOP', required: false, description: 'SOP 名称', example: '后段插接测试 SOP' },
      { field: '成品细节图数量', required: false, description: '必须是数字，空则 0', example: 6 },
      { field: '图纸版本', required: false, description: '为空默认 Rev.A', example: 'DRW-Rev.A' },
      { field: 'SOP版本', required: false, description: '为空默认 Rev.A', example: 'SOP-Rev.A' },
      { field: '资料状态', required: false, description: '当前有效 / 待确认 / 已失效 / 不一致', example: '待确认' },
      { field: '备注', required: false, description: '导入备注', example: '演示数据 / 非真实客户资料' },
    ],
  },
];

export function getImportTemplate(type: ImportType) {
  return importTemplates.find((template) => template.type === type);
}
