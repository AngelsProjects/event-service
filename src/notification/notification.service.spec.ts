import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../common/types/event-status.enum';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

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
      status: EventStatus.DRAFT,
      ...overrides,
    });
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyEventCreated', () => {
    it('should log event creation notification', async () => {
      const event = createMockEvent();
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.notifyEventCreated(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `New event created: ${event.title}`,
          eventId: event.id,
          title: event.title,
          location: event.location,
          startAt: event.startAt.toISOString(),
        }),
      );
    });

    it('should complete async operation', async () => {
      const event = createMockEvent();

      await expect(service.notifyEventCreated(event)).resolves.toBeUndefined();
    });
  });

  describe('notifyEventPublished', () => {
    it('should log event published notification', async () => {
      const event = createMockEvent({ status: EventStatus.PUBLISHED });
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.notifyEventPublished(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Event published: ${event.title}`,
          eventId: event.id,
          title: event.title,
        }),
      );
    });

    it('should complete async operation', async () => {
      const event = createMockEvent();

      await expect(
        service.notifyEventPublished(event),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyEventCancelled', () => {
    it('should log event cancelled notification', async () => {
      const event = createMockEvent({ status: EventStatus.CANCELLED });
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.notifyEventCancelled(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Event cancelled: ${event.title}`,
          eventId: event.id,
          title: event.title,
        }),
      );
    });

    it('should complete async operation', async () => {
      const event = createMockEvent();

      await expect(
        service.notifyEventCancelled(event),
      ).resolves.toBeUndefined();
    });
  });

  describe('async operations', () => {
    it('should handle multiple concurrent notifications', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({ id: `event-${i}` }),
      );

      const notifications = events.map((event) =>
        service.notifyEventCreated(event),
      );

      await expect(Promise.all(notifications)).resolves.toHaveLength(5);
    });
  });
});
