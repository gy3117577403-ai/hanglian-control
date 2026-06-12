import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Body() dto: SubmitFeedbackDto) {
    return this.feedbackService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'planId', required: false })
  findAll(@Query('planId') planId?: string) {
    return this.feedbackService.findByPlan(planId);
  }
}
