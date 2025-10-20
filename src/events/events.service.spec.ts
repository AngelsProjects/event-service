/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { EventRepository } from './repositories/event.repository';
import { NotificationService } from '../notification/notification.service';
import { EventStatus } from '../common/types/event-status.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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

  describe('create', () => {
    it('should create an event successfully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const dto = {
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
        status: EventStatus.DRAFT,
      };

      const event = await service.create(dto);

      expect(event).toBeDefined();
      expect(event.title).toBe(dto.title);
      expect(event.location).toBe(dto.location);
      expect(event.status).toBe(EventStatus.DRAFT);
      expect(notificationService.notifyEventCreated).toHaveBeenCalledTimes(1);
    });

    it('should reject event starting in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dto = {
        title: 'Past Event',
        startAt: yesterday,
        endAt: tomorrow,
        location: 'Test Location',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject event with startAt >= endAt', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dto = {
        title: 'Invalid Event',
        startAt: tomorrow,
        endAt: tomorrow,
        location: 'Test Location',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update event status', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const event = await service.create({
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
        status: EventStatus.DRAFT,
      });

      const updated = await service.update(event.id, {
        status: EventStatus.PUBLISHED,
      });

      expect(updated.status).toBe(EventStatus.PUBLISHED);
      expect(updated.id).toBe(event.id);
      expect(notificationService.notifyEventPublished).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid status transition', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const event = await service.create({
        title: 'Test Event',
        startAt: tomorrow,
        endAt: dayAfter,
        location: 'Test Location',
        status: EventStatus.PUBLISHED,
      });

      await expect(
        service.update(event.id, { status: EventStatus.DRAFT }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent event', async () => {
      await expect(
        service.update('non-existent-id', { status: EventStatus.PUBLISHED }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
