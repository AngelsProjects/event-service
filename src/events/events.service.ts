import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventRepository } from './repositories/event.repository';
import { NotificationService } from '../notification/notification.service';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { EventStatus } from '../common/types/event-status.enum';
import { ErrorCode } from '../common/types/error-codes.enum';
import { PaginatedResponse } from '../common/types/pagination.interface';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    this.validateEventDates(
      createEventDto.getStartAtDate(),
      createEventDto.getEndAtDate(),
    );
    this.validateStartDateInFuture(createEventDto.getStartAtDate());
    const { v4: uuidv4 } = await import('uuid');
    const eventId = uuidv4();

    const event = new Event({
      id: eventId,
      ...createEventDto,
      startAt: createEventDto.getStartAtDate(),
      endAt: createEventDto.getEndAtDate(),
    });
    const savedEvent = this.eventRepository.create(event);

    // Trigger async notification
    await this.notificationService.notifyEventCreated(savedEvent);

    this.logger.log(`Event created: ${savedEvent.id} - ${savedEvent.title}`);

    return savedEvent;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = this.eventRepository.findById(id);
    console.log('event:', event);

    if (!event) {
      throw new NotFoundException({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Event with id ${id} not found`,
        },
      });
    }

    // Validate status transition
    if (updateEventDto.status && updateEventDto.status !== event.status) {
      this.validateStatusTransition(event, updateEventDto.status);
    }

    const previousStatus = event.status;

    // Update event
    if (updateEventDto.status) {
      event.status = updateEventDto.status;
    }
    if (updateEventDto.internalNotes !== undefined) {
      event.internalNotes = updateEventDto.internalNotes;
    }
    event.updatedAt = new Date();

    const updatedEvent = this.eventRepository.update(id, event);

    // Handle status change notifications
    if (updateEventDto.status && updateEventDto.status !== previousStatus) {
      await this.handleStatusChange(updatedEvent, previousStatus);
    }

    return updatedEvent;
  }

  findAll(
    query: QueryEventsDto,
  ): PaginatedResponse<ReturnType<Event['toAdminResponse']>> {
    const { events, total } = this.eventRepository.findAll(query, true);

    return {
      events: events.map((event) => event.toAdminResponse()),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  findById(id: string): Event {
    const event = this.eventRepository.findById(id);

    if (!event) {
      throw new NotFoundException({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Event with id ${id} not found`,
        },
      });
    }

    return event;
  }

  findPublicEvents(
    query: QueryEventsDto,
  ): PaginatedResponse<ReturnType<Event['toPublicResponse']>> {
    const { events, total } = this.eventRepository.findAll(query, false);

    return {
      events: events.map((event) => event.toPublicResponse()),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private validateEventDates(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new BadRequestException({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: [
            {
              field: 'startAt',
              message: 'startAt must be before endAt',
            },
          ],
        },
      });
    }
  }

  private validateStartDateInFuture(startAt: Date): void {
    if (startAt <= new Date()) {
      throw new BadRequestException({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: [
            {
              field: 'startAt',
              message: 'Must be in the future',
            },
          ],
        },
      });
    }
  }

  private validateStatusTransition(event: Event, newStatus: EventStatus): void {
    if (!event.canTransitionTo(newStatus)) {
      throw new BadRequestException({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: [
            {
              field: 'status',
              message: `Cannot transition from ${event.status} to ${newStatus}`,
            },
          ],
        },
      });
    }
  }

  private async handleStatusChange(
    event: Event,
    previousStatus: EventStatus,
  ): Promise<void> {
    if (
      previousStatus === EventStatus.DRAFT &&
      event.status === EventStatus.PUBLISHED
    ) {
      this.logger.log(`Event published: ${event.title}`);
      await this.notificationService.notifyEventPublished(event);
    } else if (event.status === EventStatus.CANCELLED) {
      this.logger.log(`Event cancelled: ${event.title}`);
      await this.notificationService.notifyEventCancelled(event);
    }
  }
}
