import { Event } from '../events/entities/event.entity';

export interface INotificationService {
  notifyEventCreated(event: Event): Promise<void>;
  notifyEventPublished(event: Event): Promise<void>;
  notifyEventCancelled(event: Event): Promise<void>;
}
