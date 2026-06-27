import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { UpdateOrderProductionStatusDto } from './dto/update-order-production-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('today')
  findToday() {
    return this.ordersService.findToday();
  }

  @Get('week')
  findWeek() {
    return this.ordersService.findWeek();
  }

  @Get()
  @ApiQuery({ name: 'scope', required: false, enum: ['all', 'today', 'week'] })
  findAll(@Query('scope') scope: 'all' | 'today' | 'week' = 'all') {
    return this.ordersService.findAll(scope);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/production-status')
  updateProductionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderProductionStatusDto,
  ) {
    return this.ordersService.updateProductionStatus(id, dto);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteOrderDto = {}) {
    return this.ordersService.complete(id, dto);
  }
}
