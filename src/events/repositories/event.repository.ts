import { Injectable } from '@nestjs/common';
import { Event } from '../entities/event.entity';
import { EventStatus } from '../../common/types/event-status.enum';
import { QueryEventsDto } from '../dto/query-events.dto';

@Injectable()
export class EventRepository {
  private events: Map<string, Event> = new Map();

  create(event: Event): Event {
    this.events.set(event.id, event);
    return event;
  }

  findById(id: string): Event | null {
    return this.events.get(id) || null;
  }

  update(id: string, event: Event): Event {
    this.events.set(id, event);
    return event;
  }

  findAll(
    query: QueryEventsDto,
    includeAllStatuses = true,
  ): {
    events: Event[];
    total: number;
  } {
    let filtered = Array.from(this.events.values());

    // Filter by status
    if (!includeAllStatuses) {
      filtered = filtered.filter((event) =>
        [EventStatus.PUBLISHED, EventStatus.CANCELLED].includes(event.status),
      );
    } else if (query.status) {
      const statusArray = query.getStatusArray();
      filtered = filtered.filter((event) => statusArray.includes(event.status));
    }

    // Filter by date range
    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      dateFrom.setHours(0, 0, 0, 0);
      filtered = filtered.filter((event) => event.startAt >= dateFrom);
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter((event) => event.startAt <= dateTo);
    }

    // Filter by locations
    if (query.locations) {
      const locationsArray = query.getLocationsArray();
      filtered = filtered.filter((event) =>
        locationsArray.some((loc) =>
          event.location.toLowerCase().includes(loc),
        ),
      );
    }

    const total = filtered.length;

    // Sort by startAt
    filtered.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    // Paginate
    const start = (query.page - 1) * query.limit;
    const end = start + query.limit;
    const events = filtered.slice(start, end);

    return { events, total };
  }

  clear(): void {
    this.events.clear();
  }

  count(): number {
    return this.events.size;
  }
}
