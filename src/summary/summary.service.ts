import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Event } from '../events/entities/event.entity';
import { createHash } from 'crypto';
import { EventsService } from '../events/events.service';

interface CachedSummary {
  summary: string;
  hash: string;
  cachedAt: Date;
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private cache: Map<string, CachedSummary> = new Map();

  constructor(private readonly eventsService: EventsService) {}

  getCacheStatus(eventId: string): { cacheHit: boolean } {
    const event = this.eventsService.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    const hash = this.generateHash(event);
    const cached = this.cache.get(eventId);

    return { cacheHit: Boolean(cached && cached.hash === hash) };
  }

  getSummary(eventId: string): { summary: string; cacheHit: boolean } {
    const event = this.eventsService.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    const hash = this.generateHash(event);
    const cached = this.cache.get(eventId);

    if (cached && cached.hash === hash) {
      this.logger.debug(`Cache HIT for event ${eventId}`);
      return { summary: cached.summary, cacheHit: true };
    }

    this.logger.debug(`Cache MISS for event ${eventId}`);
    const summary = this.generateSummary(event);

    this.cache.set(eventId, {
      summary,
      hash,
      cachedAt: new Date(),
    });

    return { summary, cacheHit: false };
  }

  async *streamSummary(
    eventId: string,
  ): AsyncGenerator<{ chunk: string; done: boolean }> {
    const { summary } = this.getSummary(eventId);

    // Stream in chunks of 2-5 tokens
    const words = summary.split(' ');
    let i = 0;

    while (i < words.length) {
      const chunkSize = Math.floor(Math.random() * 4) + 2; // 2-5 words
      const chunk = words.slice(i, i + chunkSize).join(' ');

      yield {
        chunk: i + chunkSize < words.length ? chunk + ' ' : chunk,
        done: i + chunkSize >= words.length,
      };

      i += chunkSize;

      // Simulate streaming delay
      if (i < words.length) {
        await this.delay(50 + Math.random() * 50);
      }
    }
  }

  invalidateCache(eventId: string): void {
    this.cache.delete(eventId);
    this.logger.debug(`Cache invalidated for event ${eventId}`);
  }

  private generateHash(event: Event): string {
    const data = `${event.title}|${event.location || ''}|${event.startAt.toISOString()}|${event.endAt.toISOString()}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private generateSummary(event: Event): string {
    // Deterministic mock summary generation
    const date = event.startAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const time = event.startAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const duration = Math.ceil(
      (event.endAt.getTime() - event.startAt.getTime()) / (1000 * 60 * 60),
    );

    const location = event.location || 'our venue';

    const summaries = [
      `Join us for "${event.title}" happening on ${date} at ${time} in ${location}. ` +
        `This exciting ${duration}-hour event promises an unforgettable experience. ` +
        `Don't miss out on this incredible opportunity to be part of something special. ` +
        `Reserve your spot today and be part of the action!`,

      `Experience "${event.title}" - an extraordinary event taking place on ${date} at ${location}. ` +
        `Starting at ${time}, this ${duration}-hour gathering will bring together amazing people and experiences. ` +
        `Mark your calendar and join us for what promises to be an outstanding occasion. ` +
        `Limited availability - secure your place now!`,

      `Discover "${event.title}" on ${date} at ${time}. Located at ${location}, ` +
        `this ${duration}-hour event offers a unique opportunity to engage and connect. ` +
        `Whether you're a first-timer or a regular attendee, there's something special waiting for you. ` +
        `Don't wait - get your tickets before they're gone!`,
    ];

    // Deterministic selection based on event title hash
    const titleHash = createHash('md5').update(event.title).digest('hex');
    const index = parseInt(titleHash.slice(0, 8), 16) % summaries.length;
    return summaries[index];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
