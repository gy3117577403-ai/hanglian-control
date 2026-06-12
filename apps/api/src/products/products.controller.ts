import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':productCode')
  findByCode(@Param('productCode') productCode: string) {
    return this.productsService.findByCode(productCode);
  }
}
