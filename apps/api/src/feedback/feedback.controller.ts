import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MockPermissionGuard } from '../auth/guards/mock-permission.guard';
import type { MockUser } from '../auth/mock-users';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('plan.feedback')
  create(@Body() dto: SubmitFeedbackDto, @CurrentUser() user: MockUser) {
    return this.feedbackService.create({
      ...dto,
      userId: user.userId,
      userName: user.name,
    });
  }

  @Get()
  @ApiQuery({ name: 'planId', required: false })
  findAll(@Query('planId') planId?: string) {
    return this.feedbackService.findByPlan(planId);
  }
}
