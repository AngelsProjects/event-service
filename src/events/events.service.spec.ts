/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { EventRepository } from './repositories/event.repository';
import { NotificationService } from '../notification/notification.service';
import { EventStatus } from '../common/types/event-status.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { plainToInstance } from 'class-transformer';

describe('EventsService', () => {
  let service: EventsService;
  let repository: EventRepository;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const mockNotificationService = {
      notifyEventCreated: jest.fn().mockResolvedValue(undefined),
      notifyEventPublished: jest.fn().mockResolvedValue(undefined),
      notifyEventCancelled: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        EventRepository,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    repository = module.get<EventRepository>(EventRepository);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    repository.clear();
    jest.clearAllMocks();
  });

  // Helper function to create a valid DTO
  const createValidDto = (
    overrides: Partial<CreateEventDto> = {},
  ): CreateEventDto => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setHours(12, 0, 0, 0);

    const dto = plainToInstance(CreateEventDto, {
      title: 'Test Event',
      startAt: tomorrow.toISOString(),
      endAt: dayAfter.toISOString(),
      location: 'Test Location',
      status: EventStatus.DRAFT,
      ...overrides,
    });

    return dto;
  };

  describe('create', () => {
    it('should create an event successfully', async () => {
      const dto = createValidDto();

      const event = await service.create(dto);

      expect(event).toBeDefined();
      expect(event.title).toBe(dto.title);
      expect(event.location).toBe(dto.location);
      expect(event.status).toBe(EventStatus.DRAFT);
      expect(event.id).toBeDefined();
      expect(notificationService.notifyEventCreated).toHaveBeenCalledTimes(1);
      expect(notificationService.notifyEventCreated).toHaveBeenCalledWith(
        event,
      );
    });

    it('should create event with PUBLISHED status', async () => {
      const dto = createValidDto({ status: EventStatus.PUBLISHED });

      const event = await service.create(dto);

      expect(event.status).toBe(EventStatus.PUBLISHED);
      expect(notificationService.notifyEventCreated).toHaveBeenCalledTimes(1);
    });

    it('should create event with optional fields', async () => {
      const dto = createValidDto({
        internalNotes: 'Test notes',
        createdBy: 'test@example.com',
      });

      const event = await service.create(dto);

      expect(event.internalNotes).toBe('Test notes');
      expect(event.createdBy).toBe('test@example.com');
    });

    it('should reject event starting in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dto = plainToInstance(CreateEventDto, {
        title: 'Past Event',
        startAt: yesterday.toISOString(),
        endAt: tomorrow.toISOString(),
        location: 'Test Location',
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);

      try {
        await service.create(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          error: { details: [{ message: string }] };
        };
        expect(response.error.details).toBeDefined();
        expect(response.error.details[0].message).toContain(
          'Must be in the future',
        );
      }
    });

    it('should reject event with startAt >= endAt', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dto = plainToInstance(CreateEventDto, {
        title: 'Invalid Event',
        startAt: tomorrow.toISOString(),
        endAt: tomorrow.toISOString(),
        location: 'Test Location',
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);

      try {
        await service.create(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          error: { details: [{ message: string }] };
        };
        expect(response.error.details).toBeDefined();
        expect(response.error.details[0].message).toContain(
          'startAt must be before endAt',
        );
      }
    });

    it('should reject event with endAt before startAt', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const today = new Date();

      const dto = plainToInstance(CreateEventDto, {
        title: 'Invalid Event',
        startAt: tomorrow.toISOString(),
        endAt: today.toISOString(),
        location: 'Test Location',
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should handle events starting exactly 1 millisecond in the future', async () => {
      const futureDate = new Date(Date.now() + 1);
      const laterDate = new Date(futureDate.getTime() + 3600000); // 1 hour later

      const dto = plainToInstance(CreateEventDto, {
        title: 'Near Future Event',
        startAt: futureDate.toISOString(),
        endAt: laterDate.toISOString(),
        location: 'Test Location',
      });

      const event = await service.create(dto);
      expect(event).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update event status', async () => {
      const dto = createValidDto({ status: EventStatus.DRAFT });
      const event = await service.create(dto);

      const updated = await service.update(event.id, {
        status: EventStatus.PUBLISHED,
      });

      expect(updated.status).toBe(EventStatus.PUBLISHED);
      expect(updated.id).toBe(event.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        event.updatedAt.getTime(),
      );
      expect(notificationService.notifyEventPublished).toHaveBeenCalledTimes(1);
    });

    it('should update internal notes without changing status', async () => {
      const dto = createValidDto({ status: EventStatus.DRAFT });
      const event = await service.create(dto);

      const updated = await service.update(event.id, {
        internalNotes: 'Updated notes',
      });

      expect(updated.internalNotes).toBe('Updated notes');
      expect(updated.status).toBe(EventStatus.DRAFT);
      expect(notificationService.notifyEventPublished).not.toHaveBeenCalled();
    });

    it('should update both status and notes', async () => {
      const dto = createValidDto({ status: EventStatus.DRAFT });
      const event = await service.create(dto);

      const updated = await service.update(event.id, {
        status: EventStatus.PUBLISHED,
        internalNotes: 'Ready to publish',
      });

      expect(updated.status).toBe(EventStatus.PUBLISHED);
      expect(updated.internalNotes).toBe('Ready to publish');
    });

    it('should allow transition from DRAFT to CANCELLED', async () => {
      const dto = createValidDto({ status: EventStatus.DRAFT });
      const event = await service.create(dto);

      const updated = await service.update(event.id, {
        status: EventStatus.CANCELLED,
      });

      expect(updated.status).toBe(EventStatus.CANCELLED);
      expect(notificationService.notifyEventCancelled).toHaveBeenCalledTimes(1);
    });

    it('should allow transition from PUBLISHED to CANCELLED', async () => {
      const dto = createValidDto({ status: EventStatus.PUBLISHED });
      const event = await service.create(dto);

      const updated = await service.update(event.id, {
        status: EventStatus.CANCELLED,
      });

      expect(updated.status).toBe(EventStatus.CANCELLED);
      expect(notificationService.notifyEventCancelled).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid status transition from PUBLISHED to DRAFT', async () => {
      const dto = createValidDto({ status: EventStatus.PUBLISHED });
      const event = await service.create(dto);

      await expect(
        service.update(event.id, { status: EventStatus.DRAFT }),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.update(event.id, { status: EventStatus.DRAFT });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          error: { details: [{ message: string }] };
        };
        expect(response.error.details).toBeDefined();
        expect(response.error.details[0].message).toContain(
          'Cannot transition from PUBLISHED to DRAFT',
        );
      }
    });

    it('should reject any transition from CANCELLED status', async () => {
      const dto = createValidDto({ status: EventStatus.DRAFT });
      const event = await service.create(dto);

      await service.update(event.id, { status: EventStatus.CANCELLED });

      await expect(
        service.update(event.id, { status: EventStatus.DRAFT }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.update(event.id, { status: EventStatus.PUBLISHED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent event', async () => {
      await expect(
        service.update('non-existent-id', { status: EventStatus.PUBLISHED }),
      ).rejects.toThrow(NotFoundException);

      try {
        await service.update('non-existent-id', {
          status: EventStatus.PUBLISHED,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        const response = (error as NotFoundException).getResponse() as {
          error: { message: string };
        };
        expect(response.error.message).toContain(
          'Event with id non-existent-id not found',
        );
      }
    });

    it('should not trigger notification when updating to same status', async () => {
      const dto = createValidDto({ status: EventStatus.DRAFT });
      const event = await service.create(dto);

      jest.clearAllMocks(); // Clear the create notification

      await service.update(event.id, {
        status: EventStatus.DRAFT,
        internalNotes: 'Same status',
      });

      expect(notificationService.notifyEventPublished).not.toHaveBeenCalled();
      expect(notificationService.notifyEventCancelled).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test events
      await service.create(
        createValidDto({
          title: 'Event 1',
          status: EventStatus.DRAFT,
          location: 'New York',
        }),
      );

      await service.create(
        createValidDto({
          title: 'Event 2',
          status: EventStatus.PUBLISHED,
          location: 'Los Angeles',
        }),
      );

      await service.create(
        createValidDto({
          title: 'Event 3',
          status: EventStatus.CANCELLED,
          location: 'New York',
        }),
      );
    });

    it('should return all events for admin', () => {
      const result = service.findAll({
        page: 1,
        limit: 10,
        getLocationsArray: () => [],
        getStatusArray: () => [],
      } as any);

      expect(result.events).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });

    it('should filter by status', () => {
      const result = service.findAll({
        status: EventStatus.PUBLISHED,
        page: 1,
        limit: 10,
        getLocationsArray: () => [],
        getStatusArray: () => [EventStatus.PUBLISHED],
      } as any);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe(EventStatus.PUBLISHED);
    });

    it('should filter by location', () => {
      const result = service.findAll({
        locations: ['New York'],
        page: 1,
        limit: 10,
        getLocationsArray: () => ['new york'],
        getStatusArray: () => [],
      } as any);

      expect(result.events).toHaveLength(2);
    });

    it('should paginate results', () => {
      const result = service.findAll({
        page: 1,
        limit: 2,
        getLocationsArray: () => [],
        getStatusArray: () => [],
      } as any);

      expect(result.events).toHaveLength(2);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter by multiple statuses', () => {
      const result = service.findAll({
        status: 'PUBLISHED,CANCELLED',
        page: 1,
        limit: 10,
        getLocationsArray: () => [],
        getStatusArray: () => [EventStatus.PUBLISHED, EventStatus.CANCELLED],
      } as any);

      expect(result.events).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return event by id', async () => {
      const dto = createValidDto();
      const created = await service.create(dto);

      const found = service.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe(created.title);
    });

    it('should throw NotFoundException for non-existent event', () => {
      expect(() => service.findById('non-existent-id')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPublicEvents', () => {
    beforeEach(async () => {
      await service.create(
        createValidDto({
          title: 'Draft Event',
          status: EventStatus.DRAFT,
        }),
      );

      await service.create(
        createValidDto({
          title: 'Published Event',
          status: EventStatus.PUBLISHED,
        }),
      );

      await service.create(
        createValidDto({
          title: 'Cancelled Event',
          status: EventStatus.CANCELLED,
        }),
      );
    });

    it('should only return PUBLISHED and CANCELLED events', () => {
      const result = service.findPublicEvents({
        page: 1,
        limit: 10,
        getLocationsArray: () => [],
        getStatusArray: () => [],
      } as any);

      expect(result.events).toHaveLength(2);
      expect(
        result.events.every(
          (e) =>
            e.status === EventStatus.PUBLISHED ||
            e.status === EventStatus.CANCELLED,
        ),
      ).toBe(true);
    });

    it('should not expose private fields', () => {
      const result = service.findPublicEvents({
        page: 1,
        limit: 10,
        getLocationsArray: () => [],
        getStatusArray: () => [],
      } as any);

      result.events.forEach((event) => {
        expect(event).not.toHaveProperty('internalNotes');
        expect(event).not.toHaveProperty('createdBy');
        expect(event).toHaveProperty('isUpcoming');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle event with very long title', async () => {
      const longTitle = 'A'.repeat(200);
      const dto = createValidDto({ title: longTitle });

      const event = await service.create(dto);
      expect(event.title).toBe(longTitle);
    });

    it('should handle event with special characters in location', async () => {
      const location = 'São Paulo, Brazil (Main Hall #1)';
      const dto = createValidDto({ location });

      const event = await service.create(dto);
      expect(event.location).toBe(location);
    });

    it('should handle concurrent event creation', async () => {
      const dtos = Array.from({ length: 5 }, () => createValidDto());

      const events = await Promise.all(dtos.map((dto) => service.create(dto)));

      expect(events).toHaveLength(5);
      const uniqueIds = new Set(events.map((e) => e.id));
      expect(uniqueIds.size).toBe(5);
    });

    it('should handle event spanning multiple days', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 7); // 7 days later

      const dto = plainToInstance(CreateEventDto, {
        title: 'Week-long Conference',
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        location: 'Convention Center',
      });

      const event = await service.create(dto);
      expect(event).toBeDefined();
      expect(event.endAt.getTime() - event.startAt.getTime()).toBeGreaterThan(
        6 * 24 * 60 * 60 * 1000,
      );
    });

    it('should handle clearing internalNotes', async () => {
      const dto = createValidDto({ internalNotes: 'Initial notes' });
      const event = await service.create(dto);

      const updated = await service.update(event.id, {
        internalNotes: '',
      });

      expect(updated.internalNotes).toBe('');
    });

    it('should preserve unchanged fields during update', async () => {
      const dto = createValidDto({
        title: 'Original Title',
        location: 'Original Location',
        internalNotes: 'Original Notes',
      });
      const event = await service.create(dto);

      const updated = await service.update(event.id, {
        status: EventStatus.PUBLISHED,
      });

      expect(updated.title).toBe('Original Title');
      expect(updated.location).toBe('Original Location');
      expect(updated.internalNotes).toBe('Original Notes');
    });
  });
});
