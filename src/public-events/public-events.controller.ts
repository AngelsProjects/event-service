import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventsService } from '../events/events.service';
import { QueryEventsDto } from '../events/dto/query-events.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Public Events')
@Controller('public/events')
@Public()
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public events with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'Public events retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { type: 'object' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  findAll(@Query() query: QueryEventsDto) {
    const publicQuery = new QueryEventsDto();
    publicQuery.dateFrom = query.dateFrom;
    publicQuery.dateTo = query.dateTo;
    publicQuery.locations = query.locations;
    publicQuery.page = query.page;
    publicQuery.limit = query.limit;

    return this.eventsService.findPublicEvents(publicQuery);
  }
}
