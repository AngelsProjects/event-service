import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { SummaryService } from './summary.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Summary')
@Controller('public/events')
@Public()
export class SummaryController {
  private readonly logger = new Logger(SummaryController.name);

  constructor(private readonly summaryService: SummaryService) {}

  @Get(':id/summary')
  @ApiOperation({ summary: 'Stream event summary using Server-Sent Events' })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    type: 'string',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description: 'Summary stream started',
    headers: {
      'X-Summary-Cache': {
        description: 'Cache status (HIT or MISS)',
        schema: { type: 'string', enum: ['HIT', 'MISS'] },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async streamSummary(@Param('id') id: string, @Res() res: Response) {
    try {
      // First, check if the event exists and get cache status
      const { cacheHit } = this.summaryService.getCacheStatus(id);

      // Set all headers before starting to stream
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Summary-Cache', cacheHit ? 'HIT' : 'MISS');
      res.flushHeaders();

      // Now start streaming
      for await (const { chunk, done } of this.summaryService.streamSummary(
        id,
      )) {
        res.write(`data: ${JSON.stringify({ text: chunk, done })}\n\n`);

        if (done) {
          this.logger.log({
            message: 'Summary streamed',
            eventId: id,
            cacheStatus: cacheHit ? 'HIT' : 'MISS',
          });
          res.end();
          return;
        }
      }
    } catch (error) {
      this.logger.error(`Error streaming summary for event ${id}`, error);

      // If headers haven't been sent yet, we can still set error status
      if (!res.headersSent) {
        res.status((error as { status: number }).status || 500);
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders();
      }

      res.write(
        `data: ${JSON.stringify({ error: 'Failed to generate summary' })}\n\n`,
      );
      res.end();
    }
  }
}
