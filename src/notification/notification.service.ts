import { Injectable, Logger } from '@nestjs/common';
import { Event } from '../events/entities/event.entity';
import { INotificationService } from './notification.interface';

@Injectable()
export class NotificationService implements INotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async notifyEventCreated(event: Event): Promise<void> {
    // Mock async notification - could be replaced with AWS SES/SNS
    await this.simulateAsyncOperation();

    this.logger.log({
      message: `New event created: ${event.title}`,
      eventId: event.id,
      title: event.title,
      location: event.location,
      startAt: event.startAt.toISOString(),
    });
  }

  async notifyEventPublished(event: Event): Promise<void> {
    await this.simulateAsyncOperation();

    this.logger.log({
      message: `Event published: ${event.title}`,
      eventId: event.id,
      title: event.title,
    });
  }

  async notifyEventCancelled(event: Event): Promise<void> {
    await this.simulateAsyncOperation();

    this.logger.log({
      message: `Event cancelled: ${event.title}`,
      eventId: event.id,
      title: event.title,
    });
  }

  private async simulateAsyncOperation(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 10));
  }
}
