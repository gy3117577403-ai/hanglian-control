import { ApiClient } from './ApiClient';
import { MockStore } from './MockData';
import { OrderOverview, ProductionOrder, ServiceResult, StatusCount } from './DomainModels';

function uniqueCustomerCount(rows: ProductionOrder[]): number {
  const ids = new Set<string>();
  rows.forEach((item: ProductionOrder) => ids.add(item.customerId || item.customer));
  return ids.size;
}

function groupByStatus(rows: ProductionOrder[]): StatusCount[] {
  const bucket = new Map<string, number>();
  rows.forEach((item: ProductionOrder) => {
    bucket.set(item.status, (bucket.get(item.status) ?? 0) + 1);
  });
  const result: StatusCount[] = [];
  bucket.forEach((count: number, label: string) => {
    result.push({ label, count });
  });
  return result;
}

function completionStatus(rows: ProductionOrder[]): StatusCount[] {
  const done = rows.filter((item: ProductionOrder) => item.completedQuantity >= item.plannedQuantity).length;
  const running = rows.filter((item: ProductionOrder) => item.completedQuantity > 0 && item.completedQuantity < item.plannedQuantity).length;
  const pending = rows.length - done - running;
  return [
    { label: '已完成', count: done },
    { label: '进行中', count: running },
    { label: '未开始', count: pending }
  ];
}

function todayString(): string {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fallbackTodayOrders(): ProductionOrder[] {
  const today = todayString();
  const direct = MockStore.orders.filter((item: ProductionOrder) => item.date === today);
  if (direct.length > 0) {
    return direct;
  }
  return MockStore.orders.slice(0, 2);
}

export class OrderService {
  static async overview(): Promise<ServiceResult<OrderOverview>> {
    try {
      const todayOrders = await ApiClient.get<ProductionOrder[]>('/orders/today');
      const weekOrders = await ApiClient.get<ProductionOrder[]>('/orders/week');
      const allOrders = await ApiClient.get<ProductionOrder[]>('/orders');
      return {
        data: {
          todayOrders,
          weekOrders,
          allOrders,
          orderCount: allOrders.length,
          customerCount: uniqueCustomerCount(allOrders),
          productionStatus: groupByStatus(allOrders),
          completionStatus: completionStatus(allOrders)
        },
        source: 'api',
        message: '已连接 GET /orders/today、/orders/week、/orders'
      };
    } catch (error) {
      const todayOrders = fallbackTodayOrders();
      const weekOrders = MockStore.orders;
      const allOrders = MockStore.orders;
      return {
        data: {
          todayOrders,
          weekOrders,
          allOrders,
          orderCount: allOrders.length,
          customerCount: uniqueCustomerCount(allOrders),
          productionStatus: groupByStatus(allOrders),
          completionStatus: completionStatus(allOrders)
        },
        source: 'mock',
        message: '订单接口不可用或未登录，使用本地 mock fallback'
      };
    }
  }
}
