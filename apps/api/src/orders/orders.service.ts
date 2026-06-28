import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { ProductionPlanRepositoryInterface } from '../repositories/interfaces/production-plan.repository.interface';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { UpdateOrderProductionStatusDto } from './dto/update-order-production-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(REPOSITORY_TOKENS.productionPlan)
    private readonly productionPlanRepository: ProductionPlanRepositoryInterface,
  ) {}

  async findToday() {
    return this.productionPlanRepository.findPlans('today');
  }

  async findWeek() {
    return this.productionPlanRepository.findPlans('week');
  }

  async findAll(scope: 'all' | 'today' | 'week' = 'all') {
    return this.productionPlanRepository.findPlans(scope);
  }

  async findOne(id: string) {
    const order = await this.productionPlanRepository.findPlanById(id);
    if (!order) throw new NotFoundException(`未找到订单：${id}`);
    return order;
  }

  async updateProductionStatus(
    id: string,
    dto: UpdateOrderProductionStatusDto,
  ) {
    const status = dto.status ?? dto.productionStatus;
    if (!status) throw new BadRequestException('status 为必填项。');
    const order = await this.productionPlanRepository.updatePlanStatus(
      id,
      status,
    );
    if (!order) throw new NotFoundException(`未找到订单：${id}`);
    return order;
  }

  async complete(id: string, dto: CompleteOrderDto) {
    const order = await this.productionPlanRepository.completePlan(
      id,
      dto.completedQuantity,
    );
    if (!order) throw new NotFoundException(`未找到订单：${id}`);
    return order;
  }
}
