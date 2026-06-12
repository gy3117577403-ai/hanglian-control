import { seedV04 } from '../mock/seed-v0.4';

const stats = {
  customers: seedV04.customers.length,
  products: seedV04.products.length,
  productionPlans: seedV04.productionPlans.length,
  productDocuments: seedV04.productDocuments.length,
  frontProcessParameters: seedV04.frontProcessParameters.length,
  backProcessPackages: seedV04.backProcessPackages.length,
  feedbackRecords: seedV04.feedbackRecords.length,
};

console.log('V0.4 Mock seed preview only. No database connection will be opened.');
console.table([
  { name: '客户数量', count: stats.customers },
  { name: '产品数量', count: stats.products },
  { name: '生产计划数量', count: stats.productionPlans },
  { name: '文件资料数量', count: stats.productDocuments },
  { name: '前段参数数量', count: stats.frontProcessParameters },
  { name: '后段资料包数量', count: stats.backProcessPackages },
  { name: '异常记录数量', count: stats.feedbackRecords },
]);
