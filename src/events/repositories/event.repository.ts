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
    includeAll: boolean = false,
  ): { events: Event[]; total: number } {
    let filtered = Array.from(this.events.values());

    // Filter by status - only show PUBLISHED and CANCELLED in public view
    if (!includeAll) {
      filtered = filtered.filter(
        (event) =>
          event.status === EventStatus.PUBLISHED ||
          event.status === EventStatus.CANCELLED,
      );
    }

    // Filter by status if provided
    if (query.status && query.status.length > 0) {
      filtered = filtered.filter((event) =>
        query.status.includes(event.status),
      );
    }

    // Filter by location (case-insensitive partial match)
    if (query.locations && query.locations.length > 0) {
      filtered = filtered.filter((event) =>
        query.locations.some((loc) =>
          event.location?.toLowerCase().includes(loc.toLowerCase()),
        ),
      );
    }

    // Filter by date range
    if (query.dateFrom) {
      const fromDate = new Date(query.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((event) => event.startAt >= fromDate);
    }

    if (query.dateTo) {
      const toDate = new Date(query.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((event) => event.startAt <= toDate);
    }

    const total = filtered.length;

    // Sort by startAt
    filtered.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    // Pagination
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
