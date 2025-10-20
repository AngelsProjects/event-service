import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { EventsService } from '../events/events.service';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../common/types/event-status.enum';

describe('SummaryService', () => {
  let service: SummaryService;
  let eventsService: jest.Mocked<EventsService>;

  const createMockEvent = (overrides?: Partial<Event>): Event => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    return new Event({
      id: 'test-event-id',
      title: 'Test Event',
      startAt: tomorrow,
      endAt: dayAfter,
      location: 'Test Location',
      status: EventStatus.PUBLISHED,
      ...overrides,
    });
  };

  beforeEach(async () => {
    const mockEventsService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);
    eventsService = module.get(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCacheStatus', () => {
    it('should return cache MISS for new event', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      const result = service.getCacheStatus('test-event-id');

      expect(result.cacheHit).toBe(false);
      expect(eventsService.findById).toHaveBeenCalledWith('test-event-id');
    });

    it('should return cache HIT for cached event', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      // First call to cache it
      service.getSummary('test-event-id');

      // Second call to check cache
      const result = service.getCacheStatus('test-event-id');

      expect(result.cacheHit).toBe(true);
    });

    it('should throw NotFoundException for non-existent event', () => {
      eventsService.findById.mockReturnValue(null);

      expect(() => service.getCacheStatus('non-existent-id')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSummary', () => {
    it('should generate summary for new event', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      const result = service.getSummary('test-event-id');

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
    });

    it('should return cached summary on second call', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      const first = service.getSummary('test-event-id');
      const second = service.getSummary('test-event-id');

      expect(first.summary).toBe(second.summary);
      expect(first.cacheHit).toBe(false);
      expect(second.cacheHit).toBe(true);
    });

    it('should invalidate cache when event changes', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      const first = service.getSummary('test-event-id');

      // Change event
      const updatedEvent = createMockEvent({ title: 'Updated Title' });
      eventsService.findById.mockReturnValue(updatedEvent);

      const second = service.getSummary('test-event-id');

      expect(second.cacheHit).toBe(false);
      expect(first.summary).not.toBe(second.summary);
    });

    it('should throw NotFoundException for non-existent event', () => {
      eventsService.findById.mockReturnValue(null);

      expect(() => service.getSummary('non-existent-id')).toThrow(
        NotFoundException,
      );
    });

    it('should generate deterministic summaries', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      service.invalidateCache('test-event-id');
      const first = service.getSummary('test-event-id');

      service.invalidateCache('test-event-id');
      const second = service.getSummary('test-event-id');

      expect(first.summary).toBe(second.summary);
    });
  });

  describe('streamSummary', () => {
    it('should stream summary in chunks', async () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      const chunks: string[] = [];
      let doneCount = 0;

      for await (const { chunk, done } of service.streamSummary(
        'test-event-id',
      )) {
        chunks.push(chunk);
        if (done) doneCount++;
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(doneCount).toBe(1);
      expect(chunks.join('')).toBeDefined();
    });

    it('should stream complete summary', async () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      const { summary } = service.getSummary('test-event-id');
      const chunks: string[] = [];

      for await (const { chunk } of service.streamSummary('test-event-id')) {
        chunks.push(chunk);
      }

      const streamedSummary = chunks.join('');
      expect(streamedSummary).toBe(summary);
    });

    it('should mark last chunk as done', async () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      let lastDone = false;

      for await (const { done } of service.streamSummary('test-event-id')) {
        lastDone = done;
      }

      expect(lastDone).toBe(true);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cached summary', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      service.getSummary('test-event-id');
      service.invalidateCache('test-event-id');

      const result = service.getCacheStatus('test-event-id');
      expect(result.cacheHit).toBe(false);
    });

    it('should not throw for non-existent cache entry', () => {
      expect(() => service.invalidateCache('non-existent-id')).not.toThrow();
    });
  });

  describe('cache hash generation', () => {
    it('should generate different hashes for different events', () => {
      const event1 = createMockEvent({ id: 'event-1', title: 'Event 1' });
      const event2 = createMockEvent({ id: 'event-2', title: 'Event 2' });

      eventsService.findById.mockReturnValueOnce(event1);
      const result1 = service.getSummary('event-1');

      eventsService.findById.mockReturnValueOnce(event2);
      const result2 = service.getSummary('event-2');

      expect(result1.summary).not.toBe(result2.summary);
    });

    it('should generate same hash for identical event data', () => {
      const event = createMockEvent();
      eventsService.findById.mockReturnValue(event);

      service.getSummary('test-event-id');
      const firstCacheStatus = service.getCacheStatus('test-event-id');

      const secondCacheStatus = service.getCacheStatus('test-event-id');

      expect(firstCacheStatus.cacheHit).toBe(secondCacheStatus.cacheHit);
    });
  });
});
