import { EventStatus } from '../../common/types/event-status.enum';

export class Event {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location: string;
  status: EventStatus;
  internalNotes?: string;
  createdBy?: string;
  updatedAt: Date;
  createdAt: Date;

  constructor(partial: Partial<Event>) {
    this.id = partial.id!;
    this.title = partial.title!;
    this.startAt = partial.startAt!;
    this.endAt = partial.endAt!;
    this.location = partial.location!;
    this.status = partial.status || EventStatus.DRAFT;
    this.internalNotes = partial.internalNotes;
    this.createdBy = partial.createdBy;
    this.updatedAt = partial.updatedAt || new Date();
    this.createdAt = partial.createdAt || new Date();
  }

  get isUpcoming(): boolean {
    return this.startAt > new Date();
  }

  toPublicResponse() {
    return {
      id: this.id,
      title: this.title,
      startAt: this.startAt.toISOString(),
      endAt: this.endAt.toISOString(),
      location: this.location,
      status: this.status,
      isUpcoming: this.isUpcoming,
    };
  }

  toAdminResponse() {
    return {
      id: this.id,
      title: this.title,
      startAt: this.startAt.toISOString(),
      endAt: this.endAt.toISOString(),
      location: this.location,
      status: this.status,
      internalNotes: this.internalNotes,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
    };
  }

  canTransitionTo(newStatus: EventStatus): boolean {
    const transitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
      [EventStatus.PUBLISHED]: [EventStatus.CANCELLED],
      [EventStatus.CANCELLED]: [],
    };

    return transitions[this.status].includes(newStatus);
  }
}
